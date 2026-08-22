-- Contacts v2: multiple labeled emails/phones, multiple timestamped notes,
-- user-defined tags (m:n), and multi-type contacts. Migrates data out of the
-- old single-value columns, then drops them. Applied via `prisma db execute`.
-- Backfills are guarded on the old columns still existing so the file is
-- safe to re-run.
SET search_path TO "engagecampaign";

-- ── New child tables ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ContactEmail" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ContactEmail_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ContactEmail_contactId_fkey" FOREIGN KEY ("contactId")
        REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ContactEmail_contactId_idx" ON "ContactEmail"("contactId");

CREATE TABLE IF NOT EXISTS "ContactPhone" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ContactPhone_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ContactPhone_contactId_fkey" FOREIGN KEY ("contactId")
        REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ContactPhone_contactId_idx" ON "ContactPhone"("contactId");

CREATE TABLE IF NOT EXISTS "ContactNote" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContactNote_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ContactNote_contactId_fkey" FOREIGN KEY ("contactId")
        REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ContactNote_contactId_idx" ON "ContactNote"("contactId");

CREATE TABLE IF NOT EXISTS "Tag" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Tag_campaignId_fkey" FOREIGN KEY ("campaignId")
        REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Tag_campaignId_name_key" ON "Tag"("campaignId", "name");
CREATE INDEX IF NOT EXISTS "Tag_campaignId_idx" ON "Tag"("campaignId");

CREATE TABLE IF NOT EXISTS "ContactTag" (
    "contactId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "ContactTag_pkey" PRIMARY KEY ("contactId", "tagId"),
    CONSTRAINT "ContactTag_contactId_fkey" FOREIGN KEY ("contactId")
        REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContactTag_tagId_fkey" FOREIGN KEY ("tagId")
        REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ContactTag_tagId_idx" ON "ContactTag"("tagId");

-- ── New multi-type column ────────────────────────────────────────────────────
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- ── Data migration out of the old single-value columns (guarded) ─────────────
DO $$
BEGIN
  -- type -> types[]
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='engagecampaign' AND table_name='Contact' AND column_name='type') THEN
    UPDATE "Contact"
       SET "types" = ARRAY["type"]
     WHERE "type" IS NOT NULL AND "type" <> ''
       AND (array_length("types", 1) IS NULL);
  END IF;

  -- email -> ContactEmail (label 'Primary')
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='engagecampaign' AND table_name='Contact' AND column_name='email') THEN
    INSERT INTO "ContactEmail" ("id", "contactId", "label", "email", "order")
    SELECT gen_random_uuid()::text, c."id", 'Primary', c."email", 0
      FROM "Contact" c
     WHERE c."email" IS NOT NULL AND c."email" <> ''
       AND NOT EXISTS (SELECT 1 FROM "ContactEmail" e WHERE e."contactId" = c."id");
  END IF;

  -- phone -> ContactPhone (label 'Primary')
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='engagecampaign' AND table_name='Contact' AND column_name='phone') THEN
    INSERT INTO "ContactPhone" ("id", "contactId", "label", "phone", "order")
    SELECT gen_random_uuid()::text, c."id", 'Primary', c."phone", 0
      FROM "Contact" c
     WHERE c."phone" IS NOT NULL AND c."phone" <> ''
       AND NOT EXISTS (SELECT 1 FROM "ContactPhone" p WHERE p."contactId" = c."id");
  END IF;

  -- notes -> ContactNote
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='engagecampaign' AND table_name='Contact' AND column_name='notes') THEN
    INSERT INTO "ContactNote" ("id", "contactId", "body", "createdAt")
    SELECT gen_random_uuid()::text, c."id", c."notes", CURRENT_TIMESTAMP
      FROM "Contact" c
     WHERE c."notes" IS NOT NULL AND c."notes" <> ''
       AND NOT EXISTS (SELECT 1 FROM "ContactNote" n WHERE n."contactId" = c."id");
  END IF;

  -- tags[] -> Tag + ContactTag
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='engagecampaign' AND table_name='Contact' AND column_name='tags') THEN
    INSERT INTO "Tag" ("id", "campaignId", "name")
    SELECT gen_random_uuid()::text, x."campaignId", x.name
      FROM (SELECT DISTINCT c."campaignId", trim(t.name) AS name
              FROM "Contact" c
              JOIN LATERAL unnest(c."tags") AS t(name) ON true
             WHERE trim(t.name) <> '') x
    ON CONFLICT ("campaignId", "name") DO NOTHING;

    INSERT INTO "ContactTag" ("contactId", "tagId")
    SELECT c."id", tg."id"
      FROM "Contact" c
      JOIN LATERAL unnest(c."tags") AS t(name) ON true
      JOIN "Tag" tg ON tg."campaignId" = c."campaignId" AND tg."name" = trim(t.name)
     WHERE trim(t.name) <> ''
    ON CONFLICT DO NOTHING;
  END IF;

  -- lastName: backfill nulls, then make required
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='engagecampaign' AND table_name='Contact'
               AND column_name='lastName' AND is_nullable='YES') THEN
    UPDATE "Contact" SET "lastName" = '' WHERE "lastName" IS NULL;
    ALTER TABLE "Contact" ALTER COLUMN "lastName" SET NOT NULL;
  END IF;
END $$;

-- ── Drop the retired single-value columns ────────────────────────────────────
ALTER TABLE "Contact" DROP COLUMN IF EXISTS "email";
ALTER TABLE "Contact" DROP COLUMN IF EXISTS "phone";
ALTER TABLE "Contact" DROP COLUMN IF EXISTS "type";
ALTER TABLE "Contact" DROP COLUMN IF EXISTS "notes";
ALTER TABLE "Contact" DROP COLUMN IF EXISTS "tags";
