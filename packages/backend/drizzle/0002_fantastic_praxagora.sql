ALTER TABLE "User" ADD COLUMN "username" text NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD CONSTRAINT "User_username_unique" UNIQUE("username");