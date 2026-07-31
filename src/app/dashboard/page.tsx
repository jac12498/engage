import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Check, Circle, Sparkles } from "lucide-react"
import { auth } from "@/lib/auth"
import { AppShell } from "@/components/AppShell"
import { computeHomeTasks, type HomeTask } from "@/lib/homeTasks"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const data = await computeHomeTasks(session.user.id)
  if (!data) redirect("/onboarding")

  const { candidateName, tasks, doneCount, total } = data
  const pending = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)
  const allDone = doneCount >= total
  const pct = Math.round((doneCount / total) * 100)

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">
          {candidateName ? `${candidateName}'s campaign` : "Your campaign"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {allDone
            ? "You're all set up. Here's where to jump back in."
            : "A few steps to get your campaign fully up and running."}
        </p>
      </div>

      {/* Progress */}
      <div className="mt-6 rounded-2xl border border-border bg-white p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-[#1a1a2e]">Setup progress</span>
          <span className="text-muted-foreground">
            {doneCount} of {total} complete
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#f4f6f9]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#f0b429] to-[#c4910a] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {allDone ? (
        <div className="mt-8 rounded-2xl border border-[#1e6b3a]/25 bg-[#1e6b3a]/[0.04] p-6 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#1e6b3a]/10 text-[#1e6b3a]">
            <Sparkles className="h-5 w-5" />
          </div>
          <h2 className="mt-3 text-lg font-semibold text-[#1a1a2e]">You&rsquo;re all set up</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything&rsquo;s in place. Jump into a module to keep your campaign moving.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <QuickLink href="/communications" label="Write a communication" />
            <QuickLink href="/newsletters" label="Send a newsletter" />
            <QuickLink href="/website" label="Edit your website" />
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">Next steps</h2>
          <div className="mt-4 space-y-3">
            {pending.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {done.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Completed ({done.length})
          </h2>
          <div className="mt-3 space-y-2">
            {done.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-white/60 px-4 py-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1e6b3a]/10 text-[#1e6b3a]">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm text-muted-foreground line-through">{task.title}</span>
                <Link href={task.href} className="ml-auto text-xs font-medium text-[#1b3a6b] hover:underline">
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  )
}

function TaskRow({ task }: { task: HomeTask }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-white p-5 transition-colors hover:border-[#c4910a]/40">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground">
          <Circle className="h-3 w-3" />
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold text-[#1a1a2e]">{task.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{task.detail}</p>
        </div>
      </div>
      <Link
        href={task.href}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#1b3a6b] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#122850]"
      >
        {task.cta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-[#1a1a2e] transition-colors hover:border-[#1b3a6b]/40"
    >
      {label}
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
    </Link>
  )
}
