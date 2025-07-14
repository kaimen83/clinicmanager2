import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const placeId = searchParams.get('placeId');

    const { db } = await connectToDatabase();
    
    // placeId가 제공되지 않은 경우 설정에서 가져오기
    let targetPlaceId = placeId;
    if (!targetPlaceId) {
      const setting = await db.collection('settings').findOne({ 
        type: 'hospital_place_id', 
        isActive: true 
      });
      
      if (setting) {
        targetPlaceId = setting.value;
      } else {
        return NextResponse.json({ 
          error: '병원 placeId가 설정되지 않았습니다.' 
        }, { status: 400 });
      }
    }

    // 총 리뷰 수 조회
    const totalReviews = await db.collection('reviews').countDocuments({ 
      placeId: targetPlaceId 
    });

    // 페이지네이션 적용하여 리뷰 조회
    const reviews = await db.collection('reviews')
      .find({ placeId: targetPlaceId })
      .sort({ parsedDate: -1, crawledAt: -1 }) // 최신 순으로 정렬
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // 최근 크롤링 시간 조회
    const latestCrawling = await db.collection('reviews')
      .findOne(
        { placeId: targetPlaceId },
        { sort: { crawledAt: -1 } }
      );

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        totalReviews,
        currentPage: page,
        totalPages: Math.ceil(totalReviews / limit),
        hasNextPage: page < Math.ceil(totalReviews / limit),
        hasPrevPage: page > 1,
        placeId: targetPlaceId,
        lastCrawledAt: latestCrawling?.crawledAt || null
      }
    });

  } catch (error) {
    console.error('리뷰 조회 API 오류:', error);
    return NextResponse.json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get('placeId');

    const { db } = await connectToDatabase();
    
    // placeId가 제공되지 않은 경우 설정에서 가져오기
    let targetPlaceId = placeId;
    if (!targetPlaceId) {
      const setting = await db.collection('settings').findOne({ 
        type: 'hospital_place_id', 
        isActive: true 
      });
      
      if (setting) {
        targetPlaceId = setting.value;
      } else {
        return NextResponse.json({ 
          error: '병원 placeId가 설정되지 않았습니다.' 
        }, { status: 400 });
      }
    }

    // 해당 placeId의 모든 리뷰 삭제
    const result = await db.collection('reviews').deleteMany({ 
      placeId: targetPlaceId 
    });

    return NextResponse.json({
      success: true,
      message: `${result.deletedCount}개의 리뷰가 삭제되었습니다.`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('리뷰 삭제 API 오류:', error);
    return NextResponse.json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}