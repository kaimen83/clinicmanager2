import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import ImplantContract from '@/lib/models/ImplantContract';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const contract = await ImplantContract.findById(params.id);
        
        if (!contract) {
            return NextResponse.json({ error: '계약을 찾을 수 없습니다.' }, { status: 404 });
        }
        
        return NextResponse.json(contract);
    } catch (error) {
        console.error('Error fetching implant contract:', error);
        return NextResponse.json({ error: '계약 정보를 불러오는데 실패했습니다.' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        
        const body = await request.json();
        const {
            companyName,
            contractDate,
            promotionAmount,
            markupRate,
            paymentMethod,
            paymentTerms,
            benefits,
            productPrices,
            isActive
        } = body;

        const contract = await ImplantContract.findById(params.id);
        
        if (!contract) {
            return NextResponse.json({ error: '계약을 찾을 수 없습니다.' }, { status: 404 });
        }

        // 동일 회사의 다른 활성 계약이 있는지 확인
        if (isActive && companyName !== contract.companyName) {
            const existingActiveContract = await ImplantContract.findOne({
                companyName,
                isActive: true,
                _id: { $ne: params.id }
            });

            if (existingActiveContract) {
                return NextResponse.json({ 
                    error: '해당 회사의 활성 계약이 이미 존재합니다. 기존 계약을 비활성화한 후 진행하세요.' 
                }, { status: 400 });
            }
        }

        const updatedContract = await ImplantContract.findByIdAndUpdate(
            params.id,
            {
                companyName,
                contractDate: new Date(contractDate),
                promotionAmount: promotionAmount || 0,
                markupRate: markupRate || 0,
                paymentMethod: paymentMethod || '',
                paymentTerms: paymentTerms || '',
                benefits: benefits || '',
                productPrices: productPrices || [],
                isActive
            },
            { new: true }
        );
        
        return NextResponse.json(updatedContract);
    } catch (error) {
        console.error('Error updating implant contract:', error);
        return NextResponse.json({ error: '계약 수정에 실패했습니다.' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const contract = await ImplantContract.findById(params.id);
        
        if (!contract) {
            return NextResponse.json({ error: '계약을 찾을 수 없습니다.' }, { status: 404 });
        }

        await ImplantContract.findByIdAndDelete(params.id);
        
        return NextResponse.json({ message: '계약이 삭제되었습니다.' });
    } catch (error) {
        console.error('Error deleting implant contract:', error);
        return NextResponse.json({ error: '계약 삭제에 실패했습니다.' }, { status: 500 });
    }
}