import { NextRequest, NextResponse } from 'next/server';
import { getAllUserProfiles, requireRole, updateUserRole, toggleUserActive } from '@/lib/utils/auth';
import { UserRole } from '@/lib/models/UserProfile';

// 모든 사용자 프로필 조회 (SUPER_ADMIN 전용)
export async function GET() {
  try {
    const userProfiles = await getAllUserProfiles();
    return NextResponse.json(userProfiles);
  } catch (error) {
    console.error('Error fetching user profiles:', error);
    if (error instanceof Error && error.message === 'Super admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 사용자 권한 업데이트 (SUPER_ADMIN 전용)
export async function PATCH(request: NextRequest) {
  try {
    await requireRole('SUPER_ADMIN');
    
    const { clerkId, role, action } = await request.json();
    
    if (!clerkId) {
      return NextResponse.json({ error: 'clerkId is required' }, { status: 400 });
    }
    
    let updatedProfile;
    
    if (action === 'toggleActive') {
      updatedProfile = await toggleUserActive(clerkId);
    } else if (role && ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'READ_ONLY'].includes(role)) {
      updatedProfile = await updateUserRole(clerkId, role as UserRole);
    } else {
      return NextResponse.json({ error: 'Invalid action or role' }, { status: 400 });
    }
    
    if (!updatedProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error('Error updating user profile:', error);
    if (error instanceof Error && error.message === 'Insufficient permissions') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}