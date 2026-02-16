-- Add settings column to Workspace table
-- This migration adds a JSON settings column with default empty object

ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "settings" JSONB DEFAULT '{}';
