# Contacts / CRM

The unified contact list for a campaign — donors, volunteers, supporters, and
(later) matched voters, all in one place. Part of the always-on platform core
(Starter tier); the home dashboard's **Contacts / CRM** tile links to `/contacts`.

Website volunteer signups flow in through a moderation queue (see
[Volunteer signups](#volunteer-signups)).

## Data model

All models live in the isolated `engagecampaign` Postgres schema (`@@schema`).
A `Contact` belongs to a `Campaign` (`onDelete: Cascade`).

| Model | Purpose | Key fields |
|-------|---------|-----------|
| `Contact` | The person | `firstName`* , `lastName`* , `types String[]`, `source` |
| `ContactEmail` | Labeled emails (many) | `label`* , `email`* , `order` |
| `ContactPhone` | Labeled phones (many) | `label`* , `phone`* , `order` |
| `ContactAddress` | Labeled addresses (many) | `label`* , `line1`* , `line2/city/state/zip`, `lat/lng/placeId`, `order` |
| `ContactNote` | Timestamped history (many) | `body`, `createdAt` |
| `Tag` | User-defined, campaign-scoped | `name` (unique per campaign) |
| `ContactTag` | Contact ↔ Tag join (m:n) | `contactId`, `tagId` |

\* required

Notes:

- **`types` is multi-valued.** A contact can be a supporter *and* a donor. Allowed
  values are the single source of truth in [`src/lib/contacts.ts`](../src/lib/contacts.ts)
  (`CONTACT_TYPES`: supporter, volunteer, donor, voter, prospect, other), validated
  server-side. Keep this constant in a plain module — **not** in a `"use server"`
  file, which may only export async functions.
- **`source`**: `manual` | `volunteer_signup` | `import`. The table/detail views show
  `volunteer_signup` as a "Website" badge.
- **Emails / phones / addresses each require a label** (e.g. Personal, Mobile, Home).
- **Tags are created on the fly**: typing a new tag name in the editor upserts a `Tag`
  for the campaign (`resolveTagIds`), then links it.
- **Addresses store `lat/lng/placeId`** when entered via Google Places (see below),
  for future mapping/turf work.

## Routes & files

| Path | File | What |
|------|------|------|
| `/contacts` | `src/app/contacts/page.tsx` → `components/contacts/ContactsManager.tsx` | List: search, type filter chips, add/edit modal, pending-signups banner |
| `/contacts/[contactId]` | `src/app/contacts/[contactId]/page.tsx` → `components/contacts/ContactDetail.tsx` | Detail: quick actions, contact info, addresses, notes; edit reuses the modal |
| `/contacts/signups` | `src/app/contacts/signups/page.tsx` → `components/contacts/SignupsReview.tsx` | Volunteer-signup review queue (accept / reject) |
| — | `src/app/contacts/layout.tsx` | Auth + campaign gate, `AppHeader` |
| — | `src/app/contacts/actions.ts` | `saveContact`, `deleteContact`, `addContactNote`, `deleteContactNote` |
| — | `src/app/contacts/signups/actions.ts` | `acceptSignup`, `rejectSignup`, `deleteSignup` |

Server actions are ownership-guarded (every query is scoped to the caller's
campaign) and `revalidatePath` both `/contacts` and the affected
`/contacts/[id]` so the list and detail page stay fresh.

## UI behavior

- **List** — the contact **name** links to the detail page; the row **pencil** opens
  the quick-edit modal. Search matches name, email, phone, address, and tags. Type
  chips filter by "has this type" and show per-type counts.
- **Add / Edit modal** (`ContactDialog`, exported from `ContactsManager` and reused on
  the detail page) — name, multi-select type chips, add/remove email & phone rows,
  add/remove labeled addresses (with autocomplete), tag chip-input, and a notes log.
- **Detail page** — header (name, types, tags, source); a quick-action bar
  (Email / Call / Text); per-method actions; addresses with an "Open in Google Maps"
  link; and an inline notes timeline.

### Quick actions are device-handoff links

Email / Call / Text use `mailto:` / `tel:` / `sms:` — they hand off to the device's
mail/phone/SMS app. Great on mobile; `sms:` is unreliable on desktop. True in-app
**P2P texting** (Twilio / vendor, tracked replies) is a separate, deferred integration.

## Address autocomplete (Google Places)

Street-address entry uses Google Places Autocomplete, with graceful fallback to plain
text when no key is configured.

- **Setup**: set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`, and enable **Maps
  JavaScript API** + **Places API** on that key's Google Cloud project. Restrict the
  key by HTTP referrer to your dev/prod origins (it's a browser-exposed key).
- **Files**: [`src/lib/googleMaps.ts`](../src/lib/googleMaps.ts) (singleton loader +
  `parsePlace`) and `components/contacts/AddressAutocomplete.tsx`.
- **No key?** The address fields still work as plain text inputs — no errors, just no
  suggestions.
- Uses the classic `google.maps.places.Autocomplete` widget (deprecated but
  functional; migrate to `PlaceAutocompleteElement` eventually).

## Volunteer signups

The public candidate-website volunteer form posts to `/api/website/volunteer`, which
writes a `VolunteerSignup` with `status = "pending"`. Rather than dropping raw,
unauthenticated (possibly spam) input straight into the CRM, signups sit in a
**moderation queue**:

- `/contacts/signups` lists them under Pending / Accepted / Rejected tabs; `/contacts`
  shows a banner when any are pending.
- **Accept** (`acceptSignup`) dedupes by email within the campaign: an existing contact
  gets the "volunteer" type, the phone (if new), and a note; otherwise a new `Contact`
  is created (`source: volunteer_signup`, `types: [volunteer]`, message → note). The
  signup is marked accepted and linked to the contact.
- **Reject** keeps the record for audit; **Delete** removes it.

So `Contact` holds only reviewed/approved people; `VolunteerSignup` is the intake buffer.

## Migrations

Applied via `npx prisma db execute --file prisma/migrations/<file>.sql` (no flags; the
datasource URL comes from `prisma.config.ts`). All are idempotent
(`CREATE TABLE IF NOT EXISTS`, guarded backfills).

- `add-contacts.sql` — initial `Contact`.
- `add-contact-details.sql` — split single email/phone/type/notes/tags into
  `ContactEmail`/`ContactPhone`/`ContactNote`/`Tag`/`ContactTag`; `types[]`;
  `lastName` made required.
- `add-contact-addresses.sql` — `ContactAddress`; migrate the single address into a
  "Home" row; drop the old address columns.
- `add-signup-review.sql` — `status`/`reviewedAt`/`contactId` on `VolunteerSignup`.
