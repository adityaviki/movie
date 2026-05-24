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
CREATE TABLE "Movie" (
	"id" text PRIMARY KEY NOT NULL,
	"imdbId" text,
	"title" text NOT NULL,
	"year" integer,
	"type" text,
	"rating" double precision,
	"votes" integer,
	"genres" text[] DEFAULT '{}' NOT NULL,
	"runtime" text,
	"certificate" text,
	"description" text,
	"posterUrl" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "Movie_imdbId_unique" UNIQUE("imdbId")
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
CREATE TABLE "SavedView" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"params" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserMovie" (
	"userId" text NOT NULL,
	"movieId" text NOT NULL,
	"inWatchlist" boolean DEFAULT false NOT NULL,
	"watched" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "UserMovie_userId_movieId_pk" PRIMARY KEY("userId","movieId")
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"passwordHash" text NOT NULL,
	"name" text,
	"defaultView" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "User_email_unique" UNIQUE("email"),
	CONSTRAINT "User_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "MovieCredit" ADD CONSTRAINT "MovieCredit_movieId_Movie_id_fk" FOREIGN KEY ("movieId") REFERENCES "public"."Movie"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "MovieCredit" ADD CONSTRAINT "MovieCredit_personId_Person_id_fk" FOREIGN KEY ("personId") REFERENCES "public"."Person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserMovie" ADD CONSTRAINT "UserMovie_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserMovie" ADD CONSTRAINT "UserMovie_movieId_Movie_id_fk" FOREIGN KEY ("movieId") REFERENCES "public"."Movie"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "MovieCredit_movieId_idx" ON "MovieCredit" USING btree ("movieId");--> statement-breakpoint
CREATE INDEX "MovieCredit_personId_idx" ON "MovieCredit" USING btree ("personId");