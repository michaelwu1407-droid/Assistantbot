UPDATE "Workspace"
SET "agentMode" = 'EXECUTION'
WHERE "agentMode" = 'EXECUTE';

UPDATE "Workspace"
SET "agentMode" = 'DRAFT'
WHERE "agentMode" = 'ORGANIZE';

UPDATE "Workspace"
SET "agentMode" = 'INFO_ONLY'
WHERE "agentMode" = 'FILTER';

ALTER TABLE "Workspace"
ALTER COLUMN "agentMode" SET DEFAULT 'DRAFT';
