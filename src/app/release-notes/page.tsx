import { Sparkles, Wrench, ArrowUpCircle } from "lucide-react"
import { AppShell } from "@/components/AppShell"
import { requireCommittee } from "@/lib/context"
import { prisma } from "@/lib/prisma"
import { RELEASES, APP_VERSION, type ChangeKind } from "@/lib/releaseNotes"

export const dynamic = "force-dynamic"
export const metadata = { title: "Release notes · Engage" }

const KIND_META: Record<ChangeKind, { icon: typeof Sparkles; color: string; bg: string }> = {
  New: { icon: Sparkles, color: "#1b3a6b", bg: "#1b3a6b14" },
  Improved: { icon: ArrowUpCircle, color: "#0a7d4d", bg: "#0a7d4d14" },
  Fixed: { icon: Wrench, color: "#8a5a00", bg: "#8a5a0014" },
}

function formatDate(iso: string): string {
  // Parse as a plain date (no timezone shift).
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default async function ReleaseNotesPage() {
  // Readable by every committee member (any role); AppShell handles the auth gate.
  const ctx = await requireCommittee()

  // Mark the current release as seen — clears the sidebar "What's new" dot. Only
  // writes when it actually changed. Runs before AppShell renders below, so the
  // dot is already cleared on this same page load.
  await prisma.user.updateMany({
    where: { id: ctx.userId, NOT: { lastSeenReleaseVersion: APP_VERSION } },
    data: { lastSeenReleaseVersion: APP_VERSION },
  })

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#1a1a2e]">Release notes</h1>
            <span className="rounded-full bg-[#1b3a6b]/10 px-2.5 py-0.5 text-xs font-semibold text-[#1b3a6b]">
              v{APP_VERSION}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            What&rsquo;s new in Engage. We&rsquo;ll note new features, improvements, and fixes here as they ship.
          </p>
        </header>

        <div className="space-y-10">
          {RELEASES.map((release) => (
            <section key={release.version}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border pb-3">
                <h2 className="text-lg font-semibold text-[#1a1a2e]">
                  {release.title ?? `Version ${release.version}`}
                </h2>
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                  v{release.version}
                </span>
                <span className="text-sm text-muted-foreground">{formatDate(release.date)}</span>
              </div>

              {release.summary && (
                <p className="mt-3 text-sm leading-relaxed text-[#4a4a5e]">{release.summary}</p>
              )}

              <div className="mt-4 space-y-5">
                {release.sections.map((section) => {
                  const meta = KIND_META[section.kind]
                  const Icon = meta.icon
                  return (
                    <div key={section.kind}>
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center rounded-md"
                          style={{ backgroundColor: meta.bg, color: meta.color }}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-sm font-semibold" style={{ color: meta.color }}>
                          {section.kind}
                        </span>
                      </div>
                      <ul className="ml-1 space-y-1.5">
                        {section.items.map((item, i) => (
                          <li key={i} className="flex gap-2 text-sm leading-relaxed text-[#4a4a5e]">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
