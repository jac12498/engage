import { AppShell } from "@/components/AppShell"

export const metadata = { title: "Candidate Website · Engage" }

export default function WebsiteLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
