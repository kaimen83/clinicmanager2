import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { connectToDatabase } from '@/lib/mongodb';

interface ReviewData {
  author: string;
  text: string;
  date: string;
  parsedDate?: Date;
}

interface CrawlResult {
  success: boolean;
  data?: ReviewData[];
  message: string;
  reviewCount?: number;
}

export class NaverReviewCrawler {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async initialize(): Promise<void> {
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      this.page = await this.context.newPage();

      // 불필요한 리소스 차단
      await this.context.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf,otf}', route => route.abort());
      await this.context.route('**/analytics.js', route => route.abort());
      await this.context.route('**/gtag.js', route => route.abort());
    } catch (error) {
      throw new Error(`크롤러 초기화 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  async crawlReviews(placeId: string): Promise<CrawlResult> {
    if (!this.page) {
      throw new Error('크롤러가 초기화되지 않았습니다.');
    }

    try {
      const url = `https://map.naver.com/p/entry/place/${placeId}?c=15.00,0,0,0,dh&placePath=/review`;
      
      // 페이지 로딩
      await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      
      // iframe 대기
      await this.page.waitForSelector('iframe#entryIframe', { timeout: 30000 });
      
      // iframe으로 컨텍스트 전환
      const frame = await this.page.frame('entryIframe');
      if (!frame) {
        throw new Error('iframe을 찾을 수 없습니다.');
      }
      
      // 리뷰 컨테이너가 로드될 때까지 대기
      await frame.waitForSelector('.pui__vn15t2', { timeout: 30000 });
      
      // 잠시 대기하여 모든 리뷰가 로드되도록 함
      await this.page.waitForTimeout(2000);
      
      // 모든 "더보기" 버튼 클릭
      const buttons = await frame.$$('.pui__wFzIYl');
      for (const button of buttons) {
        try {
          await button.click();
          await this.page.waitForTimeout(100); // 짧은 대기
        } catch (e) {
          // 더보기 버튼 클릭 실패 시 무시
        }
      }
      
      // 리뷰 텍스트와 작성자, 날짜 추출
      const reviews = await frame.$$eval('.pui__vn15t2', elements => 
        elements.map(el => {
          const reviewText = el.querySelector('a[role="button"]')?.textContent?.trim() || '';
          const authorName = el.closest('.pui__vn15t2')?.parentElement?.querySelector('.pui__NMi-Dp')?.textContent?.trim() || '익명';
          const dateInfo = el.closest('.pui__vn15t2')?.parentElement?.querySelector('.pui__gfuUIT time')?.textContent?.trim() || '';
          // "접기" 텍스트 제거
          const cleanText = reviewText.replace('접기', '').trim();
          
          return {
            author: authorName,
            text: cleanText,
            date: dateInfo
          };
        }).filter(review => review.text !== '') // 빈 리뷰 제거
      );

      // 날짜 파싱 추가
      const reviewsWithParsedDate = reviews.map(review => ({
        ...review,
        parsedDate: this.parseKoreanDate(review.date)
      }));
      
      return {
        success: true,
        data: reviewsWithParsedDate,
        message: '리뷰 크롤링이 완료되었습니다.',
        reviewCount: reviewsWithParsedDate.length
      };
      
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      };
    }
  }

  async saveReviewsToDatabase(placeId: string, reviews: ReviewData[]): Promise<void> {
    const { db } = await connectToDatabase();
    
    const reviewsWithMetadata = reviews.map(review => ({
      ...review,
      placeId,
      crawledAt: new Date()
    }));

    // 기존 리뷰 삭제 후 새로 저장 (중복 방지)
    await db.collection('reviews').deleteMany({ placeId });
    await db.collection('reviews').insertMany(reviewsWithMetadata);
  }

  private parseKoreanDate(dateStr: string): Date {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // "24.12.30.월" 형태
    const yearMonthDayMatch = dateStr.match(/(\d{2,4})\.(\d{1,2})\.(\d{1,2})/);
    if (yearMonthDayMatch) {
      let year = parseInt(yearMonthDayMatch[1]);
      const month = parseInt(yearMonthDayMatch[2]);
      const day = parseInt(yearMonthDayMatch[3]);
      
      // 2자리 연도는 20xx로 변환
      if (year < 100) {
        year = 2000 + year;
      }
      
      return new Date(year, month - 1, day);
    }
    
    // "1.7.화" 형태 (올해)
    const monthDayMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})/);
    if (monthDayMatch) {
      const month = parseInt(monthDayMatch[1]);
      const day = parseInt(monthDayMatch[2]);
      
      return new Date(currentYear, month - 1, day);
    }
    
    // 파싱 실패 시 현재 날짜 반환
    return now;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}