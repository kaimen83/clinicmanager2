const playwright = require('playwright');

class NaverMapCrawler {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
    }

    async initialize() {
        try {
            this.browser = await playwright.chromium.launch({
                headless: false,
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
            
            return true;
        } catch (error) {
            throw error;
        }
    }

    async crawlReviews(placeId) {
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
                await button.click();
            }
            
            // 리뷰 텍스트와 작성자, 날짜 추출
            const reviews = await frame.$$eval('.pui__vn15t2', elements => 
                elements.map(el => {
                    const reviewText = el.querySelector('a[role="button"]')?.textContent.trim() || '';
                    const authorName = el.closest('.pui__vn15t2')?.parentElement?.querySelector('.pui__NMi-Dp')?.textContent.trim() || '익명';
                    const dateInfo = el.closest('.pui__vn15t2')?.parentElement?.querySelector('.pui__gfuUIT time')?.textContent.trim() || '';
                    // "접기" 텍스트 제거
                    const cleanText = reviewText.replace('접기', '').trim();
                    
                    return {
                        author: authorName,
                        text: cleanText,
                        date: dateInfo
                    };
                }).filter(review => review.text !== '') // 빈 리뷰 제거
            );
            
            return {
                success: true,
                data: reviews,
                message: '리뷰 크롤링이 완료되었습니다.'
            };
            
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

module.exports = NaverMapCrawler; 