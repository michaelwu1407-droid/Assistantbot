import { NextResponse } from 'next/server';
import { getOrCreateWorkspace, getWorkspace, updateWorkspace } from '@/actions/workspace-actions';
import { getAuthUserId } from '@/lib/auth';

export async function GET() {
  try {
    const userId = await getAuthUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await getOrCreateWorkspace(userId);
    return NextResponse.json(workspace);
  } catch (error) {
    console.error('Workspace API error:', error);
    return NextResponse.json({ error: 'Failed to fetch workspace' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const workspace = await getOrCreateWorkspace(userId);
    const result = await updateWorkspace(workspace.id, body);

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Failed to update workspace' }, { status: 400 });
    }

    const updatedWorkspace = await getWorkspace(workspace.id);
    return NextResponse.json({ success: true, workspace: updatedWorkspace });
  } catch (error) {
    console.error('Workspace update API error:', error);
    return NextResponse.json({ error: 'Failed to update workspace' }, { status: 500 });
  }
}
