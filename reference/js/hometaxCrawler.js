// 현금영수증, 세금계산서 크롤링 스크립트

const { chromium } = require('playwright');
const mongoose = require('mongoose');
const HomeTaxReceipt = require('../models/HomeTaxReceipt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// 금액 문자열을 숫자로 변환하는 함수
function parseAmount(amountStr) {
  if (!amountStr) return 0;
  return parseInt(amountStr.replace(/[^0-9]/g, '')) || 0;
}

// 크롤링 상��를 업데이트하는 함수
function updateStatus(progress, message) {
    // routes/hometax.js에서 참조하는 전역 객체 업데이트
    global.crawlingStatus = {
        progress,
        message,
        isRunning: progress < 100
    };
}

async function hometaxLogin() {
  const browser = await chromium.launch({
    headless: true,
    slowMo: 500
  });
  
  try {
    updateStatus(5, '브라우저를 시작합니다...');
    const context = await browser.newContext();
    const page = await context.newPage();

    // 홈택스 페이지로 이동
    updateStatus(10, '홈택스 페이지로 이동 중...');
    await page.goto('https://hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_pp.xml&menuCd=index3', {
      waitUntil: 'networkidle'
    });
    
    // 간편인증 버튼이 나타날 때까지 대기
    updateStatus(15, '간편인증 버튼을 찾는 중...');
    await page.waitForSelector('#mf_txppWframe_loginboxFrame_anchor23', { timeout: 60000 });
    await page.click('#mf_txppWframe_loginboxFrame_anchor23');
    
    updateStatus(20, '로그인 모달이 로드되기를 기다리는 중...');
    await page.waitForTimeout(3000);

    // 프레임 찾기 시도
    const frames = page.frames();
    console.log('발견된 프레임 수:', frames.length);
    
    // 모달 프레임 찾기 (oacx/index.jsp URL로)
    const modalFrame = frames.find(frame => frame.url().includes('oacx/index.jsp'));
    if (modalFrame) {
      console.log('모달 프레임 찾음');
      
      // 네이버 로그인 버튼 클릭
      await modalFrame.click('img[alt="NAVER(네이버)"]');
      console.log('네이버 버튼 클릭 성공');
      
      // 이름 입력 필드가 나타날 때까지 대기
      await modalFrame.waitForSelector('input[data-id="oacx_name"]', { timeout: 60000 });
      
      // 환경변수 값 문자열로 변환
      const name = String(process.env.HOMETAX_NAME || '');
      const birth = String(process.env.HOMETAX_BIRTH || '');
      const phone = String(process.env.HOMETAX_PHONE || '');

      // 이름 입력
      await modalFrame.fill('input[data-id="oacx_name"]', name);
      console.log('이름 입력 완료');

      // 생년월일 입력
      await modalFrame.fill('input[data-id="oacx_birth"]', birth);
      console.log('생년월일 입력 완료');

      // 휴대폰번호 입력
      await modalFrame.fill('input[data-id="oacx_phone2"]', phone);
      console.log('휴대폰번호 입력 완료');

      // 체크박스 선택
      await modalFrame.check('#totalAgree');
      console.log('체크박스 선택 완료');

      // 인증 요청 버튼 클릭
      await modalFrame.click('#oacx-request-btn-pc');
      console.log('인증 요청 버튼 클릭 완료');

      // 새로운 모달이 로드될 때까지 대기
      await page.waitForTimeout(5000);

      // 새로운 프레임 찾기
      const newFrames = page.frames();
      console.log('새로운 모달 탐색 - 발견된 프레임 수:', newFrames.length);
      
      // 각 프레임의 URL 출력 (디버깅용)
      for (const frame of newFrames) {
        console.log('프레임 URL:', frame.url());
      }

      // 새로운 모달 프레임 찾기
      const newModalFrame = newFrames.find(frame => frame.url().includes('oacx'));
      if (newModalFrame) {
        console.log('새로운 모달 프레임 찾음');
        
        // 인증 완료 버튼이 나타날 때까지 대기
        await newModalFrame.waitForSelector('button.basic.sky.w70', { timeout: 60000 });
        console.log('인증 완료 버튼 발견, 7초 대기 시작...');
        
        // 15초 대기
        await page.waitForTimeout(7000);
        console.log('7초 대기 완료');
        
        // 인증 완료 버튼 클릭
        await newModalFrame.click('button.basic.sky.w70');
        console.log('인증 완료 버튼 클릭 성공');
        
        // 메인 페이지가 로드될 때까지 대기
        await page.waitForTimeout(5000);

        // 사업장전환 버튼이 나타날 때까지 대기
        await page.waitForSelector('#mf_wfHeader_group1508', { timeout: 60000 });
        console.log('사업장전환 버튼 발견');
        
        // 사업장전환 버튼 클릭
        await page.click('#mf_wfHeader_group1508');
        console.log('사업장전환 버튼 클릭 성공');

        // 새로운 모달이 로드될 때까지 대기
        await page.waitForTimeout(3000);

        // 모인 프레임에서 확인 버튼 찾기
        const mainFrame = await page.frames().find(frame => 
            frame.url().includes('/ui/pp/index_pp.xml')
          );
  
          if (mainFrame) {
            console.log('메인 프레임 찾음');
            
            // 모든 버튼 요소 출력 (디버깅용)
            const buttons = await mainFrame.$$('input[type="button"]');
            for (const button of buttons) {
              const value = await button.getAttribute('value');
              console.log('버튼 value:', value);
            }
            
            // 확인 버튼 찾아서 클릭
            const confirmButton = await mainFrame.$('input[type="button"][value="확인"]');
            if (confirmButton) {
              await confirmButton.click();
              console.log('확인 버튼 클릭 완료');
            }
          }

        // 모달이 사라질 때까지 대기
        await page.waitForTimeout(4000);

        // 홈택스 로고 클릭
//        await page.waitForSelector('#mf_wfHeader_hdGroup001');
//        await page.click('#mf_wfHeader_hdGroup001');
//        console.log('홈택스 로고 클릭 완료');

        // 새로운 URL로 이동
        await page.goto('https://hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_pp.xml&tmIdx=46&tm2lIdx=4609050000&tm3lIdx=4609050100', {
          waitUntil: 'networkidle'
        });
        console.log('새로운 URL로 이동 완료');

        // 매입 라디오 버튼 클릭
        await page.waitForSelector('label[for="mf_txppWframe_radio7_input_1"]');
        await page.click('label[for="mf_txppWframe_radio7_input_1"]');
        console.log('매입 라디오 버튼 클릭 완료');

        // 1개월 버튼 클릭
        await page.waitForSelector('#mf_txppWframe_btnChk3');
        await page.click('#mf_txppWframe_btnChk1');
        console.log('1개월 버튼 클릭 완료');

        // 조회 버튼 클릭
        await page.waitForSelector('#mf_txppWframe_trigger50');
        await page.click('#mf_txppWframe_trigger50');
        console.log('조회 버튼 클릭 완료');

        // 테이블 데이터 수집 함수
        async function collectTableData() {
          const tableData = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('#mf_txppWframe_resultGrid_body_table tbody tr'));
            return rows.map(row => {
              const cells = Array.from(row.querySelectorAll('td'));
              return {
                작성일자: cells[2]?.textContent.trim(),
                발급일자: cells[3]?.textContent.trim(),
                전송일자: cells[4]?.textContent.trim(),
                공급자등록번호: cells[6]?.textContent.trim(),
                상호: cells[8]?.textContent.trim(),
                대표자명: cells[9]?.textContent.trim(),
                품목명: cells[10]?.textContent.trim(),
                합계금액: cells[11]?.textContent.trim(),
                공급가액: cells[12]?.textContent.trim(),
                세액: cells[13]?.textContent.trim(),
                승인번호: cells[14]?.textContent.trim()
              };
            });
          });
          // 금액 데이터 숫자로 변환
          return tableData.map(item => ({
            ...item,
            합계금액: parseAmount(item.합계금액),
            공급가액: parseAmount(item.공급가액),
            세액: parseAmount(item.세액)
          }));
        }

        // 모든 페이지의 데이터 수집
        updateStatus(40, '세금계산서 데이터 수집 중...');
        let allData = [];
        let currentPage = 1;
        let hasNextPage = true;

        while (hasNextPage) {
          updateStatus(40 + (currentPage * 2), `세금계산서 ${currentPage}페이지 처리 중...`);
          console.log(`페이지 ${currentPage} 처리 중...`);
          
          // 현재 페이지 데이터 수집
          const pageData = await collectTableData();
          allData = allData.concat(pageData);
          
          // 다음 페이지 버튼 확인
          const nextPageSelector = `#mf_txppWframe_pglNavi_page_${currentPage + 1}`;
          const hasNext = await page.$(nextPageSelector);
          
          if (hasNext) {
            await page.click(nextPageSelector);
            await page.waitForTimeout(1000); // 페이지 로딩 대기
            currentPage++;
          } else {
            hasNextPage = false;
          }
        }

        console.log('수집된 전체 데이터:', allData);
        
        // MongoDB에 데이터 저장
        try {
          // MongoDB 연결
          await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: 'hospital_accounting'
          });
          
          console.log('MongoDB 연결 성공');
          
          // 데이터 저장 (중복 방지)
          for (const item of allData) {
            await HomeTaxReceipt.updateOne(
              { 승인번호: item.승인번호 },  // 조건
              item,                        // 새로운 데이터
              { upsert: true }            // 없으면 생성
            );
          }
          console.log('세금계산서 데이터가 MongoDB에 성공적으로 저장되었습니다.');
          
        } catch (error) {
          console.error('MongoDB 저장 중 에러 발생:', error);
        }

        // 매입 현금영수증서 조회 페이지로 이동
        await page.goto('https://hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_pp.xml&tmIdx=46&tm2lIdx=4605010000&tm3lIdx=4605010100', {
          waitUntil: 'networkidle'
        });
        console.log('매출 현금영수증 조회 페이지로 이동 완료');

        // 페이지 로딩 대기
        await page.waitForTimeout(3000);

        // 월별 탭 클릭
        await page.waitForSelector('#mf_txppWframe_tabControl1_UTECRCB005_tab_tabs3');
        await page.click('#mf_txppWframe_tabControl1_UTECRCB005_tab_tabs3');
        console.log('월별 탭 클릭 완료');

        // 이번 달과 지난 달 옵션 계산
        const today = new Date();
        const thisYear = today.getFullYear();
        const thisMonth = today.getMonth() + 1;
        
        const lastMonth = thisMonth - 1;
        const lastYear = lastMonth === 0 ? thisYear - 1 : thisYear;
        const lastMonthNumber = lastMonth === 0 ? 12 : lastMonth;

        const months = [
          {
            year: thisYear,
            month: String(thisMonth).padStart(2, '0'),
            label: '이번 달'
          },
          {
            year: lastYear,
            month: String(lastMonthNumber).padStart(2, '0'),
            label: '지난 달'
          }
        ];

        // 각 월별로 데이터 수집
        updateStatus(70, '현금영수증 데이터 수집 시작...');
        for (const monthData of months) {
          updateStatus(70 + (monthData.label === '이 달' ? 10 : 20), 
              `${monthData.label} 현금영수증 데이터 수집 중...`);
          const monthOption = `${monthData.year}년 ${monthData.month}월`;
          console.log(`${monthData.label} (${monthOption}) 데이터 수집 시작`);

          // 셀렉트 박스에서 월 선택
          await page.waitForSelector('#mf_txppWframe_selectbox5');
          await page.selectOption('#mf_txppWframe_selectbox5', monthOption);
          console.log(`${monthData.label} 선택 완료:`, monthOption);

          // 조회 버튼 클릭
          await page.waitForSelector('#mf_txppWframe_trigger1');
          await page.click('#mf_txppWframe_trigger1');
          console.log('조회 버튼 클릭 완료');

          // 조회 결과 로딩 대기
          await page.waitForTimeout(3000);

          // 현금영수증 테이블 데이터 수집 함수
          async function collectCashReceiptData() {
            const tableData = await page.evaluate(() => {
              const rows = Array.from(document.querySelectorAll('#mf_txppWframe_grdCshpt_body_tbody tr'));
              return rows.map(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                return {
                  매입일시: cells[2]?.textContent.trim(),
                  사용자명: cells[3]?.textContent.trim(),
                  가맹점사업자번호: cells[4]?.textContent.trim(),
                  가맹점명: cells[5]?.querySelector('a')?.textContent.trim(),
                  업종코드: cells[6]?.textContent.trim(),
                  업종: cells[7]?.textContent.trim(),
                  업태: cells[8]?.textContent.trim(),
                  공급가액: cells[9]?.textContent.trim(),
                  부가세: cells[10]?.textContent.trim(),
                  봉사료: cells[11]?.textContent.trim(),
                  매입금액: cells[12]?.textContent.trim(),
                  승인번호: cells[13]?.textContent.trim(),
                  발급수단: cells[14]?.textContent.trim(),
                  거래구분: cells[15]?.textContent.trim(),
                  거래일자: cells[16]?.textContent.trim(),
                  가맹점납세자통합관리번호: cells[17]?.textContent.trim(),
                  공제여부: cells[18]?.textContent.trim()
                };
              });
            });
            // 금액 데이터 숫자로 변환
            return tableData.map(item => ({
              ...item,
              공급가액: parseAmount(item.공급가액),
              부가세: parseAmount(item.부가세),
              봉사료: parseAmount(item.봉사료),
              매입금액: parseAmount(item.매입금액)
            }));
          }

          // 모든 페이지의 데이터 수집
          let allCashReceiptData = [];
          let cashReceiptCurrentPage = 1;
          let hasCashReceiptNextPage = true;

          while (hasCashReceiptNextPage) {
            console.log(`${monthData.label} 현금영수증 페이지 ${cashReceiptCurrentPage} 처리 중...`);
            
            // 현재 페이지 데이터 수집
            const pageData = await collectCashReceiptData();
            allCashReceiptData = allCashReceiptData.concat(pageData);
            
            // 다음 페이지 버튼 확인
            const nextPageSelector = `#mf_txppWframe_pglNavi_page_${cashReceiptCurrentPage + 1}`;
            const hasNext = await page.$(nextPageSelector);
            
            if (hasNext) {
              await page.click(nextPageSelector);
              await page.waitForTimeout(2000); // 페이지 로딩 대기
              cashReceiptCurrentPage++;
            } else {
              hasCashReceiptNextPage = false;
            }
          }

          console.log(`${monthData.label} 수집된 현금영수증 데이터:`, allCashReceiptData);
          
          // MongoDB에 현금영수증 데이터 저장
          try {
            const HomeTaxCashReceipt = require('../models/HomeTaxCashReceipt');
            
            // 데이터 저장 (중복 방지)
            for (const item of allCashReceiptData) {
              await HomeTaxCashReceipt.updateOne(
                { 승인번호: item.승인번호 },  // 조건
                item,                        // 새로운 데이터
                { upsert: true }            // 없으면 생성
              );
            }
            console.log(`${monthData.label} 현금영수증 데이터가 MongoDB에 성공적으로 저장되었습니다.`);
            
          } catch (error) {
            console.error(`${monthData.label} 현금영수증 데이터 MongoDB 저장 중 에러 발생:`, error);
          }

          // 다음 달 처리 전 잠시 대기
          await page.waitForTimeout(2000);
        }

        updateStatus(100, '크롤링이 완료되었습니다.');
        
      }
    }
  } catch (error) {
    console.error('에러 발생:', error);
    updateStatus(0, '크롤링 오류가 발생했습니다.');
    throw error;
  } finally {
    await browser.close();
  }
}

// 스크립트 실행 부분 제거하고 함수 export
module.exports = {
    hometaxLogin
};