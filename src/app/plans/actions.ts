"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireCommittee } from "@/lib/context"
import { isDevEnv } from "@/lib/appEnv"
import { PLAN_ORDER, type PlanId } from "@/lib/entitlements"

/**
 * Development only: switch the active committee's plan so gated features (the Voter File
 * unlocks at Campaign) can be built and tested without a billing flow. Checked on the
 * server, so it does nothing on the production database no matter what is submitted.
 */
export async function setDevPlan(formData: FormData): Promise<void> {
  if (!isDevEnv()) throw new Error("Plan switching is only available in development.")
  const ctx = await requireCommittee("admin")
  const plan = String(formData.get("plan") ?? "") as PlanId
  if (!PLAN_ORDER.includes(plan)) throw new Error("Unknown plan.")
  await prisma.committee.update({ where: { id: ctx.committee.id }, data: { plan } })
  // The sidebar, dashboard and gated pages all read the plan from the committee row
  revalidatePath("/", "layout")
}
