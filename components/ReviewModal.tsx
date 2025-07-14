'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { StarIcon, RefreshCw, MessageSquare, User, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useUserRole } from './UserRoleProvider';

interface Review {
  _id: string;
  author: string;
  text: string;
  date: string;
  parsedDate: string;
  crawledAt: string;
}

interface ReviewData {
  reviews: Review[];
  totalReviews: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  placeId: string;
  lastCrawledAt: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReviewModal({ isOpen, onClose }: Props) {
  const { userWithRole } = useUserRole();
  const [isLoading, setIsLoading] = useState(false);
  const [isCrawling, setIsCrawling] = useState(false);
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // 리뷰 데이터 조회
  const fetchReviews = async (page: number = 1) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/reviews?page=${page}&limit=10`);
      
      if (!response.ok) {
        throw new Error('리뷰 데이터를 가져오는데 실패했습니다.');
      }
      
      const data = await response.json();
      if (data.success) {
        setReviewData(data.data);
        setCurrentPage(page);
      } else {
        throw new Error(data.message || '알 수 없는 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('리뷰 조회 에러:', error);
      toast.error(error instanceof Error ? error.message : '리뷰 조회에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 리뷰 크롤링
  const handleCrawlReviews = async () => {
    try {
      setIsCrawling(true);
      const response = await fetch('/api/reviews/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        // 크롤링 성공 후 첫 페이지 새로고침
        await fetchReviews(1);
      } else {
        throw new Error(data.message || '크롤링에 실패했습니다.');
      }
    } catch (error) {
      console.error('크롤링 에러:', error);
      toast.error(error instanceof Error ? error.message : '크롤링에 실패했습니다.');
    } finally {
      setIsCrawling(false);
    }
  };

  // 페이지 변경
  const handlePageChange = (page: number) => {
    fetchReviews(page);
  };

  // 모달이 열릴 때 초기 데이터 로드
  useEffect(() => {
    if (isOpen) {
      fetchReviews(1);
    }
  }, [isOpen]);

  // 권한 체크 - 일단 모든 로그인 사용자에게 권한 부여 (나중에 필요시 제한 가능)
  const canCrawl = true; // userWithRole?.role === 'ADMIN' || userWithRole?.role === 'STAFF';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 -mx-6 -mt-6 mb-4">
          <DialogTitle className="flex items-center gap-3 text-green-800">
            <div className="bg-green-100 p-2 rounded-lg">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">병원 리뷰 관리</h2>
              <p className="text-sm text-green-600 font-normal mt-1">네이버 지도 리뷰를 확인하고 관리합니다</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* 헤더 정보 및 크롤링 버튼 */}
          <div className="flex justify-between items-center mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
              {reviewData && (
                <>
                  <div className="text-sm text-gray-600">
                    총 <span className="font-semibold text-gray-800">{reviewData.totalReviews}</span>개 리뷰
                  </div>
                  {reviewData.lastCrawledAt && (
                    <div className="text-sm text-gray-500">
                      마지막 업데이트: {format(new Date(reviewData.lastCrawledAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                    </div>
                  )}
                </>
              )}
            </div>
            
            {canCrawl && (
              <Button 
                onClick={handleCrawlReviews}
                disabled={isCrawling}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                {isCrawling ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {isCrawling ? '크롤링 중...' : '리뷰 업데이트'}
              </Button>
            )}
          </div>

          {/* 리뷰 목록 */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              </div>
            ) : reviewData && reviewData.reviews.length > 0 ? (
              <div className="space-y-4">
                {reviewData.reviews.map((review, index) => (
                  <div key={review._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-800">{review.author}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>{review.date}</span>
                      </div>
                    </div>
                    
                    <div className="text-gray-700 leading-relaxed">
                      {review.text}
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                      크롤링 일시: {format(new Date(review.crawledAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <MessageSquare className="w-12 h-12 mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">아직 리뷰가 없습니다</p>
                <p className="text-sm">리뷰 업데이트 버튼을 눌러 최신 리뷰를 가져오세요</p>
              </div>
            )}
          </div>

          {/* 페이지네이션 */}
          {reviewData && reviewData.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!reviewData.hasPrevPage || isLoading}
              >
                이전
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, reviewData.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(
                    reviewData.totalPages - 4,
                    Math.max(1, currentPage - 2)
                  )) + i;
                  
                  if (pageNum > reviewData.totalPages) return null;
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      disabled={isLoading}
                      className={cn(
                        "w-8 h-8 p-0",
                        pageNum === currentPage && "bg-green-600 hover:bg-green-700"
                      )}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!reviewData.hasNextPage || isLoading}
              >
                다음
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}