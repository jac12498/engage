import { AppShell } from "@/components/AppShell"

export const metadata = { title: "AI Communications · Engage" }

export default function CommunicationsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
