import { AppShell } from "@/components/AppShell"

export const metadata = { title: "Newsletter · Engage" }

export default function NewsletterLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
