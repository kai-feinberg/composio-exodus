-- Drop all foreign key constraints that reference User.id
DO $$ BEGIN
 ALTER TABLE "Agent" DROP CONSTRAINT IF EXISTS "Agent_userId_User_id_fk";
EXCEPTION
 WHEN undefined_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "Chat" DROP CONSTRAINT IF EXISTS "Chat_userId_User_id_fk";
EXCEPTION
 WHEN undefined_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "Document" DROP CONSTRAINT IF EXISTS "Document_userId_User_id_fk";
EXCEPTION
 WHEN undefined_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "Suggestion" DROP CONSTRAINT IF EXISTS "Suggestion_userId_User_id_fk";
EXCEPTION
 WHEN undefined_object THEN null;
END $$;--> statement-breakpoint

-- Change User.id column type and remove default
ALTER TABLE "User" ALTER COLUMN "id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "User" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint

-- Change all userId columns to varchar
ALTER TABLE "Agent" ALTER COLUMN "userId" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "Chat" ALTER COLUMN "userId" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "Document" ALTER COLUMN "userId" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "Suggestion" ALTER COLUMN "userId" SET DATA TYPE varchar(255);--> statement-breakpoint

-- Re-add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "Agent" ADD CONSTRAINT "Agent_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;