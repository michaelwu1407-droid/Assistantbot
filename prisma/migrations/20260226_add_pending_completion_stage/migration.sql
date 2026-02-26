-- Add PENDING_COMPLETION to DealStage enum (team member completion requests awaiting manager approval)
-- PENDING_COMPLETION: team member moved to completed; awaiting manager approval
ALTER TYPE "DealStage" ADD VALUE 'PENDING_COMPLETION';
