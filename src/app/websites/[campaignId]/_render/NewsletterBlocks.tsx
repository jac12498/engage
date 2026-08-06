import { Fragment } from "react"
import {
  parseBlocks,
  parseInlineLinks,
  type NlBlock,
  type HeadingProps,
  type TextProps,
  type ImageProps,
  type ImageTextProps,
  type ButtonProps,
  type SpacerProps,
  type TwoColumnProps,
  type SocialProps,
  type QuoteProps,
} from "@/lib/newsletter/blocks"

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
              {parseInlineLinks(line).map((tok, k) =>
                "href" in tok ? (
                  <a key={k} href={tok.href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--site-primary)" }}>
                    {tok.label}
                  </a>
                ) : (
                  <Fragment key={k}>{tok.text}</Fragment>
                )
              )}
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
    case "imageText": {
      const p = block.props as ImageTextProps
      if (!p.src && !p.body.trim()) return null
      const floatCls = p.side === "right" ? "float-right ml-5 mb-2" : "float-left mr-5 mb-2"
      // eslint-disable-next-line @next/next/no-img-element
      const img = p.src ? <img src={p.src} alt={p.alt ?? ""} className={`${floatCls} w-40 rounded-lg sm:w-56`} /> : null
      const framed = p.href && img ? (
        <a href={p.href} target="_blank" rel="noopener noreferrer">{img}</a>
      ) : (
        img
      )
      // overflow-hidden establishes a block formatting context so the container
      // grows to contain the float when the image is taller than the text.
      return (
        <div className="my-4 overflow-hidden">
          {framed}
          <TextBlock body={p.body} />
        </div>
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
    case "spacer": {
      const p = block.props as SpacerProps
      return <div style={{ height: p.size === "small" ? 12 : p.size === "large" ? 48 : 28 }} />
    }
    case "twoColumn": {
      const p = block.props as TwoColumnProps
      if (!p.left.trim() && !p.right.trim()) return null
      return (
        <div className="my-4 grid gap-6 sm:grid-cols-2">
          <div><TextBlock body={p.left} /></div>
          <div><TextBlock body={p.right} /></div>
        </div>
      )
    }
    case "social": {
      const p = block.props as SocialProps
      const links = (
        [
          ["Facebook", p.facebook],
          ["X", p.x],
          ["Instagram", p.instagram],
          ["YouTube", p.youtube],
          ["Website", p.website],
        ] as [string, string][]
      ).filter(([, u]) => u)
      if (links.length === 0) return null
      return (
        <div className="my-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm font-semibold" style={{ color: "var(--site-primary)" }}>
          {links.map(([label, url]) => (
            <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {label}
            </a>
          ))}
        </div>
      )
    }
    case "quote": {
      const p = block.props as QuoteProps
      if (!p.text) return null
      return (
        <blockquote className="my-5 border-l-4 pl-4 italic text-[#1a1a2e]" style={{ borderColor: "var(--site-accent)" }}>
          <p className="text-lg">{p.text}</p>
          {p.attribution && <p className="mt-2 text-sm not-italic text-muted-foreground">— {p.attribution}</p>}
        </blockquote>
      )
    }
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
