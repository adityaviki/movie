CREATE TABLE "MovieCredit" (
	"movieId" text NOT NULL,
	"personId" text NOT NULL,
	"category" text NOT NULL,
	"ordering" integer NOT NULL,
	"job" text,
	"characters" text[],
	CONSTRAINT "MovieCredit_movieId_personId_category_ordering_pk" PRIMARY KEY("movieId","personId","category","ordering")
);
--> statement-breakpoint
CREATE TABLE "Person" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"birthYear" integer,
	"deathYear" integer,
	"professions" text[] DEFAULT '{}' NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "MovieCredit" ADD CONSTRAINT "MovieCredit_movieId_Movie_id_fk" FOREIGN KEY ("movieId") REFERENCES "public"."Movie"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "MovieCredit" ADD CONSTRAINT "MovieCredit_personId_Person_id_fk" FOREIGN KEY ("personId") REFERENCES "public"."Person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "MovieCredit_movieId_idx" ON "MovieCredit" USING btree ("movieId");--> statement-breakpoint
CREATE INDEX "MovieCredit_personId_idx" ON "MovieCredit" USING btree ("personId");