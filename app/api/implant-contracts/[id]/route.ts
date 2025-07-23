import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { createKstDateForMongoDB, createNewDate } from '@/lib/utils';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { client, db } = await connectToDatabase();
        
        const { id } = await params;
        const contract = await db.collection('implantcontracts').findOne({ _id: new ObjectId(id) });
        
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
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { client, db } = await connectToDatabase();
        
        const { id } = await params;
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

        const contract = await db.collection('implantcontracts').findOne({ _id: new ObjectId(id) });
        
        if (!contract) {
            return NextResponse.json({ error: '계약을 찾을 수 없습니다.' }, { status: 404 });
        }

        // 동일 회사의 다른 활성 계약이 있는지 확인
        if (isActive && companyName !== contract.companyName) {
            const existingActiveContract = await db.collection('implantcontracts').findOne({
                companyName,
                isActive: true,
                _id: { $ne: new ObjectId(id) }
            });

            if (existingActiveContract) {
                return NextResponse.json({ 
                    error: '해당 회사의 활성 계약이 이미 존재합니다. 기존 계약을 비활성화한 후 진행하세요.' 
                }, { status: 400 });
            }
        }

        const updateData = {
            companyName,
            contractDate: createKstDateForMongoDB(contractDate),
            promotionAmount: promotionAmount || 0,
            markupRate: markupRate || 0,
            paymentMethod: paymentMethod || '',
            paymentTerms: paymentTerms || '',
            benefits: benefits || '',
            productPrices: productPrices || [],
            isActive,
            updatedAt: createNewDate()
        };

        await db.collection('implantcontracts').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        const updatedContract = await db.collection('implantcontracts').findOne({ _id: new ObjectId(id) });
        
        return NextResponse.json(updatedContract);
    } catch (error) {
        console.error('Error updating implant contract:', error);
        return NextResponse.json({ error: '계약 수정에 실패했습니다.' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { client, db } = await connectToDatabase();

        const { id } = await params;
        const contract = await db.collection('implantcontracts').findOne({ _id: new ObjectId(id) });
        
        if (!contract) {
            return NextResponse.json({ error: '계약을 찾을 수 없습니다.' }, { status: 404 });
        }

        await db.collection('implantcontracts').deleteOne({ _id: new ObjectId(id) });
        
        return NextResponse.json({ message: '계약이 삭제되었습니다.' });
    } catch (error) {
        console.error('Error deleting implant contract:', error);
        return NextResponse.json({ error: '계약 삭제에 실패했습니다.' }, { status: 500 });
    }
}