"use server"

import { revalidatePath } from "next/cache"
import { getActiveContext } from "@/lib/context"
import { prisma } from "@/lib/prisma"

/**
 * Dismiss the active committee's registry-sync banner. Clears `registryAlert`; the
 * import reconciliation only re-raises it on a NEW event, so it won't nag. Any
 * signed-in member of the committee may dismiss (it only hides a notice).
 */
export async function dismissRegistryAlert(): Promise<void> {
  const ctx = await getActiveContext()
  if (!ctx) return
  await prisma.committee.update({
    where: { id: ctx.committee.id },
    data: { registryAlert: null },
  })
  revalidatePath("/", "layout")
}
