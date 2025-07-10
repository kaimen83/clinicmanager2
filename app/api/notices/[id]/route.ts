import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Notice } from '@/lib/models/notice';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { content, expiresAt } = body;

    await connectToDatabase();

    const notice = await Notice.findById(id);
    
    if (!notice) {
      return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
    }

    if (notice.authorId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    notice.content = content || notice.content;
    notice.expiresAt = expiresAt !== undefined ? expiresAt : notice.expiresAt;
    
    await notice.save();

    return NextResponse.json(notice);
  } catch (error) {
    console.error('Error updating notice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const notice = await Notice.findById(id);
    
    if (!notice) {
      return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
    }

    if (notice.authorId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await Notice.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}