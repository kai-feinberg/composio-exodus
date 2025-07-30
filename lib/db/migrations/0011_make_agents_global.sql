-- Update all existing agents to be global
UPDATE "Agent" SET "isGlobal" = true WHERE "isGlobal" = false;