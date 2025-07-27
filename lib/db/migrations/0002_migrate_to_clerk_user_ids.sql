-- Migration to change user IDs from UUID to VARCHAR for Clerk compatibility

-- First, we need to create a temporary table to store the new data
CREATE TABLE "User_new" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "email" varchar(64) NOT NULL,
  "password" varchar(64)
);

-- Create new tables with updated foreign key references
CREATE TABLE "Chat_new" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp NOT NULL,
  "title" text NOT NULL,
  "userId" varchar(255) NOT NULL REFERENCES "User_new"("id"),
  "visibility" varchar DEFAULT 'private' NOT NULL
);

CREATE TABLE "Document_new" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp NOT NULL,
  "title" text NOT NULL,
  "content" text,
  "text" varchar DEFAULT 'text' NOT NULL,
  "userId" varchar(255) NOT NULL REFERENCES "User_new"("id"),
  PRIMARY KEY ("id", "createdAt")
);

CREATE TABLE "Agent_new" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" text,
  "systemPrompt" text NOT NULL,
  "modelId" varchar(50) DEFAULT 'chat-model' NOT NULL,
  "userId" varchar(255) NOT NULL REFERENCES "User_new"("id"),
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- Note: In a real migration, you would need to handle data transfer
-- For this migration, we'll assume starting fresh with Clerk users
-- If you have existing data, you would need additional steps to migrate it

-- Drop old tables (be careful in production!)
DROP TABLE IF EXISTS "Agent" CASCADE;
DROP TABLE IF EXISTS "Document" CASCADE;
DROP TABLE IF EXISTS "Chat" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- Rename new tables to original names
ALTER TABLE "User_new" RENAME TO "User";
ALTER TABLE "Chat_new" RENAME TO "Chat";
ALTER TABLE "Document_new" RENAME TO "Document";
ALTER TABLE "Agent_new" RENAME TO "Agent";