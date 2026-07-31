"use server"

import { signOut } from "@/lib/auth"

/** Sign the user out and return them to the sign-in page. Usable as a form action
 *  from client components (e.g. the sidebar). */
export async function signOutAction() {
  await signOut({ redirectTo: "/sign-in" })
}
