"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { auth, updateSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * Begin impersonating a committee member (system admin only). Sets a session
 * overlay that {@link getActiveContext} honors — re-verified there every request.
 * Called from the /admin roster as a form action.
 */
export async function startImpersonation(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session?.user?.id || !session.isSystemAdmin) redirect("/dashboard")

  const targetUserId = String(formData.get("userId") || "")
  const committeeId = String(formData.get("committeeId") || "")

  // The target must really be a member of that committee.
  const membership = await prisma.committeeMembership.findUnique({
    where: { userId_committeeId: { userId: targetUserId, committeeId } },
    select: { userId: true },
  })
  if (!membership) redirect("/admin")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await updateSession({ impersonate: { userId: targetUserId, committeeId } } as any)
  revalidatePath("/", "layout")
  redirect("/dashboard")
}

/** Stop impersonating and return to the admin's own workspace. */
export async function stopImpersonation(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await updateSession({ impersonate: null } as any)
  revalidatePath("/", "layout")
  redirect("/dashboard")
}
