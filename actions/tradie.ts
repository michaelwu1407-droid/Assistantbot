'use server';

import { revalidatePath } from 'next/cache';

// Mock DB calls
const db = {
  deal: { update: async (args: any) => ({}) },
};

export async function updateJobStatus(jobId: string, status: 'TRAVELING' | 'ARRIVED' | 'COMPLETED') {
  // 1. Update DB
  await db.deal.update({
    where: { id: jobId },
    data: { 
      stage: status === 'COMPLETED' ? 'CLOSED' : 'CONTRACT', // Mapping status to stage
      lastActivityAt: new Date(),
      metadata: { status } // Updating internal JSON status
    }
  });

  // 2. Trigger Side Effects
  if (status === 'TRAVELING') {
    // Mock SMS Service
    console.log(`[SMS] Sending tracking link to client for Job ${jobId}`);
  }

  revalidatePath('/tradie');
  return { success: true, status };
}

export async function createQuoteVariation(jobId: string, items: Array<{ name: string; price: number }>) {
  const total = items.reduce((sum, item) => sum + item.price, 0);

  // Update Deal Metadata with new items
  // In a real app, we would fetch existing metadata first
  await db.deal.update({
    where: { id: jobId },
    data: {
      value: total, // Update total value
      lastActivityAt: new Date(),
      // In reality, merge this with existing JSON
      metadata: { variations: items } 
    }
  });

  return { 
    success: true, 
    pdfUrl: `https://api.pjbuddy.com/quotes/${jobId}.pdf` // Mock PDF generation
  };
}
