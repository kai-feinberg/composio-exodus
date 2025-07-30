ALTER TABLE "Agent" ALTER COLUMN "userId" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "Chat" ALTER COLUMN "userId" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "User" ALTER COLUMN "id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "User" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "Agent" ADD COLUMN "organizationId" varchar(255);--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "organizationId" varchar(255);--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "organizationId" varchar(255);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "organizationId" varchar(255);