require('dotenv').config();
const CardSalesCrawler = require('./cardSalesCrawler');

async function runCrawler() {
    const crawler = new CardSalesCrawler();
    
    try {
        // 크롤러 초기화
        await crawler.initialize();
        
        // 로그인 시도
        const loginSuccess = await crawler.login(
            process.env.CARDSALES_ID || 'kaimen83',
            process.env.CARDSALES_PASSWORD || 'pswd2371'
        );
        
        if (loginSuccess) {
            // 매출 조회 및 데이터 처리 실행
            const searchSuccess = await crawler.searchPayments();
            
            if (searchSuccess) {
                return {
                    success: true,
                    message: '크롤링이 성공적으로 완료되었습니다.'
                };
            } else {
                throw new Error('매출 조회 중 문제가 발생했습니다.');
            }
        } else {
            throw new Error('로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.');
        }
        
    } catch (error) {
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