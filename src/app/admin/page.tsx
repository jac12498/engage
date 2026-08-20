import Link from "next/link"
import { ArrowLeft, ArrowRight, ShieldCheck, Building2, Play, Database } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireSystemAdmin } from "@/lib/context"
import { startImpersonation, stopImpersonation } from "./actions"

export const dynamic = "force-dynamic"
export const metadata = { title: "System Admin · Engage" }

export default async function AdminPage() {
  await requireSystemAdmin()
  const session = await auth()
  const imp = session?.impersonating ?? null

  const committees = await prisma.committee.findMany({
    select: {
      id: true,
      name: true,
      plan: true,
      members: {
        select: {
          role: true,
          roleType: { select: { label: true } },
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { name: "asc" },
  })

  let impInfo: { name: string; committee: string } | null = null
  if (imp) {
    const [u, c] = await Promise.all([
      prisma.user.findUnique({ where: { id: imp.userId }, select: { name: true, email: true } }),
      prisma.committee.findUnique({ where: { id: imp.committeeId }, select: { name: true } }),
    ])
    impInfo = { name: u?.name || u?.email || "member", committee: c?.name || "committee" }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1b3a6b]/8 text-[#1b3a6b]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-[#1a1a2e]">System Administration</h1>
              <p className="text-sm text-muted-foreground">Overall system admin tools.</p>
            </div>
          </div>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1b3a6b] hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to workspace
          </Link>
        </div>

        {impInfo && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#c4910a]/40 bg-[#c4910a]/10 px-5 py-3">
            <p className="text-sm text-[#7a5a00]">
              Currently viewing as <strong>{impInfo.name}</strong> in <strong>{impInfo.committee}</strong>.
            </p>
            <form action={stopImpersonation}>
              <button className="rounded-lg bg-[#1b3a6b] px-3.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#122850]">
                Stop impersonating
              </button>
            </form>
          </div>
        )}

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Committees &amp; members
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Impersonate a member to see exactly what they see — for reproducing bug reports and training.
        </p>

        <div className="mt-4 space-y-4">
          {committees.map((c) => (
            <div key={c.id} className="rounded-2xl border border-border bg-white p-5">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#1b3a6b]" />
                <h3 className="font-semibold text-[#1a1a2e]">{c.name}</h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{c.plan}</span>
              </div>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {c.members.map((m) => (
                    <tr key={m.user.id} className="border-t border-border">
                      <td className="py-2">
                        <div className="font-medium text-[#1a1a2e]">{m.user.name || m.user.email}</div>
                        <div className="text-xs text-muted-foreground">{m.user.email}</div>
                      </td>
                      <td className="py-2 text-muted-foreground">{m.roleType?.label ?? m.role}</td>
                      <td className="py-2 text-right">
                        <form action={startImpersonation}>
                          <input type="hidden" name="userId" value={m.user.id} />
                          <input type="hidden" name="committeeId" value={c.id} />
                          <button className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-[#1b3a6b] transition-colors hover:bg-muted">
                            <Play className="h-3.5 w-3.5" /> Impersonate
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                  {c.members.length === 0 && (
                    <tr>
                      <td className="py-2 text-sm text-muted-foreground">No members.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wider text-muted-foreground">System data</h2>
        <Link
          href="/admin/import"
          className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-border bg-white p-5 transition-colors hover:border-[#1b3a6b]/40"
        >
          <div>
            <p className="flex items-center gap-2 font-medium text-[#1a1a2e]">
              <Database className="h-4 w-4 text-[#1b3a6b]" />
              Data Import
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Load reference datasets — e.g. the NY Board of Elections committee &amp; candidate registry (COMMCAND).
            </p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Link>
      </div>
    </div>
  )
}
