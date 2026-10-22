-- RBAC — privileges (per-module CRUD) → roles → memberships, plus the global
-- System Administrator flag. Purely additive + backfilled, so already-running
-- code keeps working: it ignores the new tables and the nullable roleTypeId,
-- and permission resolution falls back to the legacy `role` string until seeded.
--
-- Mirrors src/lib/permissions.ts (keep the module/action/admin lists in sync).
-- Applied via `prisma db execute` into the isolated `engagecampaign` schema. Idempotent.
SET search_path TO "engagecampaign";

-- ── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Permission" (
    "id"     TEXT NOT NULL,
    "key"    TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Permission_key_key" ON "Permission"("key");

CREATE TABLE IF NOT EXISTS "RoleType" (
    "id"          TEXT NOT NULL,
    "key"         TEXT NOT NULL,
    "label"       TEXT NOT NULL,
    "description" TEXT,
    "isBuiltIn"   BOOLEAN NOT NULL DEFAULT false,
    "committeeId" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoleType_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RoleType_committeeId_fkey" FOREIGN KEY ("committeeId")
        REFERENCES "Committee"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "RoleType_committeeId_idx" ON "RoleType"("committeeId");
CREATE UNIQUE INDEX IF NOT EXISTS "RoleType_committeeId_key_key" ON "RoleType"("committeeId", "key");

CREATE TABLE IF NOT EXISTS "RolePermission" (
    "roleTypeId"   TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleTypeId", "permissionId"),
    CONSTRAINT "RolePermission_roleTypeId_fkey" FOREIGN KEY ("roleTypeId")
        REFERENCES "RoleType"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId")
        REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

ALTER TABLE "CommitteeMembership" ADD COLUMN IF NOT EXISTS "roleTypeId" TEXT;
DO $$ BEGIN
    ALTER TABLE "CommitteeMembership" ADD CONSTRAINT "CommitteeMembership_roleTypeId_fkey"
        FOREIGN KEY ("roleTypeId") REFERENCES "RoleType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "CommitteeMembership_roleTypeId_idx" ON "CommitteeMembership"("roleTypeId");

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSystemAdmin" BOOLEAN NOT NULL DEFAULT false;

-- ── Seed permissions (modules × CRUD, + admin/domain) ────────────────────────

INSERT INTO "Permission" ("id", "key", "module", "action")
SELECT 'perm_' || m.module || '_' || a.action, m.module || ':' || a.action, m.module, a.action
FROM (VALUES
    ('ai-communications'), ('candidate-websites'), ('newsletter'), ('contacts'),
    ('voters'), ('voter-outreach'), ('field-tools'), ('fundraising'), ('multi-candidate')
) AS m(module)
CROSS JOIN (VALUES ('create'), ('read'), ('update'), ('delete')) AS a(action)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "Permission" ("id", "key", "module", "action")
SELECT 'perm_' || replace(k, ':', '_'), k, split_part(k, ':', 1), split_part(k, ':', 2)
FROM (VALUES ('members:manage'), ('roles:manage'), ('billing:manage'), ('campaigns:manage')) AS x(k)
ON CONFLICT ("key") DO NOTHING;

-- ── Seed built-in roles (global; committeeId null) ───────────────────────────

INSERT INTO "RoleType" ("id", "key", "label", "description", "isBuiltIn", "committeeId", "createdAt", "updatedAt")
VALUES
    ('role_committee_admin', 'committee_admin', 'Committee Administrator',
     'Full control of the committee, its members, and every module.', true, NULL, now(), now()),
    ('role_member', 'member', 'Member',
     'Create and edit across all modules; no member, billing, or role management.', true, NULL, now(), now()),
    ('role_viewer', 'viewer', 'Viewer',
     'Read-only access to all modules.', true, NULL, now(), now())
ON CONFLICT ("id") DO NOTHING;

-- committee_admin → every permission
INSERT INTO "RolePermission" ("roleTypeId", "permissionId")
SELECT 'role_committee_admin', p."id" FROM "Permission" p
ON CONFLICT DO NOTHING;

-- member → all module CRUD (no admin 'manage' permissions)
INSERT INTO "RolePermission" ("roleTypeId", "permissionId")
SELECT 'role_member', p."id" FROM "Permission" p WHERE p."action" IN ('create', 'read', 'update', 'delete')
ON CONFLICT DO NOTHING;

-- viewer → all module read
INSERT INTO "RolePermission" ("roleTypeId", "permissionId")
SELECT 'role_viewer', p."id" FROM "Permission" p WHERE p."action" = 'read'
ON CONFLICT DO NOTHING;

-- ── Backfill memberships onto RoleTypes ──────────────────────────────────────

UPDATE "CommitteeMembership" SET "roleTypeId" =
    CASE
        WHEN "role" IN ('owner', 'admin') THEN 'role_committee_admin'
        WHEN "role" = 'editor'            THEN 'role_member'
        WHEN "role" = 'viewer'            THEN 'role_viewer'
        ELSE 'role_member'
    END
WHERE "roleTypeId" IS NULL;

-- ── Seed the Overall System Administrator ────────────────────────────────────

UPDATE "User" SET "isSystemAdmin" = true WHERE lower("email") = 'admin@example.com';
