import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { currentUser } from '@clerk/nextjs/server';
import { ObjectId } from 'mongodb';

// 그룹 수정
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const body = await request.json();
    const { name, description, visitPaths } = body;
    const { id: groupId } = await params;

    if (!name || !visitPaths || visitPaths.length === 0) {
      return NextResponse.json({ error: '그룹명과 내원경로는 필수입니다.' }, { status: 400 });
    }

    // 기존 그룹 확인
    const existingGroup = await db.collection('visitpathgroups').findOne({ 
      _id: new ObjectId(groupId) 
    });
    
    if (!existingGroup) {
      return NextResponse.json({ error: '그룹을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 다른 그룹에서 같은 이름 사용 중인지 확인
    const duplicateNameGroup = await db.collection('visitpathgroups').findOne({ 
      name, 
      isActive: true,
      _id: { $ne: new ObjectId(groupId) }
    });
    
    if (duplicateNameGroup) {
      return NextResponse.json({ 
        error: '이미 존재하는 그룹명입니다.',
        type: 'NAME_DUPLICATE'
      }, { status: 409 });
    }

    // 다른 그룹에서 사용 중인 내원경로 확인 (현재 그룹 제외)
    const otherGroups = await db.collection('visitpathgroups').find({ 
      isActive: true,
      _id: { $ne: new ObjectId(groupId) }
    }).toArray();
    
    const conflicts: { path: string; groupName: string }[] = [];
    
    otherGroups.forEach((group: any) => {
      group.visitPaths.forEach((path: string) => {
        if (visitPaths.includes(path)) {
          conflicts.push({ path, groupName: group.name });
        }
      });
    });

    if (conflicts.length > 0) {
      return NextResponse.json({
        error: `다음 내원경로들이 이미 다른 그룹에 포함되어 있습니다: ${conflicts.map(c => `${c.path}(${c.groupName})`).join(', ')}`,
        type: 'PATH_DUPLICATE',
        conflicts
      }, { status: 409 });
    }

    const updateData = {
      name,
      description: description || '',
      visitPaths,
      updatedAt: new Date()
    };

    await db.collection('visitpathgroups').updateOne(
      { _id: new ObjectId(groupId) },
      { $set: updateData }
    );

    return NextResponse.json({ message: '그룹이 수정되었습니다.' });
  } catch (error) {
    console.error('그룹 수정 오류:', error);
    return NextResponse.json({ error: '그룹을 수정하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 그룹 삭제
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { id: groupId } = await params;

    // 그룹 존재 확인
    const existingGroup = await db.collection('visitpathgroups').findOne({ 
      _id: new ObjectId(groupId) 
    });
    
    if (!existingGroup) {
      return NextResponse.json({ error: '그룹을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 소프트 삭제 (isActive를 false로 설정)
    await db.collection('visitpathgroups').updateOne(
      { _id: new ObjectId(groupId) },
      { 
        $set: { 
          isActive: false,
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({ message: '그룹이 삭제되었습니다.' });
  } catch (error) {
    console.error('그룹 삭제 오류:', error);
    return NextResponse.json({ error: '그룹을 삭제하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 