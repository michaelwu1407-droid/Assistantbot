import { NextRequest, NextResponse } from 'next/server';
import { getContacts } from '@/actions/contact-actions';
import { requireCurrentWorkspaceAccess } from '@/lib/workspace-access';
import { logger } from '@/lib/logging';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireCurrentWorkspaceAccess();
    const { searchParams } = new URL(request.url);
    const requestedWorkspaceId = searchParams.get('workspaceId');

    if (requestedWorkspaceId && requestedWorkspaceId !== actor.workspaceId) {
      return NextResponse.json({ error: 'Forbidden workspace access' }, { status: 403 });
    }

    const pageParam = Number(searchParams.get('page') ?? '1');
    const pageSizeParam = Number(searchParams.get('pageSize') ?? '100');
    const page = Number.isFinite(pageParam) ? Math.max(1, Math.floor(pageParam)) : 1;
    const pageSize = Number.isFinite(pageSizeParam) ? Math.max(1, Math.min(Math.floor(pageSizeParam), 500)) : 100;
    const contacts = await getContacts(actor.workspaceId, { page, pageSize });
    return NextResponse.json(contacts);
  } catch (error) {
    logger.error('Contacts API error', { component: 'api/contacts', action: 'GET' }, error as Error);
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
    logger.error('Contact creation API error', { component: 'api/contacts', action: 'POST' }, error as Error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}
