import { and, asc, desc, eq, ilike, or } from "drizzle-orm"
import { db } from "../db/client.js"
import { aiChatMessages, aiChatSessions, medicines, medicineAliases } from "../db/schema.js"

const disclaimer =
  "This assistant provides medication information only and is not a substitute for professional medical advice. Always consult a healthcare professional for diagnosis and treatment."

const welcomeMessage = "Hello. What medication information can I help you with?"

// Common conversational/medical stop words to isolate candidate drug names when no local directory match exists
const STOP_WORDS = new Set([
  "what", "how", "why", "who", "where", "when", "which", "whose", "whom",
  "take", "took", "taken", "taking", "dose", "dosage", "side", "effect", "effects",
  "store", "storage", "keep", "find", "stock", "pharmacy", "pharmacies",
  "medicine", "medicines", "medication", "medications", "drug", "drugs",
  "have", "has", "had", "having", "with", "from", "about", "interact", "interaction",
  "interactions", "pregnan", "pregnancy", "breastfeed", "breastfeeding",
  "urgent", "emergency", "clinical", "medical", "health", "symptom", "symptoms",
  "should", "would", "could", "shall", "will", "does", "done", "doing",
  "please", "tell", "need", "info", "information", "detail", "details",
  "give", "gives", "given", "giving", "show", "shows", "shown", "showing",
  "good", "better", "best", "safe", "safety", "danger", "dangerous", "bad",
  "than", "then", "their", "there", "them", "they", "this", "that", "these", "those"
])

function titleFromContent(content: string) {
  return content.length > 34 ? `${content.slice(0, 31)}...` : content
}

/**
 * Fetch official FDA clinical label details from the U.S. National Library of Medicine public API.
 * Requires no API key and returns structured prescribing guidelines, side effects, and warnings.
 */
async function fetchOpenFDADetails(medName: string): Promise<string> {
  try {
    const url = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(medName)}"+openfda.generic_name:"${encodeURIComponent(medName)}"&limit=1`
    const res = await fetch(url)
    if (!res.ok) return ""
    
    const data = await res.json() as {
      results?: Array<{
        indications_and_usage?: string[];
        adverse_reactions?: string[];
        warnings?: string[];
        precautions?: string[];
        dosage_and_administration?: string[];
      }>;
    }
    
    const result = data.results?.[0]
    if (!result) return ""

    let details = ""
    if (result.indications_and_usage && Array.isArray(result.indications_and_usage)) {
      details += `  - Indications & Usage: ${result.indications_and_usage.join(" ").slice(0, 500)}...\n`
    }
    if (result.adverse_reactions && Array.isArray(result.adverse_reactions)) {
      details += `  - Side Effects (Adverse Reactions): ${result.adverse_reactions.join(" ").slice(0, 500)}...\n`
    }
    
    const warningsList = result.warnings || result.precautions
    if (warningsList && Array.isArray(warningsList)) {
      details += `  - Warnings & Precautions: ${warningsList.join(" ").slice(0, 500)}...\n`
    }
    
    if (result.dosage_and_administration && Array.isArray(result.dosage_and_administration)) {
      details += `  - Dosage & Administration: ${result.dosage_and_administration.join(" ").slice(0, 500)}...\n`
    }
    return details
  } catch (err) {
    console.error(`Error querying OpenFDA for ${medName}:`, err)
    return ""
  }
}

async function getMedicinesContext(question: string): Promise<string> {
  const words = question
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
    .split(/\s+/)
    .filter((w) => w.length >= 3)

  if (words.length === 0) return ""

  // Search public medicines table and medicine_aliases table
  const conditions = words.map((word) => ilike(medicines.name, `%${word}%`))
  const aliasConditions = words.map((word) => ilike(medicineAliases.alias, `%${word}%`))

  try {
    // Search medicines directly
    const matchedMedicines = await db
      .select()
      .from(medicines)
      .where(or(...conditions))
      .limit(5)

    // Search via aliases
    const matchedAliases = await db
      .select({
        id: medicines.id,
        name: medicines.name,
        form: medicines.form,
        strength: medicines.strength,
        category: medicines.category,
        manufacturer: medicines.manufacturer,
      })
      .from(medicineAliases)
      .innerJoin(medicines, eq(medicineAliases.medicineId, medicines.id))
      .where(or(...aliasConditions))
      .limit(5)

    // Merge and deduplicate
    const allMatchesMap = new Map<string, typeof medicines.$inferSelect>()
    for (const med of [...matchedMedicines, ...matchedAliases]) {
      allMatchesMap.set(med.id, med)
    }
    const deduped = Array.from(allMatchesMap.values())

    if (deduped.length === 0) {
      // Hybrid Fallback: If no local medicine matches, check if any typed words look like a candidate drug name
      const candidateMedWords = words.filter((w) => !STOP_WORDS.has(w))
      if (candidateMedWords.length > 0) {
        const candidateWord = candidateMedWords[0]
        const fdaDetails = await fetchOpenFDADetails(candidateWord)
        if (fdaDetails) {
          const capitalizedName = candidateWord.charAt(0).toUpperCase() + candidateWord.slice(1)
          return `Retrieved medicine specifications for "${capitalizedName}" (Note: This medication is NOT currently registered in our local pharmacy stock directory):\n` +
                 `- Name: ${capitalizedName}\n` +
                 `  FDA Reference Details:\n${fdaDetails}`
        }
      }
      return ""
    }

    // Dynamic FDA fetch: retrieve FDA details in parallel for up to the top 2 matched local medicines
    const fdaPromises = deduped.slice(0, 2).map(async (med) => {
      const fdaData = await fetchOpenFDADetails(med.name)
      return { medId: med.id, fdaData }
    })
    const fdaResultsList = await Promise.all(fdaPromises)
    const fdaMap = new Map<string, string>()
    for (const res of fdaResultsList) {
      if (res.fdaData) fdaMap.set(res.medId, res.fdaData)
    }

    // Format a clean text context
    let context = "Retrieved medicine specifications:\n"
    for (const med of deduped) {
      context += `- Name: ${med.name}\n  Category: ${med.category}\n  Form: ${med.form}\n  Strength: ${med.strength || "N/A"}\n  Manufacturer: ${med.manufacturer || "N/A"}\n`
      const fdaDetails = fdaMap.get(med.id)
      if (fdaDetails) {
        context += `  FDA Reference Details:\n${fdaDetails}`
      }
    }
    return context
  } catch (e) {
    console.error("Error retrieving medicine context:", e)
    return ""
  }
}

async function generateLLMResponse(question: string, context: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash"
  const apiUrl = process.env.GEMINI_API_URL || `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const systemInstruction =
    "You are Antigravity, a professional clinical medication guide assistant for the Medicine Access Platform (MAP). " +
    "Your goal is to provide concise, accurate, and professional public information regarding medication uses, " +
    "precautions, storage, and side effects. Always maintain a helpful, clinical, yet accessible tone. " +
    "Be extremely concise and summarize when needed. Do not make up facts. Never provide patient-specific diagnostic advice. " +
    "Always end with a short general disclaimer reminding the user to consult a healthcare professional for medical decisions."

  const prompt = `
System Instruction: ${systemInstruction}

${context ? `Use the following verified public medicine database information for reference:\n${context}` : ""}

User Question: ${question}

Provide a clean and concise response:
`

  try {
    const response = await fetch(
      apiUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error("Gemini API error response:", errText)
      return null
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
          }>;
        };
      }>;
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    return text || null
  } catch (error) {
    console.error("Failed to generate LLM response:", error)
    return null
  }
}

function getAssistantResponse(question: string, medicineContext: string): string {
  const q = question.toLowerCase()

  if (/(diagnos|what do i have|am i sick|should i take|can i stop|emergency|chest pain|can't breathe|suicide)/.test(q)) {
    return `I cannot diagnose symptoms or tell you to start, stop, or change treatment. Please contact a licensed clinician. If this is urgent, seek emergency care now.\n\n${disclaimer}`
  }

  if (medicineContext) {
    return `Here is what I found in our verified medicine catalog matching your query:\n\n${medicineContext}\n` +
           `For details about dosage, storage, safety, or side effects for these medications, consult a pharmacist or clinician. Always follow the guidelines on your prescription labels.\n\n${disclaimer}`
  }

  if (q.includes("side effect") || q.includes("side effects")) {
    return `Common medication side effects can include nausea, dizziness, headache, sleep changes, stomach upset, or rash, depending on the medicine. Serious symptoms such as swelling, breathing trouble, severe rash, fainting, or chest pain need urgent medical attention.\n\n${disclaimer}`
  }

  if (q.includes("interaction") || q.includes("mix") || q.includes("together")) {
    return `Drug interactions depend on the exact medicines, doses, age, pregnancy status, kidney or liver function, and other conditions. Share the full medicine list with a pharmacist or clinician before combining medicines.\n\n${disclaimer}`
  }

  if (q.includes("pregnan") || q.includes("breastfeed")) {
    return `Medicine safety during pregnancy or breastfeeding varies by medicine and trimester. A clinician or pharmacist should check the exact medicine before use.\n\n${disclaimer}`
  }

  if (q.includes("storage") || q.includes("store")) {
    return `Most medicines should be stored in a cool, dry place away from direct sunlight and children. Some medicines need refrigeration or special handling, so always check the label.\n\n${disclaimer}`
  }

  if (q.includes("how to take") || q.includes("dosage") || q.includes("dose")) {
    return `Follow the dose and timing on your prescription label or package instructions. Do not double doses after a missed dose unless a clinician or pharmacist tells you to.\n\n${disclaimer}`
  }

  if (q.includes("find") || q.includes("near") || q.includes("stock") || q.includes("available")) {
    return `Use the Find Medicine page to search verified pharmacy stock, prices, and recent update times. If there is no match, send an availability request so pharmacies can respond.\n\n${disclaimer}`
  }

  return `I can help with general information about medicine uses, side effects, storage, precautions, interactions, and how to search nearby pharmacy stock. For diagnosis, treatment decisions, or urgent symptoms, speak with a healthcare professional.\n\n${disclaimer}`
}

async function formatSession(sessionId: string) {
  const [session] = await db
    .select()
    .from(aiChatSessions)
    .where(eq(aiChatSessions.id, sessionId))
    .limit(1)

  if (!session) return null

  const messages = await db
    .select()
    .from(aiChatMessages)
    .where(eq(aiChatMessages.sessionId, sessionId))
    .orderBy(asc(aiChatMessages.createdAt))

  return {
    id: session.id,
    title: session.title ?? "New conversation",
    createdAt: session.createdAt.toISOString(),
    messages: messages.map((message) => ({
      id: message.id,
      sender: message.senderType === "user" ? "user" : "assistant",
      content: message.content,
      hasDisclaimer: message.hasDisclaimer,
      timestamp: message.createdAt.toISOString(),
    })),
  }
}

export async function createAssistantSession(patientProfileId: string) {
  const [session] = await db
    .insert(aiChatSessions)
    .values({
      patientProfileId,
      title: "New conversation",
    })
    .returning()

  await db.insert(aiChatMessages).values({
    sessionId: session.id,
    senderType: "assistant",
    content: welcomeMessage,
    hasDisclaimer: true,
  })

  return formatSession(session.id)
}

export async function listAssistantSessions(patientProfileId: string) {
  const sessions = await db
    .select()
    .from(aiChatSessions)
    .where(eq(aiChatSessions.patientProfileId, patientProfileId))
    .orderBy(desc(aiChatSessions.createdAt))

  if (!sessions.length) {
    const session = await createAssistantSession(patientProfileId)
    return session ? [session] : []
  }

  const formatted = await Promise.all(sessions.map((session) => formatSession(session.id)))
  return formatted.filter((session) => session !== null)
}

export async function getAssistantSession(patientProfileId: string, sessionId: string) {
  const [session] = await db
    .select()
    .from(aiChatSessions)
    .where(and(eq(aiChatSessions.id, sessionId), eq(aiChatSessions.patientProfileId, patientProfileId)))
    .limit(1)

  if (!session) return null

  return formatSession(session.id)
}

export async function sendAssistantMessage(patientProfileId: string, sessionId: string, content: string) {
  const session = await getAssistantSession(patientProfileId, sessionId)
  if (!session) return null

  await db.insert(aiChatMessages).values({
    sessionId,
    senderType: "user",
    content,
  })

  const hasUserMessage = session.messages.some((message) => message.sender === "user")
  if (!hasUserMessage) {
    await db
      .update(aiChatSessions)
      .set({ title: titleFromContent(content) })
      .where(eq(aiChatSessions.id, sessionId))
  }

  // 1. Fetch public database medicines context
  const medicineContext = await getMedicinesContext(content)

  // 2. Generate response via LLM or local RAG engine fallback
  let reply = await generateLLMResponse(content, medicineContext)
  if (!reply) {
    reply = getAssistantResponse(content, medicineContext)
  }

  await db.insert(aiChatMessages).values({
    sessionId,
    senderType: "assistant",
    content: reply,
    hasDisclaimer: true,
  })

  return getAssistantSession(patientProfileId, sessionId)
}

export async function deleteAssistantSession(patientProfileId: string, sessionId: string) {
  const [session] = await db
    .delete(aiChatSessions)
    .where(and(eq(aiChatSessions.id, sessionId), eq(aiChatSessions.patientProfileId, patientProfileId)))
    .returning()

  return session ?? null
}
