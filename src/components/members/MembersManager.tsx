"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { UserPlus, Trash2 } from "lucide-react"
import { inviteMember, changeMemberRole, removeMember } from "@/app/members/actions"

export interface MemberRow {
  userId: string
  name: string | null
  email: string
  role: string
  pending: boolean
  joinedAt: string
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
}
const ROLE_HELP: Record<string, string> = {
  owner: "Full control, incl. billing & members",
  admin: "Manage members & all content",
  editor: "Create & edit content",
  viewer: "Read-only",
}

export function MembersManager({
  members,
  currentUserId,
  currentRole,
}: {
  members: MemberRow[]
  currentUserId: string
  currentRole: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [email, setEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("editor")
  const [error, setError] = useState<string | null>(null)

  const isOwner = currentRole === "owner"
  // Owners can assign any role; admins can assign everything except owner.
  const assignable = isOwner ? ["owner", "admin", "editor", "viewer"] : ["admin", "editor", "viewer"]

  function invite() {
    setError(null)
    startTransition(async () => {
      const res = await inviteMember(email, inviteRole)
      if (!res.ok) return setError(res.error)
      setEmail("")
      router.refresh()
    })
  }

  function updateRole(userId: string, role: string) {
    setError(null)
    startTransition(async () => {
      const res = await changeMemberRole(userId, role)
      if (!res.ok) setError(res.error)
      router.refresh()
    })
  }

  function remove(userId: string) {
    setError(null)
    startTransition(async () => {
      const res = await removeMember(userId)
      if (!res.ok) setError(res.error)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Invite */}
      <div className="rounded-2xl border border-border bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#1a1a2e]">
          <UserPlus className="h-4 w-4 text-[#c4910a]" />
          Invite a member
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          They&rsquo;ll get access the next time they sign in with this email.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-[220px] flex-1">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-[#1b3a6b]"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Role</span>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-[#1b3a6b]"
            >
              {assignable.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={invite}
            disabled={pending || !email.trim()}
            className="rounded-lg bg-[#1b3a6b] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#122850] disabled:opacity-50"
          >
            Send invite
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{ROLE_HELP[inviteRole]}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Roster */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 font-semibold">Member</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const isSelf = m.userId === currentUserId
              // Admins can't modify owners; only owners can. Nobody can demote themselves here.
              const canEdit = (isOwner || m.role !== "owner") && !isSelf
              return (
                <tr key={m.userId} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <div className="font-medium text-[#1a1a2e]">
                      {m.name || m.email}
                      {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {m.email}
                      {m.pending && <span className="ml-2 text-[#c4910a]">· invited</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {canEdit ? (
                      <select
                        value={m.role}
                        disabled={pending}
                        onChange={(e) => updateRole(m.userId, e.target.value)}
                        className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[#1b3a6b]"
                      >
                        {assignable.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[#1a1a2e]">{ROLE_LABELS[m.role] ?? m.role}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {canEdit && (
                      <button
                        onClick={() => remove(m.userId)}
                        disabled={pending}
                        title="Remove member"
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
