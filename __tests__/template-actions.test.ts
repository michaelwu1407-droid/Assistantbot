import { beforeEach, describe, expect, it, vi } from "vitest";

const { db } = vi.hoisted(() => ({
  db: {
    messageTemplate: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ db }));

import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  getTemplates,
  renderTemplate,
  seedPresetTemplates,
  updateTemplate,
} from "@/actions/template-actions";

describe("template-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists and parses stored template variables", async () => {
    db.messageTemplate.findMany.mockResolvedValue([
      {
        id: "template_1",
        name: "Welcome lead",
        category: "welcome",
        subject: "Hi {{contactName}}",
        body: "Thanks for reaching out",
        variables: '["contactName","companyName"]',
      },
    ]);

    const result = await getTemplates("ws_1", "welcome");

    expect(db.messageTemplate.findMany).toHaveBeenCalledWith({
      where: { workspaceId: "ws_1", category: "welcome" },
      orderBy: { name: "asc" },
    });
    expect(result).toEqual([
      {
        id: "template_1",
        name: "Welcome lead",
        category: "welcome",
        subject: "Hi {{contactName}}",
        body: "Thanks for reaching out",
        variables: ["contactName", "companyName"],
      },
    ]);
  });

  it("returns null for missing templates and renders placeholders for found templates", async () => {
    db.messageTemplate.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "template_2",
        name: "Quote sent",
        category: "quote",
        subject: "Quote for {{dealTitle}}",
        body: "Hi {{contactName}}, total is {{amount}}.",
        variables: '["contactName","dealTitle","amount"]',
      });

    await expect(getTemplate("missing")).resolves.toBeNull();
    await expect(
      renderTemplate("template_2", {
        contactName: "Alex",
        dealTitle: "Kitchen plumbing",
        amount: "$1,250",
      }),
    ).resolves.toEqual({
      subject: "Quote for Kitchen plumbing",
      body: "Hi Alex, total is $1,250.",
    });
  });

  it("validates create and update inputs before mutating templates", async () => {
    const invalidCreate = await createTemplate({
      name: "",
      category: "general",
      body: "",
      variables: [],
      workspaceId: "ws_1",
    } as never);
    const invalidUpdate = await updateTemplate({
      templateId: "template_1",
      body: "",
    } as never);

    expect(invalidCreate).toEqual({
      success: false,
      error: "Too small: expected string to have >=1 characters",
    });
    expect(invalidUpdate).toEqual({
      success: false,
      error: "Too small: expected string to have >=1 characters",
    });
    expect(db.messageTemplate.create).not.toHaveBeenCalled();
    expect(db.messageTemplate.update).not.toHaveBeenCalled();
  });

  it("creates, updates, and deletes templates with json-encoded variables", async () => {
    db.messageTemplate.create.mockResolvedValue({ id: "template_3" });

    await expect(
      createTemplate({
        name: "Job booked",
        category: "job",
        subject: "Booked: {{dealTitle}}",
        body: "Hi {{contactName}}",
        variables: ["dealTitle", "contactName"],
        workspaceId: "ws_1",
      }),
    ).resolves.toEqual({ success: true, templateId: "template_3" });

    await expect(
      updateTemplate({
        templateId: "template_3",
        body: "Updated body",
        variables: ["contactName"],
      }),
    ).resolves.toEqual({ success: true });

    await expect(deleteTemplate("template_3")).resolves.toEqual({ success: true });

    expect(db.messageTemplate.create).toHaveBeenCalledWith({
      data: {
        name: "Job booked",
        category: "job",
        subject: "Booked: {{dealTitle}}",
        body: "Hi {{contactName}}",
        variables: '["dealTitle","contactName"]',
        workspaceId: "ws_1",
      },
    });
    expect(db.messageTemplate.update).toHaveBeenCalledWith({
      where: { id: "template_3" },
      data: {
        body: "Updated body",
        variables: '["contactName"]',
      },
    });
    expect(db.messageTemplate.delete).toHaveBeenCalledWith({
      where: { id: "template_3" },
    });
  });

  it("seeds the built-in preset templates for a workspace", async () => {
    db.messageTemplate.create.mockImplementation(async ({ data }) => ({
      id: data.name,
      ...data,
    }));

    const result = await seedPresetTemplates("ws_1");

    expect(result).toEqual({ success: true, count: 7 });
    expect(db.messageTemplate.create).toHaveBeenCalledTimes(7);
    expect(db.messageTemplate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Welcome new lead",
        category: "welcome",
        workspaceId: "ws_1",
        variables: '["contactName","companyName"]',
      }),
    });
  });
});
