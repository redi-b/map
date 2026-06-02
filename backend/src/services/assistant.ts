import { and, asc, desc, eq, ilike, or } from "drizzle-orm"
import { db } from "../db/client.js"
import { aiChatMessages, aiChatSessions, medicines, medicineAliases } from "../db/schema.js"

const disclaimer =
  "This assistant provides medication information only and is not a substitute for professional medical advice. Always consult a healthcare professional for diagnosis and treatment."

const welcomeMessage = "Hello. Ask about a medicine by name and I will answer only from the MAP catalog and public medicine label sources."

type AssistantIntent = "availability" | "dosage" | "interactions" | "side_effects" | "storage" | "uses" | "warnings" | "general"

type MedicineMatch = {
  id: string | null
  name: string
  form: string | null
  strength: string | null
  category: string | null
  manufacturer: string | null
  sourceNote?: string
}

type SourceSection = {
  label: string
  text: string
}

type MedicineEvidence = {
  medicine: MedicineMatch
  sections: SourceSection[]
  sources: string[]
}

type AssistantEvidence = {
  intent: AssistantIntent
  medicines: MedicineEvidence[]
}

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
  "than", "then", "their", "there", "them", "they", "this", "that", "these", "those",
  "for", "and", "the", "are", "was", "were", "can", "may", "use", "uses", "used",
  "watch", "know", "guide", "guidance", "label", "labels"
])

function titleFromContent(content: string) {
  return content.length > 34 ? `${content.slice(0, 31)}...` : content
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function truncateText(value: string, maxLength = 900) {
  const normalized = normalizeText(value)
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength).trim()}...` : normalized
}

function medicineDisplayName(medicine: Pick<MedicineMatch, "name" | "form" | "strength">) {
  return [medicine.name, medicine.strength, medicine.form ? `(${medicine.form})` : ""].filter(Boolean).join(" ")
}

function extractCandidateTerms(question: string) {
  const cleaned = question
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))

  return Array.from(new Set(cleaned)).slice(0, 6)
}

function inferIntent(question: string): AssistantIntent {
  const q = question.toLowerCase()
  if (/(find|near|stock|available|availability|pharmacy|pharmacies)/.test(q)) return "availability"
  if (/(side effect|side effects|adverse|reaction|reactions)/.test(q)) return "side_effects"
  if (/(interact|interaction|mix|together|combine)/.test(q)) return "interactions"
  if (/(storage|store|keep|temperature|refrigerat)/.test(q)) return "storage"
  if (/(dosage|dose|how to take|take it|administration|missed dose)/.test(q)) return "dosage"
  if (/(warning|precaution|avoid|contraindicat|pregnan|breastfeed|breastfeeding)/.test(q)) return "warnings"
  if (/(used for|indication|indications|treat|treats|use|uses)/.test(q)) return "uses"
  return "general"
}

async function inferIntentWithLLM(question: string): Promise<AssistantIntent | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash"
  const apiUrl = process.env.GEMINI_API_URL || `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text:
                  "Classify the user's medicine question intent. Return only one label from this list: " +
                  "availability, dosage, interactions, side_effects, storage, uses, warnings, general.\n\n" +
                  `Question: ${question}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 10,
        },
      }),
    })

    if (!response.ok) return null
    const data = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    const label = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase()
    const allowed = new Set<AssistantIntent>(["availability", "dosage", "interactions", "side_effects", "storage", "uses", "warnings", "general"])
    return allowed.has(label as AssistantIntent) ? label as AssistantIntent : null
  } catch (error) {
    console.error("Failed to classify assistant intent:", error)
    return null
  }
}

function openFdaSearchUrl(medName: string) {
  const params = new URLSearchParams({
    search: `openfda.generic_name:"${medName}" OR openfda.brand_name:"${medName}"`,
    limit: "1",
  })
  return `https://api.fda.gov/drug/label.json?${params.toString()}`
}

async function fetchOpenFDASections(medName: string): Promise<SourceSection[]> {
  try {
    const url = openFdaSearchUrl(medName)
    const res = await fetch(url)
    if (!res.ok) return []
    
    const data = await res.json() as {
      results?: Array<{
        indications_and_usage?: string[]
        adverse_reactions?: string[]
        warnings?: string[]
        boxed_warning?: string[]
        precautions?: string[]
        contraindications?: string[]
        dosage_and_administration?: string[]
        drug_interactions?: string[]
        storage_and_handling?: string[]
        how_supplied?: string[]
      }>
    }
    
    const result = data.results?.[0]
    if (!result) return []

    const fields: Array<[string, string[] | undefined]> = [
      ["Uses / indications", result.indications_and_usage],
      ["Adverse reactions", result.adverse_reactions],
      ["Warnings", result.warnings],
      ["Boxed warning", result.boxed_warning],
      ["Precautions", result.precautions],
      ["Contraindications", result.contraindications],
      ["Dosage and administration", result.dosage_and_administration],
      ["Drug interactions", result.drug_interactions],
      ["Storage and handling", result.storage_and_handling],
      ["How supplied", result.how_supplied],
    ]

    return fields
      .filter(([, values]) => Array.isArray(values) && values.length > 0)
      .map(([label, values]) => ({ label, text: truncateText(values!.join(" ")) }))
  } catch (err) {
    console.error(`Error querying OpenFDA for ${medName}:`, err)
    return []
  }
}

function selectSectionsForIntent(sections: SourceSection[], intent: AssistantIntent) {
  if (intent === "availability") return []
  if (intent === "general") return sections.slice(0, 5)

  const patterns: Record<Exclude<AssistantIntent, "availability" | "general">, RegExp> = {
    dosage: /dosage|administration|how supplied/,
    interactions: /interaction/,
    side_effects: /adverse|reaction/,
    storage: /storage|handling|supplied/,
    uses: /uses|indication/,
    warnings: /warning|boxed|precaution|contraindication/,
  }

  const selected = sections.filter((section) => patterns[intent].test(section.label.toLowerCase()))
  return selected.length ? selected : sections.slice(0, 4)
}

async function findLocalMedicines(question: string): Promise<MedicineMatch[]> {
  const terms = extractCandidateTerms(question)
  if (terms.length === 0) return []

  const conditions = terms.map((word) => ilike(medicines.name, `%${word}%`))
  const aliasConditions = terms.map((word) => ilike(medicineAliases.alias, `%${word}%`))

  try {
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

    const allMatchesMap = new Map<string, typeof medicines.$inferSelect>()
    for (const med of [...matchedMedicines, ...matchedAliases]) {
      allMatchesMap.set(med.id, med)
    }

    return Array.from(allMatchesMap.values()).map((medicine) => ({
      id: medicine.id,
      name: medicine.name,
      form: medicine.form,
      strength: medicine.strength,
      category: medicine.category,
      manufacturer: medicine.manufacturer,
    }))
  } catch (e) {
    console.error("Error retrieving medicine matches:", e)
    return []
  }
}

async function buildAssistantEvidence(question: string, intent: AssistantIntent): Promise<AssistantEvidence> {
  const localMatches = await findLocalMedicines(question)
  const matches = localMatches.length
    ? localMatches
    : extractCandidateTerms(question).slice(0, 2).map((term) => ({
        id: null,
        name: term.charAt(0).toUpperCase() + term.slice(1),
        form: null,
        strength: null,
        category: null,
        manufacturer: null,
        sourceNote: "Not found in the MAP medicine catalog. Public label lookup was attempted.",
      }))

  const evidence = await Promise.all(matches.slice(0, 4).map(async (medicine): Promise<MedicineEvidence> => {
    const labelSections = await fetchOpenFDASections(medicine.name)
    const sections: SourceSection[] = [
      {
        label: "MAP catalog",
        text: [
          `Name: ${medicine.name}`,
          medicine.category ? `Category: ${medicine.category}` : null,
          medicine.form ? `Form: ${medicine.form}` : null,
          medicine.strength ? `Strength: ${medicine.strength}` : null,
          medicine.manufacturer ? `Catalog source/manufacturer: ${medicine.manufacturer}` : null,
          medicine.sourceNote ?? null,
        ].filter(Boolean).join(". "),
      },
      ...selectSectionsForIntent(labelSections, intent),
    ]

    const sources = ["MAP medicine catalog"]
    if (labelSections.length) sources.push("openFDA drug label API")

    return { medicine, sections, sources }
  }))

  return { intent, medicines: evidence.filter((item) => item.sections.length > 0) }
}

function formatEvidenceContext(evidence: AssistantEvidence) {
  return evidence.medicines.map((item, index) => {
    const sections = item.sections.map((section) => `  - ${section.label}: ${section.text}`).join("\n")
    return `${index + 1}. ${medicineDisplayName(item.medicine)}\n${sections}\n  - Sources: ${item.sources.join("; ")}`
  }).join("\n\n")
}

function hasExternalLabelEvidence(evidence: AssistantEvidence) {
  return evidence.medicines.some((item) => item.sources.includes("openFDA drug label API"))
}

async function generateGroundedLLMResponse(question: string, evidence: AssistantEvidence): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null
  if (!evidence.medicines.length) return null

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash"
  const apiUrl = process.env.GEMINI_API_URL || `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const prompt = `
You are Antigravity, the MAP medication guide.
Answer the user using only SOURCE_CONTEXT below.
Do not add medicine facts, dosage advice, safety claims, or side effects that are not present in SOURCE_CONTEXT.
If SOURCE_CONTEXT does not answer the question, say the available sources do not contain enough detail and suggest asking a pharmacist or clinician.
Keep the answer short, simple, and professional.
End with "Sources used:" and list only the sources present in SOURCE_CONTEXT.
End with this disclaimer: ${disclaimer}

SOURCE_CONTEXT:
${formatEvidenceContext(evidence)}

User Question: ${question}
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
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 900,
          },
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

function getAssistantResponse(question: string, evidence: AssistantEvidence): string {
  const q = question.toLowerCase()

  if (/(diagnos|what do i have|am i sick|should i take|can i stop|emergency|chest pain|can't breathe|suicide)/.test(q)) {
    return `I cannot diagnose symptoms or tell you to start, stop, or change treatment. Please contact a licensed clinician. If this is urgent, seek emergency care now.\n\n${disclaimer}`
  }

  if (evidence.intent === "availability") {
    return `Use the Find Medicine page to search verified pharmacy stock, prices, and recent update times. If there is no match, send an availability request so pharmacies can respond.\n\nSources used: MAP medicine catalog and inventory workflow.\n\n${disclaimer}`
  }

  if (!evidence.medicines.length) {
    return `I could not match a medicine name in the MAP catalog or public label data. Please ask again with the medicine name, for example "side effects of amoxicillin" or "storage for insulin".\n\nSources used: MAP medicine catalog lookup.\n\n${disclaimer}`
  }

  const details = evidence.medicines.map((item) => {
    const header = medicineDisplayName(item.medicine)
    const sections = item.sections
      .slice(0, hasExternalLabelEvidence(evidence) ? 4 : 1)
      .map((section) => `- ${section.label}: ${section.text}`)
      .join("\n")
    return `${header}\n${sections}`
  }).join("\n\n")

  const sourceNames = Array.from(new Set(evidence.medicines.flatMap((item) => item.sources))).join("; ")
  const limitation = hasExternalLabelEvidence(evidence)
    ? "I only used the source text above. Ask a pharmacist or clinician before making medicine decisions."
    : "I found catalog details, but no public label sections for this question. Ask a pharmacist or clinician for clinical guidance."

  return `Here is what I found from available source data:\n\n${details}\n\n${limitation}\n\nSources used: ${sourceNames}.\n\n${disclaimer}`
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

  const blockedQuestion = /(diagnos|what do i have|am i sick|should i take|can i stop|emergency|chest pain|can't breathe|suicide)/.test(content.toLowerCase())
  const intent = blockedQuestion ? "general" : await inferIntentWithLLM(content) ?? inferIntent(content)
  const evidence = blockedQuestion || intent === "availability"
    ? { intent, medicines: [] } satisfies AssistantEvidence
    : await buildAssistantEvidence(content, intent)

  let reply = blockedQuestion || intent === "availability" ? null : await generateGroundedLLMResponse(content, evidence)
  if (!reply) {
    reply = getAssistantResponse(content, evidence)
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
