import { PrismaClient, WorkspaceType } from "@prisma/client";

const prisma = new PrismaClient();

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function main() {
  console.log("Seeding Pj Buddy database...");

  // Clean existing data
  // await prisma.messageTemplate.deleteMany();
  // await prisma.chatMessage.deleteMany();
  // await prisma.automation.deleteMany();
  await prisma.task.deleteMany();
  await prisma.activity.deleteMany();
  // await prisma.openHouseLog.deleteMany();
  // await prisma.invoice.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.workspace.deleteMany();

  // ─── Workspace ────────────────────────────────────────────────────

  const workspace = await prisma.workspace.create({
    data: {
      name: "Pj Buddy Demo",
      type: WorkspaceType.TRADIE,
      // brandingColor: "#6366f1", // Removed: Not in current schema
    },
  });

  console.log(`  Workspace: ${workspace.name}`);

  // ─── Contacts ─────────────────────────────────────────────────────

  const john = await prisma.contact.create({
    data: {
      name: "John Doe",
      email: "john@acmecorp.com",
      phone: "+61 400 111 222",
      // company: "Acme Corp",
      workspaceId: workspace.id,
      // metadata: { enriched: true, domain: "acmecorp.com", industry: "Technology" },
    },
  });

  const tony = await prisma.contact.create({
    data: {
      name: "Tony Stark",
      email: "tony@starkindustries.com",
      phone: "+61 400 333 444",
      // company: "Stark Ind",
      workspaceId: workspace.id,
      // metadata: { enriched: true, domain: "starkindustries.com", industry: "Defense & Tech" },
    },
  });

  const bruce = await prisma.contact.create({
    data: {
      name: "Bruce Wayne",
      email: "bruce@wayneent.com",
      phone: "+61 400 555 666",
      // company: "Wayne Ent",
      workspaceId: workspace.id,
    },
  });

  const sarah = await prisma.contact.create({
    data: {
      name: "Sarah Connor",
      email: "sarah@cyberdyne.com",
      phone: "+61 400 777 888",
      // company: "Cyberdyne",
      workspaceId: workspace.id,
    },
  });

  const nina = await prisma.contact.create({
    data: {
      name: "Nina Sharp",
      email: "nina@massivedynamic.com",
      phone: "+61 400 999 000",
      // company: "Massive Dynamic",
      workspaceId: workspace.id,
      // metadata: { enriched: true, domain: "massivedynamic.com", industry: "Science & Tech" },
    },
  });

  console.log("  Contacts: 5 created");

  // ─── Deals (matching frontend MOCK_DEALS exactly) ─────────────────

  const deal1 = await prisma.deal.create({
    data: {
      title: "Website Redesign",
      // company: "Acme Corp",
      value: 5000,
      stage: "NEW",
      // stageChangedAt: daysAgo(1),
      // contactId: john.id,
      workspaceId: workspace.id,
    },
  });

  const deal2 = await prisma.deal.create({
    data: {
      title: "Mobile App Phase 1",
      // company: "Stark Ind",
      value: 12000,
      stage: "CONTACTED",
      // stageChangedAt: daysAgo(3),
      // contactId: tony.id,
      workspaceId: workspace.id,
    },
  });

  const deal3 = await prisma.deal.create({
    data: {
      title: "Consulting Retainer",
      // company: "Wayne Ent",
      value: 2000,
      stage: "NEGOTIATION",
      // stageChangedAt: daysAgo(8),
      // contactId: bruce.id,
      workspaceId: workspace.id,
    },
  });

  const deal4 = await prisma.deal.create({
    data: {
      title: "Legacy Migration",
      // company: "Cyberdyne",
      value: 45000,
      stage: "NEGOTIATION",
      // stageChangedAt: daysAgo(15),
      // contactId: sarah.id,
      workspaceId: workspace.id,
    },
  });

  const deal5 = await prisma.deal.create({
    data: {
      title: "Q1 Campaign",
      // company: "Massive Dynamic",
      value: 8500,
      stage: "WON",
      // stageChangedAt: daysAgo(5),
      // contactId: nina.id,
      workspaceId: workspace.id,
    },
  });

  // Agent Stream: Property Listing
  const deal6 = await prisma.deal.create({
    data: {
      title: "123 Fake St, Sydney",
      // company: "Private Seller",
      value: 1500000,
      stage: "NEW",
      // stageChangedAt: daysAgo(2),
      // contactId: bruce.id, // Bruce is selling
      workspaceId: workspace.id,
      metadata: {
        bedrooms: 3,
        bathrooms: 2,
        price: 1500000,
        property_type: "House",
      },
    },
  });

  console.log("  Deals: 6 created");

  // ─── Activities (matching frontend mock + creating stale scenarios) ─
  /*

  // Deal 1: Website Redesign — activity today (HEALTHY)
  await prisma.activity.create({
    data: {
      type: "EMAIL",
      title: "Email logged from acmecorp.com",
      content: "Re: Partnership Opportunity",
      description: "Discussed project scope and timeline",
      dealId: deal1.id,
      contactId: john.id,
      createdAt: new Date(),
    },
  });

  // Deal 2: Mobile App — activity 2 days ago (HEALTHY)
  await prisma.activity.create({
    data: {
      type: "MEETING",
      title: "Meeting scheduled with Tony Stark",
      content: "Product Demo - Tomorrow 10am",
      description: "Initial requirements walkthrough",
      dealId: deal2.id,
      contactId: tony.id,
      createdAt: daysAgo(2),
    },
  });

  // Deal 3: Consulting — activity 8 days ago (STALE / Amber)
  await prisma.activity.create({
    data: {
      type: "CALL",
      title: "Call with Bruce Wayne",
      content: "Discussed retainer terms",
      description: "Callback reminder set",
      dealId: deal3.id,
      contactId: bruce.id,
      createdAt: daysAgo(8),
    },
  });

  // Deal 4: Legacy Migration — activity 15 days ago (ROTTING / Red)
  await prisma.activity.create({
    data: {
      type: "NOTE",
      title: "Internal note on Cyberdyne project",
      content: "Need to follow up on migration timeline",
      description: "Budget review pending",
      dealId: deal4.id,
      contactId: sarah.id,
      createdAt: daysAgo(15),
    },
  });

  // Deal 5: Q1 Campaign — activity 3 days ago (HEALTHY)
  await prisma.activity.create({
    data: {
      type: "TASK",
      title: "Task completed: Send Invoice",
      content: "Invoice #1023 sent to Massive Dynamic",
      description: "Invoice #1023 sent",
      dealId: deal5.id,
      contactId: nina.id,
      createdAt: daysAgo(3),
    },
  });

  console.log("  Activities: 5 created");

  // ─── Tasks ────────────────────────────────────────────────────────

  await prisma.task.create({
    data: {
      title: "Call John about website redesign",
      description: "Discuss final mockup revisions",
      dueAt: new Date(Date.now() + 86400000), // tomorrow
      dealId: deal1.id,
      contactId: john.id,
    },
  });

  await prisma.task.create({
    data: {
      title: "Follow up with Bruce Wayne",
      description: "Retainer is going stale — needs attention",
      dueAt: daysAgo(-1), // yesterday (overdue)
      dealId: deal3.id,
      contactId: bruce.id,
    },
  });

  await prisma.task.create({
    data: {
      title: "Send migration proposal to Cyberdyne",
      description: "Deal is rotting — urgent follow up needed",
      dueAt: daysAgo(3), // 3 days overdue
      dealId: deal4.id,
      contactId: sarah.id,
    },
  });

  console.log("  Tasks: 3 created");

  /*
  // ─── Invoices (Tradie Stream) ─────────────────────────────────────

  await prisma.invoice.create({
    data: {
      number: "INV-1023",
      status: "PAID",
      subtotal: 8500,
      tax: 850,
      total: 9350,
      lineItems: [
        { desc: "Q1 Campaign Strategy", price: 5000 },
        { desc: "Creative Assets", price: 3500 },
      ],
      dealId: deal5.id,
      issuedAt: daysAgo(5),
      paidAt: daysAgo(2),
    },
  });

  console.log("  Invoices: 1 created");

  // ─── Open House Logs (Agent Stream) ───────────────────────────────

  await prisma.openHouseLog.create({
    data: {
      dealId: deal6.id,
      attendeeName: "Clark Kent",
      attendeeEmail: "clark@dailyplanet.com",
      attendeePhone: "0400 999 888",
      interestedLevel: 4,
      notes: "Loved the kitchen, concerned about commute.",
      visitedAt: daysAgo(1),
    },
  });

  await prisma.openHouseLog.create({
    data: {
      dealId: deal6.id,
      attendeeName: "Lois Lane",
      attendeeEmail: "lois@dailyplanet.com",
      interestedLevel: 5,
      notes: "Ready to make an offer.",
      visitedAt: daysAgo(1),
    },
  });

  console.log("  Open House Logs: 2 created");

  // ─── Automations (preset recipes) ────────────────────────────────

  await prisma.automation.create({
    data: {
      name: "Stale deal alert (5 days in Negotiation)",
      workspaceId: workspace.id,
      trigger: { event: "deal_stale", threshold_days: 5, stage: "NEGOTIATION" },
      action: { type: "notify", channel: "in_app", message: "Deal has been in Negotiation for 5+ days" },
    },
  });

  await prisma.automation.create({
    data: {
      name: "Auto-welcome new leads",
      workspaceId: workspace.id,
      trigger: { event: "new_lead" },
      action: { type: "email", template: "welcome_lead", message: "Thanks for your interest!" },
    },
  });

  console.log("  Automations: 2 created");

  // ─── Message Templates (presets) ────────────────────────────────

  const templatePresets = [
    // ... items ...
  ];

  for (const t of templatePresets) {
    await prisma.messageTemplate.create({
      data: { ...t, variables: JSON.stringify(t.variables), workspaceId: workspace.id },
    });
  }

  console.log(`  Templates: ${templatePresets.length} created`);
  */

  console.log("\nSeed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
