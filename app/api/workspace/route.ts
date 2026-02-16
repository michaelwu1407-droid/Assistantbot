import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateWorkspace } from '@/actions/workspace-actions';
import { getAuthUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const workspace = await getOrCreateWorkspace(userId);
    return NextResponse.json(workspace);
  } catch (error) {
    console.error('Workspace API error:', error);
    return NextResponse.json({ error: 'Failed to fetch workspace' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const workspaceData = await request.json();

    // This would typically call an updateWorkspace action
    // For now, return a placeholder response
    return NextResponse.json({ message: 'Workspace update not implemented yet' }, { status: 501 });
  } catch (error) {
    console.error('Workspace update API error:', error);
    return NextResponse.json({ error: 'Failed to update workspace' }, { status: 500 });
  }
}
