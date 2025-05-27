import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { clerkClient } from '@clerk/nextjs/server';
import { currentUser } from '@clerk/nextjs/server';
import * as xlsx from 'xlsx';

export async function POST(req: NextRequest) {
  try {
    // 인증 확인
    const user = await currentUser();
    
    if (!user?.id) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      );
    }

    // 클라이언트에서 보낸 폼 데이터 추출
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    
    if (!file || !type) {
      return NextResponse.json(
        { error: '파일 또는 가져오기 유형이 지정되지 않았습니다.' },
        { status: 400 }
      );
    }
    
    // 파일 유형 확인
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: '지원되지 않는 파일 형식입니다. .xlsx 또는 .xls 파일만 업로드할 수 있습니다.' },
        { status: 400 }
      );
    }
    
    // 파일을 버퍼로 변환
    const buffer = await file.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: 'array' });
    
    // 첫 번째 시트 선택
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // 시트 데이터를 JSON으로 변환
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    if (data.length === 0) {
      return NextResponse.json(
        { error: '가져올 데이터가 없습니다.' },
        { status: 400 }
      );
    }
    
    // 데이터베이스 연결
    const { db } = await connectToDatabase();
    
    // 데이터 타입에 따라 다른 컬렉션에 저장
    let collection;
    let count = 0;
    
    switch (type) {
      case 'patients':
        collection = db.collection('patients');
        // 데이터 형식 변환 및 삽입
        for (const item of data) {
          // 필요한 데이터 변환 및 검증
          // 예: 날짜 형식 변환, 필수 필드 확인 등
          const parsedItem = item as Record<string, unknown>;
          await collection.insertOne({
            ...parsedItem,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: user.id
          });
          count++;
        }
        break;
        
      case 'treatments':
        collection = db.collection('visits');
        // 데이터 형식 변환 및 삽입
        for (const item of data) {
          // 필요한 데이터 변환 및 검증
          const parsedItem = item as Record<string, unknown>;
          await collection.insertOne({
            ...parsedItem,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: user.id
          });
          count++;
        }
        break;
        
      case 'payments':
        collection = db.collection('payments');
        // 데이터 형식 변환 및 삽입
        for (const item of data) {
          // 필요한 데이터 변환 및 검증
          const parsedItem = item as Record<string, unknown>;
          await collection.insertOne({
            ...parsedItem,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: user.id
          });
          count++;
        }
        break;
        
      default:
        return NextResponse.json(
          { error: '지원되지 않는 데이터 유형입니다.' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: '데이터를 성공적으로 가져왔습니다.',
      count
    });
    
  } catch (err) {
    console.error('엑셀 파일 가져오기 중 오류 발생:', err);
    return NextResponse.json(
      { error: '엑셀 파일 가져오기 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 