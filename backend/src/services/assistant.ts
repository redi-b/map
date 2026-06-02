import { and, asc, desc, eq, ilike, or } from "drizzle-orm"
import { db } from "../db/client.js"
import { aiChatMessages, aiChatSessions, medicines, medicineAliases } from "../db/schema.js"

const disclaimer =
  "This assistant provides medication information only and is not a substitute for professional medical advice. Always consult a healthcare professional for diagnosis and treatment."

const welcomeMessage = "Hello. Ask about a medicine by name and I will answer only from the MAP catalog and public medicine label sources."
const openFdaSourceName = "openFDA drug label API"
const fdaInsulinStorageSourceName = "FDA insulin storage guidance"

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

type AssistantRouteKind = "medicine_info" | "follow_up" | "symptom_recommendation" | "availability" | "unsafe" | "general"

type AssistantRoute = {
  kind: AssistantRouteKind
  intent: AssistantIntent
  medicineName: string | null
  usePreviousMedicine: boolean
}

// Common conversational/medical stop words to isolate candidate drug names when no local directory match exists
const STOP_WORDS = new Set([
  "what", "how", "why", "who", "where", "when", "which", "whose", "whom",
  "any", "all", "ok", "okay", "thanks", "thank", "hello", "hi", "hey",
  "take", "took", "taken", "taking", "dose", "dosage", "side", "effect", "effects",
  "store", "stored", "storing", "storage", "keep", "room", "temp", "temperature",
  "refrigerate", "refrigerated", "refrigerator", "opened", "opening", "open",
  "unopened", "before", "after", "find", "stock", "pharmacy", "pharmacies",
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

const SYMPTOM_TERMS = new Set([
  "cough", "cold", "flu", "fever", "headache", "pain", "diarrhea", "vomiting",
  "nausea", "rash", "itching", "sore", "throat", "allergy", "infection",
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

function cleanSourceText(value: string) {
  return normalizeText(value)
    .replace(/^\d+\s+[A-Z][A-Z\s/,-]+?\s+(?=[A-Z][a-z])/g, "")
    .replace(/^(uses|indications|indications and usage|adverse reactions?|warnings?|storage and handling|how supplied):\s*/i, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\(\s*\d+(\.\d+)?\s*\)/g, "")
    .replace(/\s*\[[^\]]+\]/g, "")
    .replace(/\s*•\s*/g, "; ")
}

function stripLowValueLabelText(value: string) {
  return cleanSourceText(value)
    .replace(/To report SUSPECTED ADVERSE REACTIONS.*?(?=(The most common|Most common|Common adverse|Clinical trials|ADVERSE REACTIONS|$))/gi, "")
    .replace(/Call your doctor for medical advice about side effects.*?(?=(The most common|Most common|Common adverse|Clinical trials|$))/gi, "")
    .replace(/You may report side effects.*?(?=(The most common|Most common|Common adverse|Clinical trials|$))/gi, "")
    .replace(/Recommended dosages and durations.*?(?=[A-Z][a-z]+ is|The following|$)/gi, "")
    .replace(/\bwww\.\s*fda\.\s*gov\/medwatch\b/gi, "")
    .replace(/\b1-800-FDA-1088\b/gi, "")
    .replace(/\b1-\d{3}-\d{3}-\d{4}\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function sentenceFragments(value: string) {
  return value
    .split(/(?<=[.!?])\s+|;\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function usefulSourceText(value: string, intent: AssistantIntent, maxLength = 520) {
  const cleaned = stripLowValueLabelText(value)
  if (!cleaned) return null

  const sentences = sentenceFragments(cleaned)
  const intentPatterns: Partial<Record<AssistantIntent, RegExp[]>> = {
    uses: [/indicated for/i, /used (to|for)/i, /treat/i, /infection/i],
    side_effects: [/most common adverse/i, /common adverse/i, /adverse reactions? (include|are|were)/i, /diarrhea|nausea|vomiting|abdominal pain|rash|headache/i],
    storage: [/store|storage|refrigerat|temperature|heat|sunlight|frozen/i],
    warnings: [/warning|precaution|contraindicat|avoid|risk/i],
    dosage: [/dosage|administration|take|dose/i],
    interactions: [/interaction|concomitant|together|combine/i],
  }
  const patterns = intentPatterns[intent] ?? []
  const selected = patterns.length
    ? sentences.filter((sentence) => patterns.some((pattern) => pattern.test(sentence)))
    : sentences

  const source = selected.length ? selected : sentences
  const summary = source.reduce((acc, sentence) => {
    const next = `${acc} ${sentence}`.trim()
    return next.length <= maxLength ? next : acc
  }, "")

  return summary || `${source.join(" ").slice(0, maxLength).trim()}...`
}

function hasUsefulSourceText(value: string, intent: AssistantIntent) {
  const useful = usefulSourceText(value, intent, 320)
  return Boolean(useful && useful.length >= 40 && !/suspected adverse reactions|medwatch|fda-1088/i.test(useful))
}

function conciseSourceText(value: string, intent: AssistantIntent, maxLength = 360) {
  const cleaned = usefulSourceText(value, intent, maxLength) ?? stripLowValueLabelText(value)
  if (cleaned.length <= maxLength) return cleaned

  const sentences = sentenceFragments(cleaned)
  const summary = sentences.reduce((acc, sentence) => {
    const next = `${acc} ${sentence}`.trim()
    return next.length <= maxLength ? next : acc
  }, "")

  return summary || `${cleaned.slice(0, maxLength).trim()}...`
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

function mentionsSymptomOnly(question: string) {
  const terms = question
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
  const candidateTerms = extractCandidateTerms(question)
  const nonSymptomTerms = candidateTerms.filter((term) => !SYMPTOM_TERMS.has(term))

  return nonSymptomTerms.length === 0 &&
    terms.some((term) => SYMPTOM_TERMS.has(term)) &&
    /(what|which|medicine|drug|treat|use|used|for)/.test(question.toLowerCase())
}

function cleanMedicineLookupName(name: string) {
  return name
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(access|watch|reserve)\b/gi, " ")
    .replace(/[+]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function medicineLookupTerms(medicine: MedicineMatch, question: string) {
  const terms = new Set<string>()
  const cleanedName = cleanMedicineLookupName(medicine.name)
  const questionTerms = extractCandidateTerms(question)

  if (cleanedName) terms.add(cleanedName)
  for (const term of questionTerms) {
    if (medicine.name.toLowerCase().includes(term)) terms.add(term)
  }

  if (/insulin/i.test(medicine.name) || questionTerms.includes("insulin")) terms.add("insulin")
  if (/paracetamol/i.test(medicine.name)) terms.add("acetaminophen")

  return Array.from(terms).filter((term) => term.length >= 3).slice(0, 4)
}

function scoreMedicineMatch(medicine: { name: string; form: string | null; strength: string | null }, terms: string[]) {
  const name = medicine.name.toLowerCase()
  const cleanedName = cleanMedicineLookupName(medicine.name).toLowerCase()

  if (terms.some((term) => cleanedName === term || name === term)) return 0
  if (terms.some((term) => cleanedName.startsWith(term) || name.startsWith(term))) return 1
  if (terms.some((term) => cleanedName.split(/\s+/).includes(term) || name.split(/\s+/).includes(term))) return 2
  if (terms.some((term) => cleanedName.includes(term) || name.includes(term))) return 3
  return 4
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

function blockedMedicalQuestion(question: string) {
  return /(diagnos|what do i have|am i sick|should i take|can i stop|emergency|chest pain|can't breathe|suicide)/.test(question.toLowerCase())
}

function parseAssistantRoute(rawText: string): AssistantRoute | null {
  const jsonText = rawText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim()
  const start = jsonText.indexOf("{")
  const end = jsonText.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) return null

  try {
    const parsed = JSON.parse(jsonText.slice(start, end + 1)) as Partial<AssistantRoute>
    const kinds = new Set<AssistantRouteKind>(["medicine_info", "follow_up", "symptom_recommendation", "availability", "unsafe", "general"])
    const intents = new Set<AssistantIntent>(["availability", "dosage", "interactions", "side_effects", "storage", "uses", "warnings", "general"])

    if (!kinds.has(parsed.kind as AssistantRouteKind)) return null
    if (!intents.has(parsed.intent as AssistantIntent)) return null

    return {
      kind: parsed.kind as AssistantRouteKind,
      intent: parsed.intent as AssistantIntent,
      medicineName: typeof parsed.medicineName === "string" && parsed.medicineName.trim()
        ? parsed.medicineName.trim()
        : null,
      usePreviousMedicine: parsed.usePreviousMedicine === true,
    }
  } catch {
    return null
  }
}

async function routeAssistantMessage(question: string, previousMedicine: MedicineMatch | null): Promise<AssistantRoute | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash"
  const apiUrl = process.env.GEMINI_API_URL || `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const previousMedicineName = previousMedicine ? medicineDisplayName(previousMedicine) : "none"

  const prompt = `
Classify this MAP medication assistant message. Return only compact JSON.

JSON shape:
{"kind":"medicine_info|follow_up|symptom_recommendation|availability|unsafe|general","intent":"availability|dosage|interactions|side_effects|storage|uses|warnings|general","medicineName":string|null,"usePreviousMedicine":boolean}

Rules:
- medicine_info: the current message names a medicine and asks about that medicine.
- follow_up: the current message does not name a new medicine but clearly asks about the previous medicine.
- symptom_recommendation: the user asks what medicine is good for a symptom or condition, such as cough. Do not extract greeting or acknowledgement words as medicine names.
- availability: the user asks about finding stock, pharmacy availability, nearby pharmacies, or how to use MAP search.
- unsafe: the user asks for diagnosis, emergency help, or whether to start, stop, or change treatment.
- general: greetings, unclear messages, or medication questions without a medicine name and without a usable previous medicine.
- If the current message names a medicine, set medicineName to that name and usePreviousMedicine false.
- If this is a follow-up, set medicineName null and usePreviousMedicine true.
- Never use words like ok, okay, thanks, good, medicine, cough, pain, fever, side, effects, or use as medicineName.

Previous medicine: ${previousMedicineName}
Message: ${question}
`

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 160,
        },
      }),
    })

    if (!response.ok) return null
    const data = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    return text ? parseAssistantRoute(text) : null
  } catch (error) {
    console.error("Failed to route assistant message:", error)
    return null
  }
}

async function fallbackAssistantRoute(question: string, previousMedicine: MedicineMatch | null): Promise<AssistantRoute> {
  if (blockedMedicalQuestion(question)) {
    return { kind: "unsafe", intent: "general", medicineName: null, usePreviousMedicine: false }
  }

  if (mentionsSymptomOnly(question)) {
    return { kind: "symptom_recommendation", intent: "general", medicineName: null, usePreviousMedicine: false }
  }

  const intent = inferIntent(question)
  if (intent === "availability") {
    return { kind: "availability", intent, medicineName: null, usePreviousMedicine: false }
  }

  const matches = await findLocalMedicines(question)
  if (matches.length) {
    return { kind: "medicine_info", intent, medicineName: matches[0].name, usePreviousMedicine: false }
  }

  if (previousMedicine && shouldUsePreviousMedicine(question)) {
    return { kind: "follow_up", intent, medicineName: null, usePreviousMedicine: true }
  }

  return { kind: "general", intent: "general", medicineName: null, usePreviousMedicine: false }
}

function normalizeAssistantRoute(route: AssistantRoute, question: string, previousMedicine: MedicineMatch | null): AssistantRoute {
  if (blockedMedicalQuestion(question)) {
    return { kind: "unsafe", intent: "general", medicineName: null, usePreviousMedicine: false }
  }

  if (mentionsSymptomOnly(question) && !route.medicineName) {
    return { kind: "symptom_recommendation", intent: "general", medicineName: null, usePreviousMedicine: false }
  }

  if ((route.kind === "follow_up" || route.usePreviousMedicine) && !previousMedicine) {
    return { kind: "general", intent: "general", medicineName: null, usePreviousMedicine: false }
  }

  if (route.kind === "medicine_info" && !route.medicineName) {
    return { kind: "general", intent: "general", medicineName: null, usePreviousMedicine: false }
  }

  if (route.kind === "availability") {
    return { kind: "availability", intent: "availability", medicineName: null, usePreviousMedicine: false }
  }

  if (route.kind === "unsafe" || route.kind === "symptom_recommendation" || route.kind === "general") {
    return { ...route, intent: "general", medicineName: null, usePreviousMedicine: false }
  }

  if (route.kind === "follow_up") {
    return { ...route, medicineName: null, usePreviousMedicine: true }
  }

  return { ...route, usePreviousMedicine: false }
}

async function getAssistantRoute(question: string, previousMedicine: MedicineMatch | null) {
  const route = await routeAssistantMessage(question, previousMedicine) ?? await fallbackAssistantRoute(question, previousMedicine)
  return normalizeAssistantRoute(route, question, previousMedicine)
}

function openFdaFieldValue(value: string) {
  const cleaned = value.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim()
  return /\s/.test(cleaned) ? `"${cleaned}"` : cleaned
}

function openFdaSearchUrl(medName: string) {
  const term = openFdaFieldValue(medName)
  const params = new URLSearchParams({
    search: `openfda.generic_name:${term} OR openfda.brand_name:${term} OR openfda.substance_name:${term}`,
    limit: "5",
  })
  return `https://api.fda.gov/drug/label.json?${params.toString()}`
}

async function fetchOpenFDASections(medName: string, intent: AssistantIntent): Promise<SourceSection[]> {
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

    let fallbackSections: SourceSection[] = []
    for (const result of data.results ?? []) {
      const combinedText = [
        result.indications_and_usage,
        result.adverse_reactions,
        result.warnings,
        result.storage_and_handling,
      ].flat().join(" ")

      if (/homeopathic|not fda evaluated|traditional homeopathic/i.test(combinedText)) {
        continue
      }

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

      const sections = fields
        .filter(([, values]) => Array.isArray(values) && values.length > 0)
        .map(([label, values]) => ({ label, text: truncateText(values!.join(" ")) }))

      if (!fallbackSections.length) fallbackSections = sections
      if (selectSectionsForIntent(sections, intent).some((section) => hasUsefulSourceText(section.text, intent))) {
        return sections
      }
    }

    return fallbackSections
  } catch (err) {
    console.error(`Error querying OpenFDA for ${medName}:`, err)
    return []
  }
}

async function fetchOpenFDASectionsForMedicine(medicine: MedicineMatch, question: string, intent: AssistantIntent): Promise<SourceSection[]> {
  for (const term of medicineLookupTerms(medicine, question)) {
    const sections = await fetchOpenFDASections(term, intent)
    if (sections.length) return sections
  }

  return []
}

function fallbackSourceSections(medicine: MedicineMatch, intent: AssistantIntent): { sections: SourceSection[]; sources: string[] } {
  if (intent === "storage" && /insulin/i.test(medicine.name)) {
    return {
      sections: [
        {
          label: "Storage and handling",
          text:
            "FDA insulin storage guidance says insulin is recommended to be stored refrigerated at about 36°F to 46°F. Insulin in manufacturer-supplied vials or cartridges may be kept unrefrigerated between 59°F and 86°F for up to 28 days. Keep insulin away from direct heat and sunlight, and do not use insulin that has been frozen.",
        },
      ],
      sources: [fdaInsulinStorageSourceName],
    }
  }

  return { sections: [], sources: [] }
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

    return Array.from(allMatchesMap.values())
      .sort((left, right) => scoreMedicineMatch(left, terms) - scoreMedicineMatch(right, terms) || left.name.localeCompare(right.name))
      .slice(0, 4)
      .map((medicine) => ({
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

async function findContextMedicine(messages: Array<{ sender: string; content: string }>) {
  const userMessages = messages.filter((message) => message.sender === "user")
  for (const message of [...userMessages].reverse()) {
    const matches = await findLocalMedicines(message.content)
    if (matches.length) return matches[0]
  }

  return null
}

function shouldUsePreviousMedicine(question: string) {
  const terms = extractCandidateTerms(question)
  const nonSymptomTerms = terms.filter((term) => !SYMPTOM_TERMS.has(term))
  return nonSymptomTerms.length === 0 ||
    /\b(before|after|opened|opening|open|unopened|refrigerat|storage|store|side effects?|adverse|reaction|warning|interact|dose|dosage|used for|uses?)\b/i.test(question)
}

function contextualizeQuestion(question: string, contextMedicine: MedicineMatch | null) {
  if (!contextMedicine || !shouldUsePreviousMedicine(question)) return question
  const intentHint = /\b(before|after|opened|opening|open|unopened)\b/i.test(question) ? "storage" : ""
  return `${contextMedicine.name} ${intentHint} ${question}`.replace(/\s+/g, " ").trim()
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

  const evidence = await Promise.all(matches.slice(0, 1).map(async (medicine): Promise<MedicineEvidence> => {
    const labelSections = await fetchOpenFDASectionsForMedicine(medicine, question, intent)
    const fallback = fallbackSourceSections(medicine, intent)
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
      ...fallback.sections,
      ...selectSectionsForIntent(labelSections, intent),
    ]

    const sources = ["MAP medicine catalog"]
    if (labelSections.length) sources.push(openFdaSourceName)
    sources.push(...fallback.sources)

    return { medicine, sections, sources }
  }))

  return { intent, medicines: evidence.filter((item) => item.sections.length > 0) }
}

function formatEvidenceContext(evidence: AssistantEvidence) {
  return evidence.medicines.map((item, index) => {
    const sections = item.sections
      .map((section) => {
        const text = section.label === "MAP catalog"
          ? section.text
          : usefulSourceText(section.text, evidence.intent, 700)
        return text ? `  - ${section.label}: ${text}` : null
      })
      .filter(Boolean)
      .join("\n")
    return `${index + 1}. ${medicineDisplayName(item.medicine)}\n${sections}\n  - Sources: ${item.sources.join("; ")}`
  }).join("\n\n")
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
Answer naturally. Prefer one short paragraph or 2-4 bullets. Do not dump raw source sections.
Summarize in patient-friendly language. Do not copy long label passages.
If the source lists many formal indications, explain the main use and include only a few useful examples.
Answer only for the medicine the user asked about. Do not introduce other medicines.
If the user asks a follow-up, answer only the follow-up instead of repeating the whole previous answer.
Do not mention catalog metadata unless it helps answer the user's question.
Keep the answer short, simple, and professional. Aim for 50-100 words.
End with "Sources used:" and list only the sources present in SOURCE_CONTEXT.
Do not repeat the medical disclaimer. The app shows it persistently above the conversation.

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
            temperature: 0.2,
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

  if (blockedMedicalQuestion(q)) {
    return "I cannot diagnose symptoms or tell you to start, stop, or change treatment. Please contact a licensed clinician. If this is urgent, seek emergency care now."
  }

  if (evidence.intent === "availability") {
    return "Use the Find Medicine page to search verified pharmacy stock, prices, and recent update times. If there is no match, send an availability request so pharmacies can respond.\n\nSources used: MAP inventory workflow."
  }

  if (!evidence.medicines.length) {
    return "I could not match a medicine name in the MAP catalog or public label data. Please ask again with the medicine name, for example \"side effects of amoxicillin\" or \"storage for insulin\".\n\nSources used: MAP medicine catalog lookup."
  }

  const item = evidence.medicines[0]
  const medicineName = medicineDisplayName(item.medicine)
  const sourceNames = Array.from(new Set(evidence.medicines.flatMap((item) => item.sources))).join("; ")
  const answerSection = item.sections.find((section) => section.label !== "MAP catalog") ?? item.sections[0]

  if (!answerSection || answerSection.label === "MAP catalog") {
    return `I found ${medicineName} in the MAP catalog, but the available sources do not contain enough detail to answer this question. Please ask a pharmacist or clinician.\n\nSources used: ${sourceNames}.`
  }

  const answerText = conciseSourceText(answerSection.text, evidence.intent)
  if (!answerText) {
    return `I found ${medicineName} in the MAP catalog, but the available sources do not contain enough useful detail to answer this question. Please ask a pharmacist or clinician.\n\nSources used: ${sourceNames}.`
  }

  return `${medicineName}: ${answerText}\n\nSources used: ${sourceNames}.`
}

function getRouteOnlyResponse(route: AssistantRoute): string | null {
  if (route.kind === "unsafe") {
    return "I cannot diagnose symptoms or tell you to start, stop, or change treatment. Please contact a licensed clinician. If this is urgent, seek emergency care now.\n\nSources used: MAP assistant safety workflow."
  }

  if (route.kind === "symptom_recommendation") {
    return "I cannot choose a medicine for a symptom. Please ask a pharmacist or clinician, especially for children, pregnancy, breathing difficulty, fever, chest pain, or symptoms that last. If you already have a medicine name, I can summarize source-backed information about that medicine.\n\nSources used: MAP assistant safety workflow."
  }

  if (route.kind === "availability") {
    return "Use the Find Medicine page to search verified pharmacy stock, prices, and recent update times. If there is no match, send an availability request so pharmacies can respond.\n\nSources used: MAP inventory workflow."
  }

  if (route.kind === "general") {
    return "Please ask with a medicine name, for example \"what is azithromycin used for\" or \"side effects of cetirizine\". I can also help explain how to find stock in MAP.\n\nSources used: MAP assistant workflow."
  }

  return null
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

  const contextMedicine = await findContextMedicine(session.messages)
  const route = await getAssistantRoute(content, contextMedicine)
  const questionForRetrieval = route.usePreviousMedicine
    ? contextualizeQuestion(content, contextMedicine)
    : route.medicineName
      ? `${route.medicineName} ${content}`.replace(/\s+/g, " ").trim()
      : content

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

  const routeOnlyReply = getRouteOnlyResponse(route)
  const evidence = routeOnlyReply
    ? { intent: route.intent, medicines: [] } satisfies AssistantEvidence
    : await buildAssistantEvidence(questionForRetrieval, route.intent)

  let reply = routeOnlyReply ?? await generateGroundedLLMResponse(questionForRetrieval, evidence)

  if (!reply) {
    reply = getAssistantResponse(questionForRetrieval, evidence)
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
