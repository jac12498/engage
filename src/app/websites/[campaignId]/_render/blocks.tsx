import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { VolunteerForm } from "@/components/website/VolunteerForm"
import { NewsletterSignupForm } from "@/components/website/NewsletterSignupForm"
import {
  BLOCK_SPECS,
  isBlockType,
  type HeroProps,
  type RichTextProps,
  type IssuesGridProps,
  type CandidatesProps,
  type VolunteerFormProps,
  type NewsletterSignupProps,
  type CtaBandProps,
  type EndorsementsProps,
  type NewsFeedProps,
  type PressMentionsProps,
  type NewsletterArchiveProps,
  type EventsProps,
  type FaqProps,
} from "@/lib/website/blocks"
import { paragraphs } from "./site"

// Context every block renderer receives. Theme colors are applied through CSS
// variables (--site-primary / --site-accent) set on the page wrapper, so most blocks
// read those directly; ctx carries the few concrete values a block still needs.
/** One candidate for the committee site (candidates block + profile links). */
export interface SiteCandidate {
  id: string
  name: string
  office: string
  party: string | null
  hasHeadshot: boolean
}

export interface RenderCtx {
  /** The committee id — the site's owner; scopes dynamic blocks + public links. */
  committeeId: string
  accentColor: string
  siteTitle: string
  /** The committee's candidates (for the candidates block). */
  candidates: SiteCandidate[]
}

const primary = "var(--site-primary)"
const accent = "var(--site-accent)"

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-3xl font-bold" style={{ color: primary }}>
      {children}
    </h2>
  )
}

// ─── Core blocks ─────────────────────────────────────────────────────────────

function Hero({ props }: { props: HeroProps; ctx: RenderCtx }) {
  return (
    <section id="top" style={{ backgroundColor: primary }} className="text-white">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <h1 className="max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">{props.headline}</h1>
        {props.subhead && <p className="mt-4 max-w-xl text-lg text-white/85">{props.subhead}</p>}
        <div className="mt-7 flex flex-wrap gap-3">
          {props.primaryCta && (
            <CtaAnchor
              href={props.primaryCta.href}
              className="rounded-full px-6 py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              {props.primaryCta.label}
            </CtaAnchor>
          )}
          {props.secondaryCta && (
            <CtaAnchor
              href={props.secondaryCta.href}
              className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              {props.secondaryCta.label}
            </CtaAnchor>
          )}
        </div>
      </div>
    </section>
  )
}

function RichText({ props }: { props: RichTextProps; ctx: RenderCtx }) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      {props.heading && <SectionHeading>{props.heading}</SectionHeading>}
      <div className="mt-5 space-y-4 text-lg leading-relaxed text-[#333]">
        {paragraphs(props.body).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {props.cta && (
        <div className="mt-7">
          <CtaAnchor
            href={props.cta.href}
            className="inline-block rounded-full px-6 py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            {props.cta.label}
          </CtaAnchor>
        </div>
      )}
    </section>
  )
}

function IssuesGrid({ props }: { props: IssuesGridProps; ctx: RenderCtx }) {
  if (props.items.length === 0) return null
  return (
    <section id="issues" style={{ backgroundColor: "#f7f8fa" }}>
      <div className="mx-auto max-w-5xl px-6 py-16">
        {props.heading && <SectionHeading>{props.heading}</SectionHeading>}
        {props.intro && <p className="mt-3 max-w-2xl text-lg text-[#555]">{props.intro}</p>}
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {props.items.map((issue, i) => (
            <div key={i} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold" style={{ color: accent }}>
                {issue.title}
              </h3>
              <div className="mt-2 space-y-3 leading-relaxed text-[#444]">
                {paragraphs(issue.body).map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Candidates({ props, ctx }: { props: CandidatesProps; ctx: RenderCtx }) {
  if (ctx.candidates.length === 0) return null
  return (
    <section id="candidates" className="mx-auto max-w-5xl px-6 py-16">
      {props.heading && <SectionHeading>{props.heading}</SectionHeading>}
      {props.intro && <p className="mt-3 max-w-2xl text-lg text-[#555]">{props.intro}</p>}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ctx.candidates.map((c) => (
          <Link
            key={c.id}
            href={`/websites/${ctx.committeeId}/candidate/${c.id}`}
            className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            {c.hasHeadshot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/website/headshot/${c.id}`}
                alt={c.name}
                className="h-16 w-16 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <span
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-xl font-bold text-white"
                style={{ backgroundColor: accent }}
              >
                {c.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-lg font-semibold" style={{ color: primary }}>
                {c.name}
              </span>
              {c.office && <span className="block truncate text-sm text-[#666]">{c.office}</span>}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function VolunteerFormBlock({ props, ctx }: { props: VolunteerFormProps; ctx: RenderCtx }) {
  return (
    <section id="volunteer" className="mx-auto max-w-2xl px-6 py-16">
      <SectionHeading>{props.heading || "Get involved"}</SectionHeading>
      {props.intro && <p className="mt-3 text-lg text-[#555]">{props.intro}</p>}
      <div className="mt-6">
        <VolunteerForm committeeId={ctx.committeeId} accent={ctx.accentColor} />
      </div>
    </section>
  )
}

// ─── Optional blocks ─────────────────────────────────────────────────────────

function NewsletterSignup({ props, ctx }: { props: NewsletterSignupProps; ctx: RenderCtx }) {
  return (
    <section id="newsletter" className="mx-auto max-w-2xl px-6 py-16">
      <SectionHeading>{props.heading || "Subscribe to our newsletter"}</SectionHeading>
      {props.intro && <p className="mt-3 text-lg text-[#555]">{props.intro}</p>}
      <div className="mt-6">
        <NewsletterSignupForm committeeId={ctx.committeeId} accent={ctx.accentColor} buttonLabel={props.buttonLabel} />
      </div>
    </section>
  )
}

function CtaBand({ props }: { props: CtaBandProps; ctx: RenderCtx }) {
  return (
    <section style={{ backgroundColor: primary }} className="text-white">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-6 py-14 text-center">
        {props.heading && <h2 className="text-2xl font-bold sm:text-3xl">{props.heading}</h2>}
        {props.text && <p className="max-w-2xl text-lg text-white/85">{props.text}</p>}
        <CtaAnchor
          href={props.href}
          className="mt-2 rounded-full px-7 py-3 text-sm font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          {props.buttonLabel}
        </CtaAnchor>
      </div>
    </section>
  )
}

function Endorsements({ props }: { props: EndorsementsProps; ctx: RenderCtx }) {
  if (props.items.length === 0) return null
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      {props.heading && <SectionHeading>{props.heading}</SectionHeading>}
      {props.intro && <p className="mt-3 max-w-2xl text-lg text-[#555]">{props.intro}</p>}
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {props.items.map((e, i) => (
          <figure key={i} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            {e.quote && <blockquote className="text-lg italic leading-relaxed text-[#333]">“{e.quote}”</blockquote>}
            <figcaption className="mt-4">
              <span className="font-semibold" style={{ color: primary }}>
                {e.name}
              </span>
              {e.role && <span className="text-[#666]"> — {e.role}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

async function NewsFeed({ props, ctx }: { props: NewsFeedProps; ctx: RenderCtx }) {
  const items = await prisma.generation.findMany({
    where: {
      campaign: { candidate: { committeeId: ctx.committeeId } },
      published: true,
      type: { in: props.types },
    },
    orderBy: { createdAt: "desc" },
    take: props.limit,
    select: { id: true, title: true, type: true, content: true, createdAt: true },
  })
  if (items.length === 0) return null
  return (
    <section id="news" style={{ backgroundColor: "#f7f8fa" }}>
      <div className="mx-auto max-w-4xl px-6 py-16">
        {props.heading && <SectionHeading>{props.heading}</SectionHeading>}
        {props.intro && <p className="mt-3 max-w-2xl text-lg text-[#555]">{props.intro}</p>}
        <div className="mt-8 space-y-4">
          {items.map((g) => {
            const [first] = paragraphs(g.content)
            return (
              <Link
                key={g.id}
                href={`/websites/${ctx.committeeId}/news/${g.id}`}
                className="block rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <p className="text-xs uppercase tracking-wider text-[#888]">
                  {g.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
                <h3 className="mt-1 text-xl font-semibold" style={{ color: primary }}>
                  {g.title || "Update"}
                </h3>
                {first && <p className="mt-2 line-clamp-2 leading-relaxed text-[#555]">{first}</p>}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

async function PressMentions({ props, ctx }: { props: PressMentionsProps; ctx: RenderCtx }) {
  const clips = await prisma.newsClip.findMany({
    where: { campaign: { candidate: { committeeId: ctx.committeeId } }, status: "approved" },
    orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: props.limit,
    select: { id: true, headline: true, url: true, outlet: true, summary: true, publishedAt: true },
  })
  if (clips.length === 0) return null
  return (
    <section id="press" className="mx-auto max-w-4xl px-6 py-16">
      {props.heading && <SectionHeading>{props.heading}</SectionHeading>}
      {props.intro && <p className="mt-3 max-w-2xl text-lg text-[#555]">{props.intro}</p>}
      <div className="mt-8 space-y-4">
        {clips.map((c) => (
          <a
            key={c.id}
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <p className="text-xs uppercase tracking-wider text-[#888]">
              {[
                c.outlet,
                c.publishedAt
                  ? c.publishedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <h3 className="mt-1 text-xl font-semibold" style={{ color: primary }}>
              {c.headline}
            </h3>
            {c.summary && <p className="mt-2 leading-relaxed text-[#555]">{c.summary}</p>}
          </a>
        ))}
      </div>
    </section>
  )
}

async function NewsletterArchive({ props, ctx }: { props: NewsletterArchiveProps; ctx: RenderCtx }) {
  const items = await prisma.newsletter.findMany({
    where: { campaign: { candidate: { committeeId: ctx.committeeId } }, status: "published" },
    orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: props.limit,
    select: { id: true, subject: true, preview: true, publishedAt: true },
  })
  if (items.length === 0) return null
  return (
    <section id="newsletter-archive" style={{ backgroundColor: "#f7f8fa" }}>
      <div className="mx-auto max-w-4xl px-6 py-16">
        {props.heading && <SectionHeading>{props.heading}</SectionHeading>}
        {props.intro && <p className="mt-3 max-w-2xl text-lg text-[#555]">{props.intro}</p>}
        <div className="mt-8 space-y-4">
          {items.map((n) => (
            <Link
              key={n.id}
              href={`/websites/${ctx.committeeId}/newsletter/${n.id}`}
              className="block rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              {n.publishedAt && (
                <p className="text-xs uppercase tracking-wider text-[#888]">
                  {n.publishedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              )}
              <h3 className="mt-1 text-xl font-semibold" style={{ color: primary }}>
                {n.subject || "Newsletter"}
              </h3>
              {n.preview && <p className="mt-2 line-clamp-2 leading-relaxed text-[#555]">{n.preview}</p>}
            </Link>
          ))}
        </div>
        <div className="mt-6">
          <Link
            href={`/websites/${ctx.committeeId}/newsletter`}
            className="text-sm font-semibold hover:underline"
            style={{ color: primary }}
          >
            View all newsletters →
          </Link>
        </div>
      </div>
    </section>
  )
}

function Events({ props }: { props: EventsProps; ctx: RenderCtx }) {
  if (props.items.length === 0) return null
  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      {props.heading && <SectionHeading>{props.heading}</SectionHeading>}
      {props.intro && <p className="mt-3 max-w-2xl text-lg text-[#555]">{props.intro}</p>}
      <div className="mt-8 space-y-4">
        {props.items.map((e, i) => (
          <div key={i} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold" style={{ color: primary }}>
              {e.title}
            </h3>
            {(e.date || e.location) && (
              <p className="mt-1 text-sm font-medium" style={{ color: accent }}>
                {[e.date, e.location].filter(Boolean).join(" · ")}
              </p>
            )}
            {e.description && <p className="mt-2 leading-relaxed text-[#555]">{e.description}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}

function Faq({ props }: { props: FaqProps; ctx: RenderCtx }) {
  if (props.items.length === 0) return null
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      {props.heading && <SectionHeading>{props.heading}</SectionHeading>}
      {props.intro && <p className="mt-3 text-lg text-[#555]">{props.intro}</p>}
      <div className="mt-8 space-y-6">
        {props.items.map((f, i) => (
          <div key={i}>
            <h3 className="text-lg font-semibold" style={{ color: primary }}>
              {f.q}
            </h3>
            <div className="mt-2 space-y-3 leading-relaxed text-[#555]">
              {paragraphs(f.a).map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Shared helper ───────────────────────────────────────────────────────────

/** External hrefs open in a new tab; same-page anchors and internal paths don't. */
function CtaAnchor({
  href,
  className,
  style,
  children,
}: {
  href: string
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  const external = /^https?:\/\//.test(href)
  return (
    <a
      href={href}
      className={className}
      style={style}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  )
}

// ─── Dispatch ────────────────────────────────────────────────────────────────

type BlockComponent = (args: {
  props: never
  ctx: RenderCtx
}) => React.ReactNode | Promise<React.ReactNode>

const BLOCK_RENDERERS: Record<string, BlockComponent> = {
  hero: Hero as BlockComponent,
  richText: RichText as BlockComponent,
  issuesGrid: IssuesGrid as BlockComponent,
  candidates: Candidates as BlockComponent,
  volunteerForm: VolunteerFormBlock as BlockComponent,
  newsletterSignup: NewsletterSignup as BlockComponent,
  cta: CtaBand as BlockComponent,
  endorsements: Endorsements as BlockComponent,
  newsFeed: NewsFeed as BlockComponent,
  pressMentions: PressMentions as BlockComponent,
  newsletterArchive: NewsletterArchive as BlockComponent,
  events: Events as BlockComponent,
  faq: Faq as BlockComponent,
}

/**
 * Render one stored block. Re-validates the persisted JSON through the block's own
 * validator (defense in depth + normalizes backfilled data), then dispatches to its
 * component. Unknown types are skipped.
 */
export function BlockRenderer({ type, props, ctx }: { type: string; props: unknown; ctx: RenderCtx }) {
  if (!isBlockType(type)) return null
  const Comp = BLOCK_RENDERERS[type]
  if (!Comp) return null
  const clean = BLOCK_SPECS[type].validate(props) as never
  return <Comp props={clean} ctx={ctx} />
}
