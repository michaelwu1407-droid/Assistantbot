import { NextRequest, NextResponse } from 'next/server';
import { getContacts } from '@/actions/contact-actions';
import { getAuthUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    const contacts = await getContacts(workspaceId);
    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Contacts API error:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const contactData = await request.json();

    // This would typically call a createContact action
    // For now, return a placeholder response
    return NextResponse.json({ message: 'Contact creation not implemented yet' }, { status: 501 });
  } catch (error) {
    console.error('Contact creation API error:', error);
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}
