export interface Notice {
  _id?: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface NoticeReadStatus {
  _id?: string;
  noticeId: string;
  userId: string;
  dismissType: 'today' | 'permanent';
  dismissedAt: Date;
}