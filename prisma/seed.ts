import { PrismaClient, WorkspaceType } from "@prisma/client";

const prisma = new PrismaClient();

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function hoursFromNow(hours: number): Date {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d;
}

async function main() {
  console.log("Seeding Pj Buddy database...");

  // Clean existing data
  await prisma.material.deleteMany();
  await prisma.key.deleteMany();
  await prisma.buyerFeedback.deleteMany();
  await prisma.task.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.workspace.deleteMany();

  // ─── Workspace ────────────────────────────────────────────────────

  const workspace = await prisma.workspace.create({
    data: {
      name: "Pj Buddy Demo",
      type: WorkspaceType.TRADIE,
    },
  });

  console.log(`  Workspace: ${workspace.name}`);

  // ─── Contacts ─────────────────────────────────────────────────────

  const john = await prisma.contact.create({
    data: {
      name: "John Doe",
      email: "john@acmecorp.com",
      phone: "+61 400 111 222",
      workspaceId: workspace.id,
    },
  });

  const tony = await prisma.contact.create({
    data: {
      name: "Tony Stark",
      email: "tony@starkindustries.com",
      phone: "+61 400 333 444",
      workspaceId: workspace.id,
    },
  });

  const bruce = await prisma.contact.create({
    data: {
      name: "Bruce Wayne",
      email: "bruce@wayneent.com",
      phone: "+61 400 555 666",
      workspaceId: workspace.id,
    },
  });

  const sarah = await prisma.contact.create({
    data: {
      name: "Sarah Connor",
      email: "sarah@cyberdyne.com",
      phone: "+61 400 777 888",
      workspaceId: workspace.id,
    },
  });

  const nina = await prisma.contact.create({
    data: {
      name: "Nina Sharp",
      email: "nina@massivedynamic.com",
      phone: "+61 400 999 000",
      workspaceId: workspace.id,
    },
  });

  console.log("  Contacts: 5 created");

  // ─── Deals ────────────────────────────────────────────────────────

  const deal1 = await prisma.deal.create({
    data: {
      title: "Website Redesign",
      value: 5000,
      stage: "NEW",
      contactId: john.id,
      workspaceId: workspace.id,
    },
  });

  const deal2 = await prisma.deal.create({
    data: {
      title: "Mobile App Phase 1",
      value: 12000,
      stage: "CONTACTED",
      contactId: tony.id,
      workspaceId: workspace.id,
    },
  });

  const deal3 = await prisma.deal.create({
    data: {
      title: "Consulting Retainer",
      value: 2000,
      stage: "NEGOTIATION",
      contactId: bruce.id,
      workspaceId: workspace.id,
    },
  });

  const deal4 = await prisma.deal.create({
    data: {
      title: "Legacy Migration",
      value: 45000,
      stage: "NEGOTIATION",
      contactId: sarah.id,
      workspaceId: workspace.id,
    },
  });

  const deal5 = await prisma.deal.create({
    data: {
      title: "Q1 Campaign",
      value: 8500,
      stage: "WON",
      contactId: nina.id,
      workspaceId: workspace.id,
    },
  });

  // Agent Stream: Property Listing
  const deal6 = await prisma.deal.create({
    data: {
      title: "123 Fake St, Sydney",
      value: 1500000,
      stage: "NEW",
      contactId: bruce.id,
      workspaceId: workspace.id,
      metadata: {
        bedrooms: 3,
        bathrooms: 2,
        price: 1500000,
        property_type: "House",
      },
    },
  });

  // Tradie Stream: Scheduled Jobs
  const job1 = await prisma.deal.create({
    data: {
      title: "Emergency Plumbing Fix",
      value: 450,
      stage: "WON",
      jobStatus: "SCHEDULED",
      scheduledAt: hoursFromNow(2),
      contactId: sarah.id,
      workspaceId: workspace.id,
      address: "123 Cyberdyne Ave, Tech City",
      metadata: {
        description: "Leaking pipe in server room. Urgent.",
      }
    }
  });

  const job2 = await prisma.deal.create({
    data: {
      title: "Switchboard Upgrade",
      value: 2500,
      stage: "WON",
      jobStatus: "SCHEDULED",
      scheduledAt: hoursFromNow(5),
      contactId: tony.id,
      workspaceId: workspace.id,
      address: "1 Stark Tower, NYC",
      metadata: {
        description: "Upgrade main switchboard to support new arc reactor.",
      }
    }
  });

  console.log("  Deals: 8 created");

  // ─── Materials (Tradie) ───────────────────────────────────────────

  await prisma.material.createMany({
    data: [
      { name: "Copper Pipe 15mm", unit: "m", price: 12.50, category: "Plumbing", workspaceId: workspace.id },
      { name: "PVC Elbow 90deg", unit: "each", price: 4.20, category: "Plumbing", workspaceId: workspace.id },
      { name: "Labor (Standard)", unit: "hr", price: 110.00, category: "Labor", workspaceId: workspace.id },
      { name: "Labor (After Hours)", unit: "hr", price: 165.00, category: "Labor", workspaceId: workspace.id },
      { name: "Power Point (Double)", unit: "each", price: 25.00, category: "Electrical", workspaceId: workspace.id },
      { name: "Cat6 Cable", unit: "m", price: 1.50, category: "Electrical", workspaceId: workspace.id },
    ]
  });

  console.log("  Materials: 6 created");

  // ─── Keys (Agent) ─────────────────────────────────────────────────

  await prisma.key.createMany({
    data: [
      { code: "K-101", description: "123 Fake St (Front Door)", status: "AVAILABLE", workspaceId: workspace.id },
      { code: "K-102", description: "123 Fake St (Back Door)", status: "AVAILABLE", workspaceId: workspace.id },
      { code: "K-205", description: "8 Maple Court", status: "CHECKED_OUT", workspaceId: workspace.id }, // Will need to link holder manually if using createMany
    ]
  });

  // Link the checked out key
  const key = await prisma.key.findFirst({ where: { code: "K-205" } });
  if (key) {
    await prisma.key.update({
      where: { id: key.id },
      data: { holderId: sarah.id, checkedOutAt: daysAgo(1) }
    });
  }

  console.log("  Keys: 3 created");

  // ─── Activities ───────────────────────────────────────────────────
  
  await prisma.activity.create({
    data: {
      type: "EMAIL",
      title: "Email logged from acmecorp.com",
      content: "Re: Partnership Opportunity",
      dealId: deal1.id,
      contactId: john.id,
      createdAt: new Date(),
    },
  });

  await prisma.activity.create({
    data: {
      type: "MEETING",
      title: "Meeting scheduled with Tony Stark",
      content: "Product Demo - Tomorrow 10am",
      dealId: deal2.id,
      contactId: tony.id,
      createdAt: daysAgo(2),
    },
  });

  await prisma.activity.create({
    data: {
      type: "CALL",
      title: "Call with Bruce Wayne",
      content: "Discussed retainer terms",
      dealId: deal3.id,
      contactId: bruce.id,
      createdAt: daysAgo(8),
    },
  });

  await prisma.activity.create({
    data: {
      type: "NOTE",
      title: "Internal note on Cyberdyne project",
      content: "Need to follow up on migration timeline",
      dealId: deal4.id,
      contactId: sarah.id,
      createdAt: daysAgo(15),
    },
  });

  console.log("  Activities: 4 created");

  // ─── Tasks ────────────────────────────────────────────────────────

  await prisma.task.create({
    data: {
      title: "Call John about website redesign",
      dueAt: new Date(Date.now() + 86400000),
      dealId: deal1.id,
      contactId: john.id,
    },
  });

  await prisma.task.create({
    data: {
      title: "Follow up with Bruce Wayne",
      dueAt: daysAgo(-1),
      dealId: deal3.id,
      contactId: bruce.id,
    },
  });

  console.log("  Tasks: 2 created");
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
