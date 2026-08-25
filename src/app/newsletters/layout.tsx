import { redirect } from "next/navigation"
import { AppShell } from "@/components/AppShell"
import { requireActiveCampaign, campaignProfile } from "@/lib/context"
import { moduleSetupRequirement } from "@/lib/moduleStatus"
import { ModuleSetupGate } from "@/components/ModuleSetupGate"

export const metadata = { title: "Newsletter · Engage" }

export default async function NewsletterLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireActiveCampaign()
  if (!ctx.permissions.has("newsletter:read")) redirect("/dashboard")
  const setup = moduleSetupRequirement("newsletter", campaignProfile(ctx.committee, ctx.candidate, ctx.campaign))
  return (
    <AppShell>
      {setup ? <ModuleSetupGate moduleName="Newsletter" requirement={setup} /> : children}
    </AppShell>
  )
}
