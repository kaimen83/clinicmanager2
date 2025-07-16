import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToMongoose } from '@/lib/mongoose';
import { Notice, NoticeReadStatus } from '@/lib/models/notice';
import { createNewDate, getCurrentKstDate, toKstDate } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToMongoose();

    const now = getCurrentKstDate();
    
    const notices = await Notice.find({
      isActive: true,
      $and: [
        // 만료일 조건
        {
          $or: [
            { expiresAt: { $gt: now } },
            { expiresAt: { $exists: false } },
            { expiresAt: null }
          ]
        },
        // Private 공지사항 필터링: 내가 작성한 private 공지 + 모든 public 공지
        {
          $or: [
            { isPrivate: false }, // 모든 사용자에게 보이는 공지
            { isPrivate: true, authorId: userId } // 내가 작성한 private 공지
          ]
        }
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
    const { content, expiresAt, isPrivate } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    await connectToMongoose();
    
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
      isActive: true,
      isPrivate: isPrivate || false
    });

    await notice.save();

    return NextResponse.json(notice, { status: 201 });
  } catch (error) {
    console.error('Error creating notice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}