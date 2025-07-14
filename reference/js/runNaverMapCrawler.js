require('dotenv').config();
const NaverMapCrawler = require('./naverMapCrawler');

async function runCrawler() {
    const crawler = new NaverMapCrawler();
    
    try {
        // 크롤러 초기화
        await crawler.initialize();
        
        // 리뷰 크롤링 실행 (placeId는 URL에서 추출)
        const result = await crawler.crawlReviews('34542020');
        
        if (result.success) {
            // 결과 출력
            console.log('\n=== 네이버 지도 리뷰 크롤링 결과 ===\n');
            console.log(`총 ${result.data.length}개의 리뷰를 찾았습니다.\n`);
            
            result.data.forEach((review, index) => {
                console.log(`[리뷰 ${index + 1}] 작성자: ${review.author}`);
                console.log('─'.repeat(50));
                console.log(review.text);
                console.log('─'.repeat(50));
                console.log(); // 빈 줄 추가
            });
            
            return result;
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.log('\n=== 크롤링 중 오류 발생 ===\n');
        console.log(error.message);
        return {
            success: false,
            message: error.message
        };
    } finally {
        // 브라우저 종료
        await crawler.close();
    }
}

// 직접 실행 시
if (require.main === module) {
    runCrawler();
}

// 모듈로 내보내기
module.exports = runCrawler; 