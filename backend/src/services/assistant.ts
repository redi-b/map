import { and, asc, desc, eq } from "drizzle-orm"
import { db } from "../db/client.js"
import { aiChatMessages, aiChatSessions } from "../db/schema.js"

const disclaimer =
  "This assistant provides medication information only and is not a substitute for professional medical advice. Always consult a healthcare professional for diagnosis and treatment."

const welcomeMessage = "Hello. What medication information can I help you with?"

function titleFromContent(content: string) {
  return content.length > 34 ? `${content.slice(0, 31)}...` : content
}

function getAssistantResponse(question: string): string {
  const q = question.toLowerCase()

  if (/(diagnos|what do i have|am i sick|should i take|can i stop|emergency|chest pain|can't breathe|suicide)/.test(q)) {
    return `I cannot diagnose symptoms or tell you to start, stop, or change treatment. Please contact a licensed clinician. If this is urgent, seek emergency care now.\n\n${disclaimer}`
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

  await db.insert(aiChatMessages).values({
    sessionId,
    senderType: "assistant",
    content: getAssistantResponse(content),
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
