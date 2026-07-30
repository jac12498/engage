import Link from "next/link"
import { signOut } from "@/lib/auth"
import { LogOut, Settings } from "lucide-react"

export function AppHeader({ planLabel }: { planLabel: string }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] text-sm font-black text-[#0f2044]">
            E
          </span>
          <span className="text-lg font-bold tracking-tight text-[#1a1a2e]">Engage</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-border bg-[#f4f6f9] px-3 py-1 text-xs font-medium text-muted-foreground">
            {planLabel} plan
          </span>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-[#1a1a2e]"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Link>
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/sign-in" })
            }}
          >
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-[#1a1a2e]"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
