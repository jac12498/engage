import { Fragment } from "react"
import { parseBlocks, type NlBlock, type HeadingProps, type TextProps, type ImageProps, type ButtonProps } from "@/lib/newsletter/blocks"

// Web render of newsletter content blocks for the public archive (themed via the
// site's CSS vars). Distinct from the email renderer (lib/newsletter/renderEmail) —
// same block data, but web HTML instead of email-safe tables.

function TextBlock({ body }: { body: string }) {
  const paras = body.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)
  return (
    <>
      {paras.map((para, i) => (
        <p key={i} className="mb-4 text-lg leading-relaxed text-[#333]">
          {para.split("\n").map((line, j, arr) => (
            <Fragment key={j}>
              {line}
              {j < arr.length - 1 && <br />}
            </Fragment>
          ))}
        </p>
      ))}
    </>
  )
}

function OneBlock({ block }: { block: NlBlock }) {
  switch (block.type) {
    case "heading": {
      const p = block.props as HeadingProps
      return p.text ? (
        <h2 className="mb-4 mt-8 text-2xl font-bold" style={{ color: "var(--site-primary)" }}>
          {p.text}
        </h2>
      ) : null
    }
    case "text": {
      const p = block.props as TextProps
      return p.body ? <TextBlock body={p.body} /> : null
    }
    case "image": {
      const p = block.props as ImageProps
      if (!p.src) return null
      // eslint-disable-next-line @next/next/no-img-element
      const img = <img src={p.src} alt={p.alt ?? ""} className="my-4 h-auto w-full rounded-lg" />
      return p.href ? (
        <a href={p.href} target="_blank" rel="noopener noreferrer">
          {img}
        </a>
      ) : (
        img
      )
    }
    case "button": {
      const p = block.props as ButtonProps
      if (!p.label) return null
      const align = p.align === "left" ? "flex-start" : p.align === "right" ? "flex-end" : "center"
      return (
        <div className="my-5 flex" style={{ justifyContent: align }}>
          <a
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg px-6 py-3 text-sm font-semibold text-[#0f2044]"
            style={{ backgroundColor: "var(--site-accent)" }}
          >
            {p.label}
          </a>
        </div>
      )
    }
    case "divider":
      return <hr className="my-6 border-t border-black/10" />
    default:
      return null
  }
}

export function NewsletterBlocks({ raw }: { raw: unknown }) {
  const blocks = parseBlocks(raw)
  return (
    <div className="mt-8">
      {blocks.map((b) => (
        <OneBlock key={b.id} block={b} />
      ))}
    </div>
  )
}
