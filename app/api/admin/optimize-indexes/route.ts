import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { currentUser } from '@clerk/nextjs/server';
import { IndexSpecification } from 'mongodb';

// 인덱스 최적화를 위한 관리자 API
export async function POST(request: NextRequest) {
  try {
    // Check for automation script access
    const body = await request.json();
    const automationKey = request.headers.get('x-automation-key') || body.automationKey;
    
    // Allow automation access with special key or check user auth
    let isAuthorized = false;
    if (automationKey === 'optimize-patient-analysis-2024') {
      isAuthorized = true;
    } else {
      const user = await currentUser();
      const userId = user?.id;
      isAuthorized = !!userId;
    }
    
    if (!isAuthorized) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const results = [];

    // 1. transactions 컬렉션 인덱스
    const transactionIndexes: Array<{
      name: string;
      key: IndexSpecification;
      background: boolean;
    }> = [
      {
        name: 'date_1',
        key: { date: 1 },
        background: true
      },
      {
        name: 'date_chartNumber_1',
        key: { date: 1, chartNumber: 1 },
        background: true
      },
      {
        name: 'date_isNew_1',
        key: { date: 1, isNew: 1 },
        background: true
      },
      {
        name: 'chartNumber_1',
        key: { chartNumber: 1 },
        background: true
      }
    ];

    for (const index of transactionIndexes) {
      try {
        await db.collection('transactions').createIndex(index.key, {
          name: index.name,
          background: index.background
        });
        results.push({ collection: 'transactions', index: index.name, status: 'created' });
      } catch (error: any) {
        if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
          results.push({ collection: 'transactions', index: index.name, status: 'already exists' });
        } else {
          results.push({ collection: 'transactions', index: index.name, status: 'error', error: error.message });
        }
      }
    }

    // 2. patient_analysis_summary 컬렉션 인덱스 (요약 데이터용)
    const summaryIndexes: Array<{
      name: string;
      key: IndexSpecification;
      background: boolean;
    }> = [
      {
        name: 'periodType_year_month_1',
        key: { periodType: 1, year: 1, month: 1 },
        background: true
      },
      {
        name: 'periodType_year_quarter_1',
        key: { periodType: 1, year: 1, quarter: 1 },
        background: true
      },
      {
        name: 'createdAt_1',
        key: { createdAt: 1 },
        background: true
      }
    ];

    for (const index of summaryIndexes) {
      try {
        await db.collection('patient_analysis_summary').createIndex(index.key, {
          name: index.name,
          background: index.background
        });
        results.push({ collection: 'patient_analysis_summary', index: index.name, status: 'created' });
      } catch (error: any) {
        if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
          results.push({ collection: 'patient_analysis_summary', index: index.name, status: 'already exists' });
        } else {
          results.push({ collection: 'patient_analysis_summary', index: index.name, status: 'error', error: error.message });
        }
      }
    }

    // 3. 기존 인덱스 확인 및 결과 반환
    const transactionIndexList = await db.collection('transactions').listIndexes().toArray();
    const summaryIndexList = await db.collection('patient_analysis_summary').listIndexes().toArray();

    return NextResponse.json({
      message: '인덱스 최적화 완료',
      results,
      currentIndexes: {
        transactions: transactionIndexList.map(idx => idx.name),
        patient_analysis_summary: summaryIndexList.map(idx => idx.name)
      }
    });

  } catch (error) {
    console.error('인덱스 최적화 중 오류:', error);
    return NextResponse.json({ error: '인덱스 최적화 중 오류가 발생했습니다.' }, { status: 500 });
  }
}