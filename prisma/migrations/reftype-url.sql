-- Reference sub-types are now url | website | document.
-- Rename the old "webpage" value to "url".
SET search_path TO "engagecampaign";

UPDATE "ContextItem" SET "refType" = 'url' WHERE "type" = 'reference' AND "refType" = 'webpage';
