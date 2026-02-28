-- CreateEnum
CREATE TYPE "KnowledgeCategory" AS ENUM ('SERVICE', 'PRICING', 'NEGATIVE_SCOPE');

-- AlterTable: Add serviceSuburbs to BusinessProfile
ALTER TABLE "BusinessProfile" ADD COLUMN "serviceSuburbs" JSONB;

-- AlterTable: Add aiTriageRecommendation to Deal
ALTER TABLE "Deal" ADD COLUMN "aiTriageRecommendation" TEXT;

-- CreateTable: BusinessKnowledge
CREATE TABLE "BusinessKnowledge" (
    "id" TEXT NOT NULL,
    "category" "KnowledgeCategory" NOT NULL,
    "ruleContent" TEXT NOT NULL,
    "metadata" JSONB,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessKnowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DeviationEvent
CREATE TABLE "DeviationEvent" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "aiRecommendation" TEXT NOT NULL,
    "userAction" TEXT NOT NULL,
    "ruleContent" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAction" TEXT,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessKnowledge_workspaceId_category_idx" ON "BusinessKnowledge"("workspaceId", "category");

-- CreateIndex
CREATE INDEX "DeviationEvent_workspaceId_resolved_idx" ON "DeviationEvent"("workspaceId", "resolved");
