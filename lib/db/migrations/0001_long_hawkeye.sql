CREATE TABLE IF NOT EXISTS "AgentTools" (
	"agentId" uuid NOT NULL,
	"toolSlug" varchar(100) NOT NULL,
	"isEnabled" boolean DEFAULT true NOT NULL,
	"enabledAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "AgentTools_agentId_toolSlug_pk" PRIMARY KEY("agentId","toolSlug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "AvailableTools" (
	"slug" varchar(100) PRIMARY KEY NOT NULL,
	"toolkitSlug" varchar(100) NOT NULL,
	"toolkitName" varchar(100) NOT NULL,
	"displayName" varchar(200),
	"description" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "UserTools" (
	"userId" varchar(255) NOT NULL,
	"toolSlug" varchar(100) NOT NULL,
	"isEnabled" boolean DEFAULT true NOT NULL,
	"enabledAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "UserTools_userId_toolSlug_pk" PRIMARY KEY("userId","toolSlug")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AgentTools" ADD CONSTRAINT "AgentTools_agentId_Agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."Agent"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AgentTools" ADD CONSTRAINT "AgentTools_toolSlug_AvailableTools_slug_fk" FOREIGN KEY ("toolSlug") REFERENCES "public"."AvailableTools"("slug") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserTools" ADD CONSTRAINT "UserTools_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserTools" ADD CONSTRAINT "UserTools_toolSlug_AvailableTools_slug_fk" FOREIGN KEY ("toolSlug") REFERENCES "public"."AvailableTools"("slug") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
