import Link from "next/link"

export function AppHeader({ planLabel }: { planLabel: string }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] text-sm font-black text-[#0f2044]">
            E
          </span>
          <span className="text-lg font-bold tracking-tight text-[#1a1a2e]">Engage Campaign</span>
        </Link>
        <span className="rounded-full border border-border bg-[#f4f6f9] px-3 py-1 text-xs font-medium text-muted-foreground">
          {planLabel} plan
        </span>
      </div>
    </header>
  )
}
