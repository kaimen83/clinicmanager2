import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import archiver from 'archiver';
import { Readable } from 'stream';
import { clerkClient } from '@clerk/nextjs/server';
import { currentUser } from '@clerk/nextjs/server';

// 스트림을 버퍼로 변환하는 함수
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

export async function POST(req: NextRequest) {
  try {
    // 인증 확인
    const user = await currentUser();
    const client = await clerkClient();
    
    if (!user?.id) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      );
    }

    // 사용자 정보 확인 (필요한 경우)
    const clerkUser = await client.users.getUser(user.id);
    
    // 데이터베이스 연결
    const { db } = await connectToDatabase();
    
    // 백업할 컬렉션 목록
    const collections = [
      'settings',
      'vendors',
      'implantProducts',
      'dentalProducts',
      'patients',
      'visits',
      'payments',
      'expenses'
    ];
    
    // ZIP 파일 생성
    const archive = archiver('zip', {
      zlib: { level: 9 } // 최대 압축 레벨
    });
    
    // 각 컬렉션의 데이터를 JSON 파일로 저장
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const data = await collection.find({}).toArray();
        
        archive.append(JSON.stringify(data, null, 2), { name: `${collectionName}.json` });
      } catch (err) {
        console.error(`컬렉션 ${collectionName} 백업 중 오류:`, err);
        // 개별 컬렉션 오류는 전체 백업을 중단하지 않고 계속 진행
      }
    }
    
    // ZIP 파일 완료
    archive.finalize();
    
    // 스트림을 버퍼로 변환
    const buffer = await streamToBuffer(archive);
    
    // 응답 생성
    const date = new Date().toISOString().split('T')[0];
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename=clinic_backup_${date}.zip`
      }
    });
  } catch (err) {
    console.error('백업 중 오류 발생:', err);
    return NextResponse.json(
      { error: '데이터베이스 백업 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 