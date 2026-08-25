import { AppShell } from "@/components/AppShell"

export const metadata = { title: "Settings · Engage" }

/** Committee Settings hub — profile, assets, and the AI grounding (voice, topics, context). */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
