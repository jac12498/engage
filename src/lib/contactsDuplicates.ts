import "server-only"
import { prisma } from "@/lib/prisma"
import { canonicalizeEmail } from "@/lib/emailNormalize"

/**
 * Duplicate-contact detection for the "Review duplicates" page.
 *
 * Two contacts are linked when they share a normalized email or phone (strong),
 * or have the same last name + a similar first name (nickname/prefix/typo). Linked
 * contacts are grouped by connected components. Pairs the user marked "not a
 * duplicate" (ContactMergeDismissal) are never linked directly.
 */

export interface DupContact {
  id: string
  firstName: string
  lastName: string
  emails: string[]
  phones: string[]
  address: string | null
  tags: string[]
  noteCount: number
  donationCount: number
  createdAt: string
}

export interface DuplicateGroup {
  /** Stable id for the group (sorted member ids). */
  key: string
  contacts: DupContact[]
}

/** Digits-only phone key (drops a leading US "1"); null when too short to trust. */
function phoneKey(raw: string): string | null {
  const digits = raw.replace(/\D/g, "")
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits
  return local.length >= 10 ? local : null
}

const normName = (s: string) => s.trim().toLowerCase().replace(/[^a-z]/g, "")

/** Levenshtein distance capped at 2 (returns 3 for anything larger). */
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = tmp
    }
  }
  return dp[b.length]
}

/** Similar first names: equal, one a prefix of the other (≥3), or edit distance ≤1. */
function similarFirst(a: string, b: string): boolean {
  if (!a || !b) return a === b // both empty first names + same last → treat as similar
  if (a === b) return true
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  if (short.length >= 3 && long.startsWith(short)) return true
  if (Math.min(a.length, b.length) >= 3 && editDistance(a, b) <= 1) return true
  return false
}

class UnionFind {
  private parent = new Map<string, string>()
  find(x: string): string {
    let r = this.parent.get(x) ?? x
    if (r !== x) {
      r = this.find(r)
      this.parent.set(x, r)
    }
    return r
  }
  union(a: string, b: string) {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(ra, rb)
  }
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

/** Detect clusters of likely-duplicate contact ids (each cluster has ≥2 members). */
export async function detectDuplicateClusters(committeeId: string): Promise<string[][]> {
  const [contacts, dismissals] = await Promise.all([
    prisma.contact.findMany({
      where: { committeeId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        emails: { select: { email: true } },
        phones: { select: { phone: true } },
      },
    }),
    prisma.contactMergeDismissal.findMany({ where: { committeeId }, select: { aId: true, bId: true } }),
  ])
  if (contacts.length < 2) return []

  const dismissed = new Set(dismissals.map((d) => pairKey(d.aId, d.bId)))
  const uf = new UnionFind()
  for (const c of contacts) uf.find(c.id) // seed

  const link = (a: string, b: string) => {
    if (a === b) return
    if (dismissed.has(pairKey(a, b))) return
    uf.union(a, b)
  }

  // Shared email / phone.
  const byEmail = new Map<string, string[]>()
  const byPhone = new Map<string, string[]>()
  const byLast = new Map<string, { id: string; first: string }[]>()
  for (const c of contacts) {
    for (const e of c.emails) {
      const k = canonicalizeEmail(e.email)
      if (!k) continue
      ;(byEmail.get(k) ?? byEmail.set(k, []).get(k)!).push(c.id)
    }
    for (const p of c.phones) {
      const k = phoneKey(p.phone)
      if (!k) continue
      ;(byPhone.get(k) ?? byPhone.set(k, []).get(k)!).push(c.id)
    }
    const last = normName(c.lastName)
    if (last) (byLast.get(last) ?? byLast.set(last, []).get(last)!).push({ id: c.id, first: normName(c.firstName) })
  }
  for (const ids of byEmail.values()) for (let i = 1; i < ids.length; i++) link(ids[0], ids[i])
  for (const ids of byPhone.values()) for (let i = 1; i < ids.length; i++) link(ids[0], ids[i])

  // Same last name + similar first name (skip pathologically large last-name buckets).
  for (const people of byLast.values()) {
    if (people.length < 2 || people.length > 60) continue
    for (let i = 0; i < people.length; i++)
      for (let j = i + 1; j < people.length; j++)
        if (similarFirst(people[i].first, people[j].first)) link(people[i].id, people[j].id)
  }

  const groups = new Map<string, string[]>()
  for (const c of contacts) {
    const root = uf.find(c.id)
    ;(groups.get(root) ?? groups.set(root, []).get(root)!).push(c.id)
  }
  return [...groups.values()].filter((g) => g.length >= 2)
}

/** Full duplicate groups with the display detail the review UI shows. */
export async function loadDuplicateGroups(committeeId: string): Promise<DuplicateGroup[]> {
  const clusters = await detectDuplicateClusters(committeeId)
  if (clusters.length === 0) return []
  const ids = clusters.flat()

  const rows = await prisma.contact.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      types: true,
      createdAt: true,
      emails: { orderBy: { order: "asc" }, select: { email: true } },
      phones: { orderBy: { order: "asc" }, select: { phone: true } },
      addresses: { orderBy: { order: "asc" }, take: 1, select: { line1: true, city: true, state: true, zip: true } },
      _count: { select: { contactNotes: true, donations: true } },
    },
  })
  const byId = new Map(
    rows.map((c) => {
      const a = c.addresses[0]
      const address = a
        ? [a.line1, [a.city, a.state].filter(Boolean).join(", "), a.zip].filter(Boolean).join(" · ")
        : null
      const dup: DupContact = {
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        emails: c.emails.map((e) => e.email),
        phones: c.phones.map((p) => p.phone),
        address,
        tags: c.types,
        noteCount: c._count.contactNotes,
        donationCount: c._count.donations,
        createdAt: c.createdAt.toISOString(),
      }
      return [c.id, dup]
    }),
  )

  return clusters
    .map((cluster) => {
      const contacts = cluster.map((id) => byId.get(id)).filter((c): c is DupContact => !!c)
      contacts.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      return { key: [...cluster].sort().join(","), contacts }
    })
    .filter((g) => g.contacts.length >= 2)
    .sort((a, b) => b.contacts.length - a.contacts.length)
}
