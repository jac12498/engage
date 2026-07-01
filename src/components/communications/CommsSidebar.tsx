"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ClipboardList,
  BookOpen,
  Lightbulb,
  Mic,
  Mail,
  Share2,
  Newspaper,
  type LucideIcon,
} from "lucide-react"

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean }

const GROUPS: { group: string; items: Item[] }[] = [
  {
    group: "Set up",
    items: [
      { href: "/communications", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/communications/interview", label: "Interview", icon: ClipboardList },
      { href: "/communications/topics", label: "Topics", icon: Lightbulb },
      { href: "/communications/context", label: "Context", icon: BookOpen },
    ],
  },
  {
    group: "Create",
    items: [
      { href: "/communications/speeches", label: "Speeches", icon: Mic },
      { href: "/communications/letters", label: "Letters", icon: Mail },
      { href: "/communications/social", label: "Social Media", icon: Share2 },
      { href: "/communications/print", label: "Print Media", icon: Newspaper },
    ],
  },
]

export function CommsSidebar() {
  const pathname = usePathname()

  return (
    <nav className="w-52 shrink-0 space-y-6">
      {GROUPS.map((g) => (
        <div key={g.group}>
          <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {g.group}
          </p>
          <div className="space-y-0.5">
            {g.items.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + "/")
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-[#1b3a6b] font-medium text-white"
                      : "text-[#1a1a2e] hover:bg-white"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-white" : "text-muted-foreground"}`} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
