import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getCurrentUserWithRole, hasRole } from '@/lib/utils/auth';
import { toKstDate } from '@/lib/utils';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    // Check if user is SUPER_ADMIN
    const hasPermission = await hasRole('SUPER_ADMIN');
    if (!hasPermission) {
      return NextResponse.json(
        { error: '최고관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const userWithRole = await getCurrentUserWithRole();
    if (!userWithRole) {
      return NextResponse.json(
        { error: '사용자 정보를 찾을 수 없습니다.' },
        { status: 401 }
      );
    }

    const { transactionId, verified } = await request.json();

    if (!transactionId) {
      return NextResponse.json(
        { error: '트랜잭션 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Update transaction with manual edit information
    const result = await db.collection('transactions').findOneAndUpdate(
      { _id: new ObjectId(transactionId) },
      {
        $set: {
          hometaxVerified: verified,
          hometaxManuallyEdited: true,
          hometaxEditedBy: userWithRole.id,
          hometaxEditedAt: toKstDate(new Date()),
          updatedAt: toKstDate(new Date())
        }
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { error: '트랜잭션을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      transaction: result
    });
  } catch (error) {
    console.error('홈텍스 상태 토글 오류:', error);
    return NextResponse.json(
      { error: '홈텍스 상태 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}