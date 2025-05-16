import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { ObjectId } from 'mongodb';
import { Vendor, VendorType } from '@/lib/models/Vendor';
import dbConnect from '@/lib/mongoose';

// 모든 거래처 가져오기
export async function GET(request: NextRequest) {
  try {
    // 쿼리 파라미터 처리 (옵션)
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const onlyActive = searchParams.get('onlyActive') === 'true';
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    // MongoDB에 연결
    await dbConnect();
    
    // 특정 ID 조회
    if (id) {
      try {
        const vendor = await Vendor.findById(id);
        if (!vendor) {
          return NextResponse.json({ error: '거래처를 찾을 수 없습니다.' }, { status: 404 });
        }
        return NextResponse.json(vendor);
      } catch (error) {
        return NextResponse.json({ error: '잘못된 ID 형식입니다.' }, { status: 400 });
      }
    }
    
    // 모든 거래처 조회 (active 필터링 포함)
    const query = onlyActive ? { isActive: true } : {};
    const vendors = await Vendor.find(query).sort({ name: 1 });
    
    return NextResponse.json(vendors);
  } catch (error) {
    console.error('거래처 조회 오류:', error);
    return NextResponse.json({ error: '거래처 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 새 거래처 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, businessNumber, phoneNumber } = body;
    
    if (!name) {
      return NextResponse.json({ error: '상호명은 필수 입력사항입니다.' }, { status: 400 });
    }
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // MongoDB에 연결
    await dbConnect();
    
    // 동일한 상호명 체크
    const existingVendor = await Vendor.findOne({ name, isActive: true });
    if (existingVendor) {
      return NextResponse.json({ error: '이미 등록된 거래처 이름입니다.' }, { status: 409 });
    }
    
    // 사업자번호 체크 (있는 경우)
    if (businessNumber) {
      const existingBusiness = await Vendor.findOne({ businessNumber, isActive: true });
      if (existingBusiness) {
        return NextResponse.json({ error: '이미 등록된 사업자번호입니다.' }, { status: 409 });
      }
    }
    
    // 신규 거래처 생성
    const newVendor = new Vendor({
      name,
      businessNumber: businessNumber || null,
      phoneNumber: phoneNumber || null,
      createdBy: userId
    });
    
    const savedVendor = await newVendor.save();
    
    return NextResponse.json({ 
      message: '거래처가 등록되었습니다.',
      vendor: savedVendor
    }, { status: 201 });
  } catch (error: any) {
    console.error('거래처 생성 오류:', error);
    // 유효성 검사 에러 처리
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({ error: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ error: '거래처 등록 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 거래처 정보 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, businessNumber, phoneNumber, isActive } = body;
    
    if (!id) {
      return NextResponse.json({ error: '거래처 ID가 필요합니다.' }, { status: 400 });
    }
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // MongoDB에 연결
    await dbConnect();
    
    // 해당 거래처 존재 확인
    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return NextResponse.json({ error: '거래처를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 이름이 변경된 경우 중복 체크
    if (name && name !== vendor.name) {
      const existingName = await Vendor.findOne({ 
        name, 
        isActive: true,
        _id: { $ne: id } 
      });
      
      if (existingName) {
        return NextResponse.json({ error: '이미 등록된 거래처 이름입니다.' }, { status: 409 });
      }
      
      vendor.name = name;
    }
    
    // 사업자번호 변경시 중복 체크
    if (businessNumber !== undefined && businessNumber !== vendor.businessNumber) {
      if (businessNumber) {
        const existingBusiness = await Vendor.findOne({ 
          businessNumber, 
          isActive: true,
          _id: { $ne: id } 
        });
        
        if (existingBusiness) {
          return NextResponse.json({ error: '이미 등록된 사업자번호입니다.' }, { status: 409 });
        }
      }
      
      vendor.businessNumber = businessNumber || null;
    }
    
    // 전화번호 업데이트
    if (phoneNumber !== undefined) {
      vendor.phoneNumber = phoneNumber || null;
    }
    
    // 활성 상태 업데이트
    if (isActive !== undefined) {
      vendor.isActive = isActive;
    }
    
    // 저장
    const updatedVendor = await vendor.save();
    
    return NextResponse.json({ 
      message: '거래처 정보가 업데이트되었습니다.',
      vendor: updatedVendor
    });
  } catch (error: any) {
    console.error('거래처 업데이트 오류:', error);
    // 유효성 검사 에러 처리
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({ error: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ error: '거래처 업데이트 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 거래처 삭제 (실제 삭제 대신 isActive=false로 설정)
export async function DELETE(request: NextRequest) {
  try {
    // 쿼리 파라미터 처리
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: '거래처 ID가 필요합니다.' }, { status: 400 });
    }
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // MongoDB에 연결
    await dbConnect();
    
    // 해당 거래처가 존재하는지 확인
    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return NextResponse.json({ error: '거래처를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 삭제 대신 비활성화 처리
    vendor.isActive = false;
    await vendor.save();
    
    return NextResponse.json({ message: '거래처가 삭제되었습니다.' });
  } catch (error) {
    console.error('거래처 삭제 오류:', error);
    return NextResponse.json({ error: '거래처 삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 