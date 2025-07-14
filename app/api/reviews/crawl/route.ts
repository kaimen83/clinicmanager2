import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { NaverReviewCrawler } from '@/lib/naverReviewCrawler';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  const crawler = new NaverReviewCrawler();
  
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    let { placeId } = body;
    
    // placeId가 제공되지 않은 경우 설정에서 가져오기
    if (!placeId) {
      const { db } = await connectToDatabase();
      const setting = await db.collection('settings').findOne({ 
        type: 'hospital_place_id', 
        isActive: true 
      });
      
      if (setting) {
        placeId = setting.value;
      } else {
        return NextResponse.json({ 
          error: '병원 placeId가 설정되지 않았습니다. 관리자에게 문의하세요.' 
        }, { status: 400 });
      }
    }

    // 크롤러 초기화
    await crawler.initialize();
    
    // 리뷰 크롤링 실행
    const result = await crawler.crawlReviews(placeId);
    
    if (result.success && result.data) {
      // 데이터베이스에 저장
      await crawler.saveReviewsToDatabase(placeId, result.data);
      
      return NextResponse.json({
        success: true,
        message: `${result.reviewCount}개의 리뷰를 성공적으로 크롤링하고 저장했습니다.`,
        reviewCount: result.reviewCount,
        placeId
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message
      }, { status: 400 });
    }

  } catch (error) {
    console.error('크롤링 API 오류:', error);
    return NextResponse.json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  } finally {
    // 크롤러 정리
    await crawler.close();
  }
}