import { describe, it, expect } from "vitest";
import {
  KANBAN_STAGES_REQUIRING_SCHEDULED_DATE,
  kanbanStageRequiresScheduledDate,
  prismaStageRequiresScheduledDate,
} from "@/lib/deal-stage-rules";

describe("KANBAN_STAGES_REQUIRING_SCHEDULED_DATE", () => {
  it("contains scheduled, ready_to_invoice, and completed", () => {
    expect(KANBAN_STAGES_REQUIRING_SCHEDULED_DATE).toContain("scheduled");
    expect(KANBAN_STAGES_REQUIRING_SCHEDULED_DATE).toContain("ready_to_invoice");
    expect(KANBAN_STAGES_REQUIRING_SCHEDULED_DATE).toContain("completed");
  });
});

describe("kanbanStageRequiresScheduledDate", () => {
  it("returns true for stages that require a scheduled date", () => {
    expect(kanbanStageRequiresScheduledDate("scheduled")).toBe(true);
    expect(kanbanStageRequiresScheduledDate("ready_to_invoice")).toBe(true);
    expect(kanbanStageRequiresScheduledDate("completed")).toBe(true);
  });

  it("returns false for stages that do not require a scheduled date", () => {
    expect(kanbanStageRequiresScheduledDate("new_request")).toBe(false);
    expect(kanbanStageRequiresScheduledDate("quote_sent")).toBe(false);
    expect(kanbanStageRequiresScheduledDate("lost")).toBe(false);
    expect(kanbanStageRequiresScheduledDate("deleted")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(kanbanStageRequiresScheduledDate("")).toBe(false);
  });

  it("returns false for unknown stage", () => {
    expect(kanbanStageRequiresScheduledDate("pipeline")).toBe(false);
    expect(kanbanStageRequiresScheduledDate("SCHEDULED")).toBe(false); // case-sensitive
  });
});

describe("prismaStageRequiresScheduledDate", () => {
  it("returns true for Prisma stages implying Scheduled or later", () => {
    expect(prismaStageRequiresScheduledDate("SCHEDULED")).toBe(true);
    expect(prismaStageRequiresScheduledDate("NEGOTIATION")).toBe(true);
    expect(prismaStageRequiresScheduledDate("INVOICED")).toBe(true);
    expect(prismaStageRequiresScheduledDate("WON")).toBe(true);
    expect(prismaStageRequiresScheduledDate("PENDING_COMPLETION")).toBe(true);
  });

  it("returns false for early pipeline Prisma stages", () => {
    expect(prismaStageRequiresScheduledDate("NEW")).toBe(false);
    expect(prismaStageRequiresScheduledDate("CONTACTED")).toBe(false);
    expect(prismaStageRequiresScheduledDate("PIPELINE")).toBe(false);
    expect(prismaStageRequiresScheduledDate("LOST")).toBe(false);
    expect(prismaStageRequiresScheduledDate("DELETED")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(prismaStageRequiresScheduledDate("")).toBe(false);
  });
});
