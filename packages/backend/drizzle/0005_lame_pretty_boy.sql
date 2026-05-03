ALTER TABLE "User" ADD COLUMN "defaultView" text;--> statement-breakpoint
UPDATE "User" u SET "defaultView" = (SELECT s.id FROM "SavedView" s WHERE s."userId" = u.id AND s."isDefault" = true LIMIT 1);--> statement-breakpoint
ALTER TABLE "SavedView" DROP COLUMN "isDefault";
