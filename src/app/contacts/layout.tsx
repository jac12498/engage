import { AppShell } from "@/components/AppShell"

export const metadata = { title: "Contacts · Engage" }

export default function ContactsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
