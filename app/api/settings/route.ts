import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { currentUser } from '@clerk/nextjs/server';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    if (!type) {
      return NextResponse.json({ error: '설정 유형이 필요합니다.' }, { status: 400 });
    }
    
    const { db } = await connectToDatabase();
    
    const settings = await db.collection('settings').find({ 
      type: type,
    }).sort({ order: 1 }).toArray();
    
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('설정 조회 오류:', error);
    return NextResponse.json({ error: '설정을 조회하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, value, order, feeRate, isActive } = body;
    
    if (!type || !value) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const { db } = await connectToDatabase();
    
    // 동일한 type과 value 조합이 있는지 확인
    const existingSetting = await db.collection('settings').findOne({ type, value });
    if (existingSetting) {
      return NextResponse.json({ error: '이미 존재하는 설정입니다.' }, { status: 409 });
    }
    
    // 마지막 순서 가져오기
    const lastSetting = await db.collection('settings').find({ type }).sort({ order: -1 }).limit(1).toArray();
    const newOrder = lastSetting.length > 0 ? lastSetting[0].order + 1 : 0;
    
    const newSetting = {
      type,
      value,
      order: order !== undefined ? order : newOrder,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // feeRate는 카드사 타입일 때만 추가
    if (type === 'cardCompany' && feeRate !== undefined) {
      if (feeRate < 0 || feeRate > 100) {
        return NextResponse.json({ error: '수수료율은 0에서 100 사이여야 합니다.' }, { status: 400 });
      }
      Object.assign(newSetting, { feeRate });
    }
    
    const result = await db.collection('settings').insertOne(newSetting);
    
    return NextResponse.json({ 
      message: '설정이 생성되었습니다.',
      setting: {
        _id: result.insertedId,
        ...newSetting
      }
    });
  } catch (error) {
    console.error('설정 생성 오류:', error);
    return NextResponse.json({ error: '설정을 생성하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, value, order, feeRate, isActive } = body;
    
    if (!id) {
      return NextResponse.json({ error: '설정 ID가 필요합니다.' }, { status: 400 });
    }
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const { db } = await connectToDatabase();
    
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (value !== undefined) updateData.value = value;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // feeRate 추가 (카드사 타입인 경우에만)
    const setting = await db.collection('settings').findOne({ _id: new ObjectId(id) });
    if (setting && setting.type === 'cardCompany' && feeRate !== undefined) {
      if (feeRate < 0 || feeRate > 100) {
        return NextResponse.json({ error: '수수료율은 0에서 100 사이여야 합니다.' }, { status: 400 });
      }
      updateData.feeRate = feeRate;
    }
    
    const result = await db.collection('settings').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: '설정을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    return NextResponse.json({ message: '설정이 업데이트되었습니다.' });
  } catch (error) {
    console.error('설정 업데이트 오류:', error);
    return NextResponse.json({ error: '설정을 업데이트하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: '설정 ID가 필요합니다.' }, { status: 400 });
    }
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const { db } = await connectToDatabase();
    
    const result = await db.collection('settings').deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: '설정을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    return NextResponse.json({ message: '설정이 삭제되었습니다.' });
  } catch (error) {
    console.error('설정 삭제 오류:', error);
    return NextResponse.json({ error: '설정을 삭제하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 