import { NextRequest, NextResponse } from 'next/server';
import { getDeals } from '@/actions/deal-actions';
import { getAuthUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    const deals = await getDeals(workspaceId);
    return NextResponse.json(deals);
  } catch (error) {
    console.error('Deals API error:', error);
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const dealData = await request.json();

    // This would typically call a createDeal action
    // For now, return a placeholder response
    return NextResponse.json({ message: 'Deal creation not implemented yet' }, { status: 501 });
  } catch (error) {
    console.error('Deal creation API error:', error);
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 });
  }
}
