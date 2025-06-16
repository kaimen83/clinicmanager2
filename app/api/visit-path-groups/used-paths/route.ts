import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { currentUser } from '@clerk/nextjs/server';

// 사용 중인 내원경로 조회
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    const groups = await db.collection('visitpathgroups').find({ 
      isActive: true 
    }).toArray();

    const usedPaths: string[] = [];
    const groupMap: { [path: string]: { groupId: string; groupName: string } } = {};
    
    groups.forEach((group: any) => {
      group.visitPaths.forEach((path: string) => {
        usedPaths.push(path);
        groupMap[path] = {
          groupId: group._id.toString(),
          groupName: group.name
        };
      });
    });

    return NextResponse.json({ usedPaths, groupMap });
  } catch (error) {
    console.error('사용 중인 내원경로 조회 오류:', error);
    return NextResponse.json({ error: '사용 중인 내원경로를 조회하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 