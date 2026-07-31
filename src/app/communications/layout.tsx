import { AppShell } from "@/components/AppShell"

export const metadata = { title: "Communications · Engage" }

export default function CommunicationsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
