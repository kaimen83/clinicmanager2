import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/lib/utils/auth';

export async function GET() {
  try {
    const userWithRole = await getCurrentUserWithRole();
    
    if (!userWithRole) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ role: userWithRole.role });
  } catch (error) {
    console.error('Error getting user role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}