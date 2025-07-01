import mongoose, { Schema, Document, models, model } from 'mongoose';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'READ_ONLY';

export interface IUserProfile extends Document {
  clerkId: string;
  role: UserRole;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userProfileSchema = new Schema<IUserProfile>({
  clerkId: {
    type: String,
    required: true,
    unique: true
  },
  role: {
    type: String,
    enum: ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'READ_ONLY'],
    required: true,
    default: 'STAFF'
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 인덱스 생성
userProfileSchema.index({ clerkId: 1 });
userProfileSchema.index({ role: 1 });
userProfileSchema.index({ isActive: 1 });

export default (models.UserProfile as mongoose.Model<IUserProfile>) || model<IUserProfile>('UserProfile', userProfileSchema);