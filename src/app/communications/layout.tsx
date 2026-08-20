import { redirect } from "next/navigation"
import { AppShell } from "@/components/AppShell"
import { requireActiveCampaign, campaignProfile } from "@/lib/context"
import { moduleSetupRequirement } from "@/lib/moduleStatus"
import { ModuleSetupGate } from "@/components/ModuleSetupGate"

export const metadata = { title: "Communications · Engage" }

export default async function CommunicationsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireActiveCampaign()
  if (!ctx.permissions.has("ai-communications:read")) redirect("/dashboard")
  const setup = moduleSetupRequirement("ai-communications", campaignProfile(ctx.candidate, ctx.campaign))
  return (
    <AppShell>
      {setup ? <ModuleSetupGate moduleName="Communications" requirement={setup} /> : children}
    </AppShell>
  )
}
