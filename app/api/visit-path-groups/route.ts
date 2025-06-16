import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { currentUser } from '@clerk/nextjs/server';
import { ObjectId } from 'mongodb';

// 그룹 목록 조회
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
    }).sort({ createdAt: -1 }).toArray();

    return NextResponse.json(groups);
  } catch (error) {
    console.error('그룹 목록 조회 오류:', error);
    return NextResponse.json({ error: '그룹 목록을 조회하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 새 그룹 생성
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const body = await request.json();
    const { name, description, visitPaths } = body;

    if (!name || !visitPaths || visitPaths.length === 0) {
      return NextResponse.json({ error: '그룹명과 내원경로는 필수입니다.' }, { status: 400 });
    }

    // 중복 그룹명 확인
    const existingGroup = await db.collection('visitpathgroups').findOne({ 
      name, 
      isActive: true 
    });
    
    if (existingGroup) {
      return NextResponse.json({ 
        error: '이미 존재하는 그룹명입니다.',
        type: 'NAME_DUPLICATE'
      }, { status: 409 });
    }

    // 이미 다른 그룹에 포함된 내원경로 확인
    const existingGroups = await db.collection('visitpathgroups').find({ 
      isActive: true 
    }).toArray();
    
    const usedPaths: string[] = [];
    const conflicts: { path: string; groupName: string }[] = [];
    
    existingGroups.forEach((group: any) => {
      group.visitPaths.forEach((path: string) => {
        if (visitPaths.includes(path)) {
          conflicts.push({ path, groupName: group.name });
        }
        usedPaths.push(path);
      });
    });

    if (conflicts.length > 0) {
      return NextResponse.json({
        error: `다음 내원경로들이 이미 다른 그룹에 포함되어 있습니다: ${conflicts.map(c => `${c.path}(${c.groupName})`).join(', ')}`,
        type: 'PATH_DUPLICATE',
        conflicts
      }, { status: 409 });
    }

    const newGroup = {
      name,
      description: description || '',
      visitPaths,
      isActive: true,
      userId: new ObjectId(userId),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('visitpathgroups').insertOne(newGroup);

    return NextResponse.json({
      message: '그룹이 생성되었습니다.',
      group: {
        _id: result.insertedId,
        ...newGroup
      }
    });
  } catch (error) {
    console.error('그룹 생성 오류:', error);
    return NextResponse.json({ error: '그룹을 생성하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 