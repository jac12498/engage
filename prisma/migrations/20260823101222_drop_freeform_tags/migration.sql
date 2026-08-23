-- DropForeignKey
ALTER TABLE "ContactTag" DROP CONSTRAINT "ContactTag_contactId_fkey";

-- DropForeignKey
ALTER TABLE "ContactTag" DROP CONSTRAINT "ContactTag_tagId_fkey";

-- DropForeignKey
ALTER TABLE "Tag" DROP CONSTRAINT "Tag_committeeId_fkey";

-- DropTable
DROP TABLE "ContactTag";

-- DropTable
DROP TABLE "Tag";
