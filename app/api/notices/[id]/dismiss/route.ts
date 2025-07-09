import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { NoticeReadStatus } from '@/lib/models/notice';
import { createNewDate } from '@/lib/utils';

export async function POST(
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
    const { dismissType } = body;

    if (!dismissType || !['today', 'permanent'].includes(dismissType)) {
      return NextResponse.json({ error: 'Invalid dismiss type' }, { status: 400 });
    }

    await connectToDatabase();

    const existingStatus = await NoticeReadStatus.findOne({
      noticeId: id,
      userId
    });

    if (existingStatus) {
      existingStatus.dismissType = dismissType;
      existingStatus.dismissedAt = createNewDate();
      await existingStatus.save();
    } else {
      const readStatus = new NoticeReadStatus({
        noticeId: id,
        userId,
        dismissType,
        dismissedAt: createNewDate()
      });
      await readStatus.save();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error dismissing notice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}