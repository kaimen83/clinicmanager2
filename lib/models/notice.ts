import mongoose, { Schema, Document } from 'mongoose';

export interface NoticeDocument extends Document {
  content: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  isPrivate: boolean;
}

const noticeSchema = new Schema<NoticeDocument>({
  content: { type: String, required: true },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true },
  isPrivate: { type: Boolean, default: false }
});

export const Notice = mongoose.models.Notice || mongoose.model<NoticeDocument>('Notice', noticeSchema);

export interface NoticeReadStatusDocument extends Document {
  noticeId: String;
  userId: String;
  dismissType: 'today' | 'permanent';
  dismissedAt: Date;
}

const noticeReadStatusSchema = new Schema<NoticeReadStatusDocument>({
  noticeId: { type: String, required: true },
  userId: { type: String, required: true },
  dismissType: { type: String, enum: ['today', 'permanent'], required: true },
  dismissedAt: { type: Date, default: Date.now }
});

noticeReadStatusSchema.index({ noticeId: 1, userId: 1 }, { unique: true });

export const NoticeReadStatus = mongoose.models.NoticeReadStatus || mongoose.model<NoticeReadStatusDocument>('NoticeReadStatus', noticeReadStatusSchema);