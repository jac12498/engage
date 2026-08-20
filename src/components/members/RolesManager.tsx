"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, Shield, X } from "lucide-react"
import { PERMISSION_MODULES, CRUD, MODULE_LABELS, type CrudAction } from "@/lib/permissions"
import { createRole, updateRole, deleteRole } from "@/app/members/roles-actions"

export interface RoleRow {
  id: string
  label: string
  description: string | null
  isBuiltIn: boolean
  permissionKeys: string[]
  memberCount: number
}

const ACTION_LABELS: Record<CrudAction, string> = {
  create: "Create",
  read: "View",
  update: "Edit",
  delete: "Delete",
}

/** Module labels a role can at least view — for the compact summary line. */
function accessSummary(permissionKeys: string[]): string {
  const readable = PERMISSION_MODULES.filter((m) => permissionKeys.includes(`${m}:read`))
  if (readable.length === 0) return "No module access"
  if (readable.length === PERMISSION_MODULES.length) return "All modules"
  return readable.map((m) => MODULE_LABELS[m]).join(", ")
}

export function RolesManager({ roles }: { roles: RoleRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  // null = closed; "new" = creating; otherwise the custom role id being edited.
  const [editing, setEditing] = useState<string | null>(null)

  const builtins = roles.filter((r) => r.isBuiltIn)
  const customs = roles.filter((r) => !r.isBuiltIn)

  function del(id: string) {
    setError(null)
    startTransition(async () => {
      const res = await deleteRole(id)
      if (!res.ok) setError(res.error)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#1a1a2e]">Roles</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Built-in roles cover the common cases. Create a custom role to limit someone to specific modules.
          </p>
        </div>
        {editing !== "new" && (
          <button
            onClick={() => { setEditing("new"); setError(null) }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#1b3a6b] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#122850]"
          >
            <Plus className="h-4 w-4" />
            New role
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
      )}

      {editing === "new" && (
        <RoleEditor onClose={() => setEditing(null)} />
      )}

      {/* Custom roles */}
      {customs.map((r) =>
        editing === r.id ? (
          <RoleEditor key={r.id} role={r} onClose={() => setEditing(null)} />
        ) : (
          <div key={r.id} className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-[#1a1a2e]">{r.label}</h3>
                {r.description && <p className="mt-0.5 text-sm text-muted-foreground">{r.description}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {accessSummary(r.permissionKeys)} · {r.memberCount} member{r.memberCount === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => { setEditing(r.id); setError(null) }}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#1b3a6b] transition-colors hover:bg-muted"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={() => del(r.id)}
                  disabled={pending}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          </div>
        ),
      )}

      {/* Built-in roles (read-only) */}
      <div className="rounded-2xl border border-border bg-muted/30 p-5">
        <div className="space-y-3">
          {builtins.map((r) => (
            <div key={r.id} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1b3a6b]/8 text-[#1b3a6b]">
                <Shield className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1a1a2e]">
                  {r.label} <span className="ml-1 text-xs font-normal text-muted-foreground">· built-in</span>
                </p>
                {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RoleEditor({ role, onClose }: { role?: RoleRow; onClose: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState(role?.label ?? "")
  const [description, setDescription] = useState(role?.description ?? "")
  const [perms, setPerms] = useState<Set<string>>(new Set(role?.permissionKeys ?? []))
  const [error, setError] = useState<string | null>(null)

  const has = (key: string) => perms.has(key)
  function toggle(key: string) {
    setPerms((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  function toggleModuleRow(m: string, on: boolean) {
    setPerms((prev) => {
      const next = new Set(prev)
      for (const a of CRUD) {
        const k = `${m}:${a}`
        if (on) next.add(k)
        else next.delete(k)
      }
      return next
    })
  }

  // Any create/edit/delete on a module implies view — otherwise it'd be hidden.
  const finalPerms = useMemo(() => {
    const out = new Set(perms)
    for (const m of PERMISSION_MODULES) {
      if (CRUD.some((a) => a !== "read" && out.has(`${m}:${a}`))) out.add(`${m}:read`)
    }
    return [...out]
  }, [perms])

  function save() {
    setError(null)
    startTransition(async () => {
      const res = role
        ? await updateRole({ id: role.id, name, description, permissions: finalPerms })
        : await createRole({ name, description, permissions: finalPerms })
      if (!res.ok) return setError(res.error)
      onClose()
      router.refresh()
    })
  }

  return (
    <div className="rounded-2xl border border-[#1b3a6b]/30 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#1a1a2e]">{role ? "Edit role" : "New role"}</h3>
        <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Role name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Website Team"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-[#1b3a6b]"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Description (optional)</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this role is for"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-[#1b3a6b]"
          />
        </label>
      </div>

      <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Privileges</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pr-3 font-semibold">Module</th>
              {CRUD.map((a) => (
                <th key={a} className="px-2 py-2 text-center font-semibold">
                  {ACTION_LABELS[a]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_MODULES.map((m) => {
              const allOn = CRUD.every((a) => has(`${m}:${a}`))
              return (
                <tr key={m} className="border-t border-border">
                  <td className="py-2 pr-3">
                    <button
                      type="button"
                      onClick={() => toggleModuleRow(m, !allOn)}
                      className="text-left font-medium text-[#1a1a2e] hover:text-[#1b3a6b]"
                      title={allOn ? "Clear all" : "Select all"}
                    >
                      {MODULE_LABELS[m]}
                    </button>
                  </td>
                  {CRUD.map((a) => (
                    <td key={a} className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={has(`${m}:${a}`)}
                        onChange={() => toggle(`${m}:${a}`)}
                        className="h-4 w-4 accent-[#1b3a6b]"
                      />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Selecting Create, Edit, or Delete automatically grants View for that module.
      </p>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-[#1a1a2e] hover:bg-muted">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={pending || !name.trim()}
          className="rounded-lg bg-[#1b3a6b] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#122850] disabled:opacity-50"
        >
          {role ? "Save changes" : "Create role"}
        </button>
      </div>
    </div>
  )
}
