import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { client, db } = await connectToDatabase();

        const searchParams = request.nextUrl.searchParams;
        const companyName = searchParams.get('companyName');

        const query: any = { isActive: true };
        if (companyName) query.companyName = companyName;

        const contracts = await db.collection('implantcontracts').find(query).sort({ contractDate: -1 }).toArray();
        
        return NextResponse.json(contracts);
    } catch (error) {
        console.error('Error fetching active implant contracts:', error);
        return NextResponse.json({ error: '활성 계약 목록을 불러오는데 실패했습니다.' }, { status: 500 });
    }
}