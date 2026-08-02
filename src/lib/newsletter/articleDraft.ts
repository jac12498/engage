// Bridge between the Communications "newsletter_article" prose (a headline line +
// body paragraphs) and the newsletter's block model. Pure — shared by the editor
// and the AI panel. AI owns the words; the builder owns the layout, so this only
// ever touches the article's title (heading) + body (text); images/buttons/etc.
// are never produced or consumed here.

/** Split article prose into { title, body }. First short line + a following body
 *  is treated as headline + body; otherwise it's all body with no title. */
export function parseArticleProse(raw: string): { title: string; body: string } {
  const text = raw.trim()
  if (!text) return { title: "", body: "" }
  const lines = text.split("\n")
  const first = lines[0]
    .replace(/^#+\s*/, "") // strip a markdown heading marker if present
    .replace(/^\*+|\*+$/g, "") // strip stray bold markers
    .replace(/^["“](.*)["”]$/, "$1") // unwrap a fully-quoted line
    .trim()
  const rest = lines.slice(1).join("\n").trim()
  // A short first line with body after it reads as a headline; anything else is body.
  if (rest && first.length > 0 && first.length <= 120) return { title: first, body: rest }
  return { title: "", body: text }
}

/** Serialize an article group's title + body back into the prose form the AI edits. */
export function articleProseFromBlocks(title: string, body: string): string {
  const t = title.trim()
  const b = body.trim()
  if (t && b) return `${t}\n\n${b}`
  return t || b
}
