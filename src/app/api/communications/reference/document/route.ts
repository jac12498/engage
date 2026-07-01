import { auth } from "@/lib/auth"
import { anthropic } from "@/lib/comms/anthropic"
import { DEFAULT_AI_MODEL } from "@/lib/entitlements"

const MAX_BYTES = 12 * 1024 * 1024 // 12MB

/**
 * Summarize an uploaded PDF into reference context. Claude reads the PDF
 * natively (document content block) — no server-side PDF parsing needed.
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 })

  const form = await req.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return Response.json({ error: "No file uploaded." }, { status: 400 })
  }
  if (file.type !== "application/pdf") {
    return Response.json({ error: "Please upload a PDF." }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "That PDF is too large (max 12MB)." }, { status: 400 })
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64")

  let msg
  try {
    msg = await anthropic.messages.create({
      model: DEFAULT_AI_MODEL,
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64 },
            },
            {
              type: "text",
              text: `Summarize this document for a political campaign's records.
Return ONLY a JSON object: {"title": string, "source": string, "summary": string}
- title: the document's title (fall back to the filename "${file.name}")
- source: the issuing organization/author if identifiable, else ""
- summary: 3-5 sentences capturing the key facts, figures, and anything relevant to a candidate.`,
            },
          ],
        },
      ],
    })
  } catch {
    return Response.json(
      { error: "Couldn't read that PDF. Try a different file or paste the text as a note." },
      { status: 422 }
    )
  }

  const raw = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("")
  let parsed: { title?: string; source?: string; summary?: string } = {}
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) parsed = JSON.parse(match[0])
  } catch {
    parsed = {}
  }

  return Response.json({
    title: (parsed.title || file.name.replace(/\.pdf$/i, "")).trim(),
    source: (parsed.source || "").trim(),
    summary: (parsed.summary || raw).trim(),
  })
}
