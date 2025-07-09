import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Notice, NoticeReadStatus } from '@/lib/models/notice';
import { createNewDate, getCurrentKstDate, toKstDate } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const now = getCurrentKstDate();
    
    const notices = await Notice.find({
      isActive: true,
      $or: [
        { expiresAt: { $gt: now } },
        { expiresAt: { $exists: false } },
        { expiresAt: null }
      ]
    }).sort({ createdAt: 1 });

    const readStatuses = await NoticeReadStatus.find({ userId });
    const readStatusMap = new Map(
      readStatuses.map(status => [status.noticeId.toString(), status])
    );

    const visibleNotices = notices.filter(notice => {
      const readStatus = readStatusMap.get(notice._id.toString());
      
      if (!readStatus) return true;
      
      if (readStatus.dismissType === 'permanent') return false;
      
      if (readStatus.dismissType === 'today') {
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        return readStatus.dismissedAt < todayStart;
      }
      
      return true;
    });

    return NextResponse.json(visibleNotices);
  } catch (error) {
    console.error('Error fetching notices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, expiresAt } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    await connectToDatabase();
    
    // Clerk의 currentUser를 사용하여 사용자 정보 가져오기
    const { currentUser } = await import('@clerk/nextjs/server');
    const user = await currentUser();
    const authorName = user?.firstName && user?.lastName 
      ? `${user.lastName}${user.firstName}` 
      : user?.firstName || user?.username || '알 수 없음';

    const notice = new Notice({
      content,
      authorId: userId,
      authorName,
      createdAt: createNewDate(),
      expiresAt: expiresAt ? toKstDate(expiresAt) : undefined,
      isActive: true
    });

    await notice.save();

    return NextResponse.json(notice, { status: 201 });
  } catch (error) {
    console.error('Error creating notice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}