import { AppShell } from "@/components/AppShell"

export const metadata = { title: "Committee settings · Engage" }

/** Committee Settings hub — registration/assets + the AI grounding (voice, topics, context). */
export default function CommitteeSettingsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
