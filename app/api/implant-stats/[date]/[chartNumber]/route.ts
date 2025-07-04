import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string; chartNumber: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { date, chartNumber } = await params;
    
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const operation = await db.collection('firstops').findOne({
      date: {
        $gte: startDate,
        $lt: endDate
      },
      chartNumber: chartNumber
    });

    if (!operation) {
      return NextResponse.json({ error: '환자 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({
      chartNumber: operation.chartNumber,
      patientName: operation.patientName,
      doctor: operation.doctor,
      date: date,
      implants: operation.implants || [],
      fixtures: operation.fixtures || []
    });

  } catch (error) {
    console.error('환자 정보 조회 중 에러:', error);
    return NextResponse.json({ 
      error: '환자 정보 조회에 실패했습니다.' 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ date: string; chartNumber: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { date, chartNumber } = await params;
    const { patientName, doctor, implants, fixtures } = await request.json();
    
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const operation = await db.collection('firstops').findOne({
      date: {
        $gte: startDate,
        $lt: endDate
      },
      chartNumber: chartNumber
    });

    if (!operation) {
      return NextResponse.json({ error: '환자 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 데이터 업데이트
    operation.patientName = patientName;
    operation.doctor = doctor;
    operation.implants = implants;
    operation.fixtures = fixtures;
    
    await db.collection('firstops').updateOne(
      { _id: operation._id },
      { 
        $set: {
          patientName: patientName,
          doctor: doctor,
          implants: implants,
          fixtures: fixtures,
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({ message: '환자 정보가 수정되었습니다.' });

  } catch (error) {
    console.error('환자 정보 수정 중 에러:', error);
    return NextResponse.json({ 
      error: '환자 정보 수정에 실패했습니다.' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ date: string; chartNumber: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { date, chartNumber } = await params;
    
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const result = await db.collection('firstops').deleteOne({
      date: {
        $gte: startDate,
        $lt: endDate
      },
      chartNumber: chartNumber
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: '환자 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ message: '환자 정보가 삭제되었습니다.' });

  } catch (error) {
    console.error('환자 정보 삭제 중 에러:', error);
    return NextResponse.json({ 
      error: '환자 정보 삭제에 실패했습니다.' 
    }, { status: 500 });
  }
} 