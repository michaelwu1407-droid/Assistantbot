'use server';

// Mock DB calls
const db = {
  contact: { findMany: async (args: any) => [] as any[] },
  deal: { findUnique: async (args: any) => ({ price: 1000000, bedrooms: 3 } as any) },
  activity: { create: async (args: any) => ({}) },
};

export async function findBuyerMatches(listingId: string) {
  // 1. Fetch Listing Details
  const listing = await db.deal.findUnique({
    where: { id: listingId }
  });

  if (!listing) throw new Error("Listing not found");

  // 2. Query Contacts based on JSON preferences
  // Note: Prisma JSON filtering syntax varies, this is conceptual
  const matches = await db.contact.findMany({
    where: {
      preferences: {
        path: ['budget'],
        gte: listing.price
      }
    }
  });

  return matches;
}

export async function logKeyCheckout(keyId: string, userId: string) {
  // 1. Log Activity
  await db.activity.create({
    data: {
      description: `Keys ${keyId} checked out`,
      userId: userId
    }
  });

  // 2. Start Background Timer (Mock)
  // In production, this would push a job to a queue (e.g., BullMQ)
  console.log(`[TIMER] Started 5PM alert timer for User ${userId}`);

  return { success: true, checkedOutAt: new Date() };
}
