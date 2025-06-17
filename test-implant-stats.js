const { chromium } = require('playwright');

async function testImplantStats() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('1. 메인 페이지 접속 중...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(3000);
    
    console.log('2. 현재 페이지 상태 확인...');
    const title = await page.title();
    console.log('페이지 제목:', title);
    
    const url = page.url();
    console.log('현재 URL:', url);
    
    // 로그인 페이지인지 확인
    if (url.includes('sign-in')) {
      console.log('3. 로그인 페이지로 리다이렉트됨 - 인증 우회하여 직접 accounting 페이지 접속');
      
      // accounting 페이지로 직접 이동
      await page.goto('http://localhost:3000/accounting');
      await page.waitForTimeout(3000);
      
      console.log('4. accounting 페이지 접속 시도 완료');
      const currentUrl = page.url();
      console.log('현재 URL:', currentUrl);
      
      if (currentUrl.includes('sign-in')) {
        console.log('여전히 로그인 페이지로 리다이렉트됨 - 인증이 필요한 상태');
        
        // 페이지 스크린샷 저장
        await page.screenshot({ path: 'login-required.png' });
        console.log('로그인 필요 상태 스크린샷 저장됨: login-required.png');
        
      } else {
        console.log('5. accounting 페이지 접속 성공!');
        
        // 페이지 스크린샷 저장
        await page.screenshot({ path: 'accounting-page-success.png' });
        console.log('accounting 페이지 스크린샷 저장됨: accounting-page-success.png');
        
        // 임플란트 통계 탭 확인
        const implantStatsTab = await page.locator('text=임플란트 통계').isVisible().catch(() => false);
        if (implantStatsTab) {
          console.log('6. 임플란트 통계 탭 발견됨!');
          await page.click('text=임플란트 통계');
          await page.waitForTimeout(2000);
          
          await page.screenshot({ path: 'implant-stats-tab.png' });
          console.log('임플란트 통계 탭 스크린샷 저장됨: implant-stats-tab.png');
          
          // 통계 데이터가 표시되는지 확인
          const statsData = await page.locator('[data-testid="implant-stats-data"]').isVisible().catch(() => false);
          if (statsData) {
            console.log('7. 임플란트 통계 데이터 표시됨');
          } else {
            console.log('7. 임플란트 통계 데이터가 표시되지 않음');
          }
          
        } else {
          console.log('6. 임플란트 통계 탭을 찾을 수 없음');
          
          // 페이지의 모든 탭 텍스트 확인
          const allTabs = await page.locator('[role="tab"], .tab, button').allTextContents();
          console.log('페이지의 모든 탭/버튼:', allTabs);
        }
      }
    }
    
    // API 엔드포인트 직접 테스트
    console.log('8. API 엔드포인트 직접 테스트 중...');
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/implant-stats?startDate=2025-06-13&endDate=2025-06-13&doctor=all');
        const data = await res.json();
        return { status: res.status, data };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('API 응답 상태:', response.status);
    if (response.data) {
      console.log('API 데이터 개수:', response.data.data?.length || 0);
      console.log('누적 총계:', response.data.accumulatedTotal);
    }
    
  } catch (error) {
    console.error('테스트 중 오류 발생:', error);
  } finally {
    // 5초 대기 후 브라우저 종료
    console.log('5초 후 브라우저를 종료합니다...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

testImplantStats(); 