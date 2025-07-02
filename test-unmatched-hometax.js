const { chromium } = require('playwright');

async function testUnmatchedHometaxModal() {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🚀 브라우저에서 애플리케이션 접속 중...');
    await page.goto('http://localhost:3000');
    
    // 로그인 페이지로 리다이렉트되는지 확인
    await page.waitForURL('**/sign-in**');
    console.log('📝 로그인 페이지로 리다이렉트됨');
    
    // 사용자에게 수동 로그인을 요청
    console.log('⏸️  수동으로 로그인해주세요. 로그인 완료 후 Enter를 눌러주세요...');
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });
    
    // 대시보드 페이지 대기
    await page.waitForURL('**/dashboard**', { timeout: 30000 });
    console.log('✅ 대시보드 페이지 로드 완료');
    
    // 현금/계좌이체 버튼 찾기 및 클릭
    console.log('🔍 현금/계좌이체 버튼 찾는 중...');
    const cashButton = await page.getByText('현금', { exact: false }).first();
    await cashButton.waitFor({ state: 'visible', timeout: 10000 });
    await cashButton.click();
    console.log('✅ 현금/계좌이체 모달 열림');
    
    // 날짜를 6월로 변경 (테스트 데이터가 있는 날짜)
    console.log('📅 날짜를 6월 2일로 변경 중...');
    const dateInput = await page.locator('input[type="date"]').first();
    await dateInput.fill('2025-06-02');
    
    // 잠시 대기 후 데이터 로드 확인
    await page.waitForTimeout(2000);
    
    // 매칭되지 않은 데이터 버튼 찾기
    console.log('🔍 매칭되지 않은 데이터 버튼 찾는 중...');
    const unmatchedButton = await page.getByText('매칭 안된 데이터').first();
    
    if (await unmatchedButton.isVisible()) {
      console.log('✅ 매칭되지 않은 데이터 버튼 발견');
      await unmatchedButton.click();
      console.log('🔍 매칭되지 않은 데이터 모달 열림');
      
      // 모달 내용 확인
      await page.waitForTimeout(2000);
      
      // 모달에 표시된 데이터 개수 확인
      const dateGroups = await page.locator('[data-testid="date-group"]').count();
      console.log(`📊 표시된 날짜 그룹 수: ${dateGroups}`);
      
      // 각 날짜 그룹의 데이터 개수 확인
      for (let i = 0; i < Math.min(dateGroups, 3); i++) {
        const group = page.locator('[data-testid="date-group"]').nth(i);
        const dateText = await group.locator('h4').textContent();
        const itemCount = await group.locator('tbody tr').count();
        console.log(`📅 ${dateText}: ${itemCount}건의 데이터`);
      }
      
      // API 호출 로그 확인을 위해 네트워크 모니터링
      const apiCalls = [];
      page.on('response', response => {
        if (response.url().includes('/api/hometax/unmatched')) {
          apiCalls.push({
            url: response.url(),
            status: response.status(),
            data: response.json().catch(() => null)
          });
        }
      });
      
      console.log('📡 API 호출 로그:', apiCalls);
      
    } else {
      console.log('❌ 매칭되지 않은 데이터 버튼을 찾을 수 없음');
    }
    
    // 스크린샷 촬영
    await page.screenshot({ path: 'unmatched-modal-test.png', fullPage: true });
    console.log('📸 스크린샷 저장: unmatched-modal-test.png');
    
    console.log('⏸️  브라우저를 닫으려면 Enter를 눌러주세요...');
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });
    
  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error);
  } finally {
    await browser.close();
  }
}

// Node.js에서 stdin 사용을 위한 설정
process.stdin.setRawMode(true);
process.stdin.resume();

testUnmatchedHometaxModal().catch(console.error); 