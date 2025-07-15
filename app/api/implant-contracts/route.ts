import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import ImplantContract from '@/lib/models/ImplantContract';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const searchParams = request.nextUrl.searchParams;
        const companyName = searchParams.get('companyName');
        const isActive = searchParams.get('isActive');

        const query: any = {};
        if (companyName) query.companyName = companyName;
        if (isActive !== null) query.isActive = isActive === 'true';

        const contracts = await ImplantContract.find(query).sort({ contractDate: -1 });
        
        return NextResponse.json(contracts);
    } catch (error) {
        console.error('Error fetching implant contracts:', error);
        return NextResponse.json({ error: '계약 목록을 불러오는데 실패했습니다.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
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
            productPrices
        } = body;

        if (!companyName || !contractDate) {
            return NextResponse.json({ error: '회사명과 계약일은 필수입니다.' }, { status: 400 });
        }

        const contract = new ImplantContract({
            companyName,
            contractDate: new Date(contractDate),
            promotionAmount: promotionAmount || 0,
            markupRate: markupRate || 0,
            paymentMethod: paymentMethod || '',
            paymentTerms: paymentTerms || '',
            benefits: benefits || '',
            productPrices: productPrices || [],
            isActive: true,
            userId
        });

        await contract.save();
        
        return NextResponse.json(contract, { status: 201 });
    } catch (error) {
        console.error('Error creating implant contract:', error);
        return NextResponse.json({ error: '계약 생성에 실패했습니다.' }, { status: 500 });
    }
}