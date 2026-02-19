-- Add DELETED to DealStage enum (PostgreSQL). Fixes: invalid input value for enum "DealStage": "DELETED"
ALTER TYPE "DealStage" ADD VALUE 'DELETED';
