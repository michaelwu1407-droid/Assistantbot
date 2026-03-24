import { NextRequest, NextResponse } from 'next/server';
import { getContacts } from '@/actions/contact-actions';
import { requireCurrentWorkspaceAccess } from '@/lib/workspace-access';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireCurrentWorkspaceAccess();
    const { searchParams } = new URL(request.url);
    const requestedWorkspaceId = searchParams.get('workspaceId');

    if (requestedWorkspaceId && requestedWorkspaceId !== actor.workspaceId) {
      return NextResponse.json({ error: 'Forbidden workspace access' }, { status: 403 });
    }

    const contacts = await getContacts(actor.workspaceId);
    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Contacts API error:', error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireCurrentWorkspaceAccess();
    const contactData = await request.json();

    // This would typically call a createContact action
    // For now, return a placeholder response
    return NextResponse.json({ message: 'Contact creation not implemented yet' }, { status: 501 });
  } catch (error) {
    console.error('Contact creation API error:', error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}
