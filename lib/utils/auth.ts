import { currentUser } from '@clerk/nextjs/server';
import { auth } from '@clerk/nextjs/server';
import UserProfile, { UserRole, IUserProfile } from '../models/UserProfile';
import { connectToDatabase } from '../mongodb';

export interface UserWithRole {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
}

/**
 * 현재 사용자의 권한 정보를 조회합니다.
 */
export async function getCurrentUserWithRole(): Promise<UserWithRole | null> {
  try {
    const user = await currentUser();
    if (!user) return null;

    const { db } = await connectToDatabase();
    
    let userProfile = await db.collection('userProfiles').findOne({ clerkId: user.id });
    
    // 사용자 프로필이 없다면 생성 (첫 사용자는 SUPER_ADMIN으로 설정)
    if (!userProfile) {
      const existingUsersCount = await db.collection('userProfiles').countDocuments();
      const role: UserRole = existingUsersCount === 0 ? 'SUPER_ADMIN' : 'STAFF';
      
      const newUserProfile = {
        clerkId: user.id,
        role,
        name: user.fullName || user.firstName || 'Unknown User',
        email: user.emailAddresses[0]?.emailAddress || '',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await db.collection('userProfiles').insertOne(newUserProfile);
      userProfile = { ...newUserProfile, _id: result.insertedId };
      
      console.log(`새 사용자 프로필 생성됨: ${user.id}, 권한: ${role}`);
    }

    return {
      id: user.id,
      email: userProfile.email,
      name: userProfile.name,
      role: userProfile.role,
      isActive: userProfile.isActive
    };
  } catch (error) {
    console.error('Error getting current user with role:', error);
    return null;
  }
}

/**
 * 특정 사용자 ID의 권한 정보를 조회합니다.
 */
export async function getUserRole(clerkId: string): Promise<UserRole | null> {
  try {
    const { db } = await connectToDatabase();
    let userProfile = await db.collection('userProfiles').findOne({ clerkId, isActive: true });
    
    // 사용자 프로필이 없다면 생성
    if (!userProfile) {
      // currentUser()를 통해 사용자 정보를 가져와서 프로필 생성
      const userWithRole = await getCurrentUserWithRole();
      return userWithRole?.role || null;
    }
    
    return userProfile.role;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

/**
 * 사용자가 특정 권한을 가지고 있는지 확인합니다.
 */
export async function hasRole(requiredRole: UserRole): Promise<boolean> {
  const userWithRole = await getCurrentUserWithRole();
  if (!userWithRole || !userWithRole.isActive) return false;
  
  return hasRolePermission(userWithRole.role, requiredRole);
}

/**
 * 권한 계층을 확인합니다.
 * SUPER_ADMIN > ADMIN > STAFF > READ_ONLY
 */
export function hasRolePermission(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    'SUPER_ADMIN': 4,
    'ADMIN': 3,
    'STAFF': 2,
    'READ_ONLY': 1
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * API 라우트에서 권한 검증을 위한 미들웨어
 */
export async function requireRole(requiredRole: UserRole) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized');
  }

  const userRole = await getUserRole(userId);
  if (!userRole || !hasRolePermission(userRole, requiredRole)) {
    throw new Error('Insufficient permissions');
  }

  return { userId, userRole };
}

/**
 * 모든 사용자 프로필을 조회합니다 (SUPER_ADMIN 전용)
 */
export async function getAllUserProfiles(): Promise<any[]> {
  const hasPermission = await hasRole('SUPER_ADMIN');
  if (!hasPermission) {
    throw new Error('Super admin access required');
  }

  const { db } = await connectToDatabase();
  return await db.collection('userProfiles').find().sort({ createdAt: -1 }).toArray();
}

/**
 * 사용자 권한을 업데이트합니다 (SUPER_ADMIN 전용)
 */
export async function updateUserRole(clerkId: string, newRole: UserRole): Promise<any | null> {
  const hasPermission = await hasRole('SUPER_ADMIN');
  if (!hasPermission) {
    throw new Error('Super admin access required');
  }

  const { db } = await connectToDatabase();
  const result = await db.collection('userProfiles').findOneAndUpdate(
    { clerkId },
    { $set: { role: newRole, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );

  return result;
}

/**
 * 사용자 활성화 상태를 변경합니다 (SUPER_ADMIN 전용)
 */
export async function toggleUserActive(clerkId: string): Promise<any | null> {
  const hasPermission = await hasRole('SUPER_ADMIN');
  if (!hasPermission) {
    throw new Error('Super admin access required');
  }

  const { db } = await connectToDatabase();
  const userProfile = await db.collection('userProfiles').findOne({ clerkId });
  if (!userProfile) return null;

  const result = await db.collection('userProfiles').findOneAndUpdate(
    { clerkId },
    { $set: { isActive: !userProfile.isActive, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );

  return result;
}