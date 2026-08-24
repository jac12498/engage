"use client"

import { useMemo } from "react"
import { Plus, X, Trash2 } from "lucide-react"
import {
  FIELDS,
  FIELD_BY_KEY,
  OPERATORS,
  newGroup,
  newCondition,
  defaultOpFor,
  type SearchQuery,
  type Group,
  type Condition,
  type FieldKey,
  type Operator,
} from "@/lib/contactsSearch"

const ctrl =
  "rounded-md border border-border bg-white px-2 py-1.5 text-sm text-[#1a1a2e] outline-none transition-colors focus:border-[#1b3a6b]"

export function ContactSearchBuilder({
  query,
  onChange,
  tagOptions = [],
}: {
  query: SearchQuery
  onChange: (q: SearchQuery) => void
  /** Choices for the "tags" field (committee tags), injected at render. */
  tagOptions?: { value: string; label: string }[]
}) {
  // Field <select> options grouped by their section.
  const fieldGroups = useMemo(() => {
    const m = new Map<string, typeof FIELDS>()
    for (const f of FIELDS) (m.get(f.group) ?? m.set(f.group, []).get(f.group)!).push(f)
    return [...m.entries()]
  }, [])

  const groups = query.length ? query : [newGroup()]

  function setGroups(next: Group[]) {
    onChange(next)
  }
  function updateCondition(gi: number, ci: number, patch: Partial<Condition>) {
    setGroups(groups.map((g, i) => (i !== gi ? g : { ...g, conditions: g.conditions.map((c, j) => (j === ci ? { ...c, ...patch } : c)) })))
  }
  function changeField(gi: number, ci: number, field: FieldKey) {
    // Reset operator + value when the field's category may have changed.
    updateCondition(gi, ci, { field, op: defaultOpFor(field), value: FIELD_BY_KEY[field].category === "boolean" ? "yes" : "", value2: "", values: [] })
  }
  function addCondition(gi: number) {
    setGroups(groups.map((g, i) => (i !== gi ? g : { ...g, conditions: [...g.conditions, newCondition()] })))
  }
  function removeCondition(gi: number, ci: number) {
    setGroups(
      groups
        .map((g, i) => (i !== gi ? g : { ...g, conditions: g.conditions.filter((_, j) => j !== ci) }))
        .filter((g) => g.conditions.length > 0),
    )
  }
  function addGroup() {
    setGroups([...groups, newGroup()])
  }
  function removeGroup(gi: number) {
    const next = groups.filter((_, i) => i !== gi)
    setGroups(next.length ? next : [])
  }

  return (
    <div className="space-y-3">
      {groups.map((g, gi) => (
        <div key={g.id}>
          {gi > 0 && (
            <div className="my-2 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                or
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}
          <div className="rounded-xl border border-border bg-white p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {g.conditions.length > 1 ? "All of these" : "Where"}
              </span>
              {groups.length > 1 && (
                <button
                  onClick={() => removeGroup(gi)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove group"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-2">
              {g.conditions.map((cond, ci) => {
                const def = FIELD_BY_KEY[cond.field]
                return (
                  <div key={cond.id} className="flex flex-wrap items-start gap-2">
                    <select value={cond.field} onChange={(e) => changeField(gi, ci, e.target.value as FieldKey)} className={`${ctrl} w-40`}>
                      {fieldGroups.map(([group, fields]) => (
                        <optgroup key={group} label={group}>
                          {fields.map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>

                    <select value={cond.op} onChange={(e) => updateCondition(gi, ci, { op: e.target.value as Operator })} className={`${ctrl} w-40`}>
                      {OPERATORS[def.category].map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>

                    <ValueInput
                      cond={cond}
                      tagOptions={tagOptions}
                      onChange={(patch) => updateCondition(gi, ci, patch)}
                    />

                    <button
                      onClick={() => removeCondition(gi, ci)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove condition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>

            <button
              onClick={() => addCondition(gi)}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#1b3a6b] hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              Add condition
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={addGroup}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-sm font-medium text-[#1b3a6b] transition-colors hover:bg-muted"
      >
        <Plus className="h-4 w-4" />
        Add &ldquo;OR&rdquo; group
      </button>
    </div>
  )
}

function ValueInput({
  cond,
  tagOptions,
  onChange,
}: {
  cond: Condition
  tagOptions: { value: string; label: string }[]
  onChange: (patch: Partial<Condition>) => void
}) {
  const def = FIELD_BY_KEY[cond.field]
  const opDef = OPERATORS[def.category].find((o) => o.value === cond.op)
  if (opDef?.valueless) return null

  if (def.category === "boolean") {
    return (
      <select value={cond.value || "yes"} onChange={(e) => onChange({ value: e.target.value })} className={`${ctrl} w-24`}>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    )
  }

  if (def.category === "date") {
    return (
      <div className="flex items-center gap-1.5">
        <input type="date" value={cond.value} onChange={(e) => onChange({ value: e.target.value })} className={ctrl} />
        {cond.op === "between" && (
          <>
            <span className="text-sm text-muted-foreground">and</span>
            <input type="date" value={cond.value2 ?? ""} onChange={(e) => onChange({ value2: e.target.value })} className={ctrl} />
          </>
        )}
      </div>
    )
  }

  if (def.category === "multiSelect") {
    const selected = cond.values ?? []
    const options = cond.field === "tags" ? tagOptions : def.options ?? []
    const toggle = (v: string) =>
      onChange({ values: selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v] })
    return (
      <div className="flex flex-wrap gap-1">
        {options.map((o) => {
          const active = selected.includes(o.value)
          return (
            <button
              key={o.value}
              onClick={() => toggle(o.value)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                active ? "border-[#1b3a6b] bg-[#1b3a6b] text-white" : "border-border bg-white text-muted-foreground hover:border-[#1b3a6b]/40"
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    )
  }

  // text
  return (
    <input
      value={cond.value}
      onChange={(e) => onChange({ value: e.target.value })}
      placeholder="value…"
      className={`${ctrl} min-w-[8rem] flex-1`}
    />
  )
}
