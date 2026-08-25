import { AppShell } from "@/components/AppShell"

export const metadata = { title: "AI Assistant · Engage" }

/** AI Assistant — reference for AI-assisted writing (the guide + model comparison). */
export default function AiLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
