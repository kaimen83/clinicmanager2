const { chromium } = require('playwright');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const HometaxCashReceipt = require('../models/hometax_CashReceipt');

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: 'hospital_accounting'
}).catch((err) => {
  console.error('MongoDB 연결 실패:', err);
  process.exit(1);
});

async function extractTableData(page) {
  try {
    const rows = await page.$$('#mf_txppWframe_grdCshpt_body_tbody tr');
    
    if (rows.length === 0) {
      return [];
    }

    const receipts = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const receipt = {
          issueType: await row.$eval('td[data-col_id="pblClCd"] nobr', el => el.textContent),
          transactionDate: await row.$eval('td[data-col_id="trsDtm"] nobr', el => new Date(el.textContent)),
          supplyAmount: await row.$eval('td[data-col_id="splCft"] nobr', el => parseInt(el.textContent.replace(/,/g, '')) || 0),
          vat: await row.$eval('td[data-col_id="vaTxamt"] nobr', el => parseInt(el.textContent.replace(/,/g, '')) || 0),
          serviceCharge: await row.$eval('td[data-col_id="tip"] nobr', el => parseInt(el.textContent.replace(/,/g, '')) || 0),
          totalAmount: await row.$eval('td[data-col_id="totaTrsAmt"] nobr', el => parseInt(el.textContent.replace(/,/g, '')) || 0),
          approvalNumber: await row.$eval('td[data-col_id="aprvNo"] nobr', el => el.textContent),
          issueMethod: await row.$eval('td[data-col_id="spstCnfrPartNo"] nobr', el => el.textContent),
          transactionType: await row.$eval('td[data-col_id="trsClNm"] nobr', el => el.textContent),
          usageType: await row.$eval('td[data-col_id="cshptUsgClNm"] nobr', el => el.textContent),
          note: await row.$eval('td[data-col_id="cshptTrsTypeNm"] nobr', el => el.textContent)
        };
        receipts.push(receipt);
      } catch (error) {
        console.error(`데이터 추출 중 오류:`, error);
      }
    }

    return receipts;
  } catch (error) {
    console.error('데이터 추출 중 오류 발생:', error);
    return [];
  }
}

async function saveToDatabase(receipts) {
  try {
    if (!receipts || receipts.length === 0) {
      return;
    }

    // 각 영수증에 대해 중복 체크 후 저장
    for (const receipt of receipts) {
      const exists = await HometaxCashReceipt.findOne({ 
        approvalNumber: receipt.approvalNumber 
      });
      
      if (!exists) {
        await HometaxCashReceipt.create(receipt);
      }
    }
  } catch (error) {
    console.error('DB 저장 중 오류:', error);
    throw error;
  }
}

async function processAllPages(page) {
  try {
    let hasMorePages = true;
    let currentPage = 1;

    while (hasMorePages) {
      // 현재 페이지의 데이터 추출
      const receipts = await extractTableData(page);
      
      // DB에 저장
      if (receipts.length > 0) {
        console.log(`${receipts.length}건의 데이터를 저장 중...`);
        await saveToDatabase(receipts);
      }

      // 다음 페이지 버튼 찾기
      const nextPageSelector = `#mf_txppWframe_pglNavi_page_${currentPage + 1}`;
      const nextPageExists = await page.$(nextPageSelector);

      if (nextPageExists) {
        // 다음 페이지로 이동
        await page.click(nextPageSelector);
        await page.waitForTimeout(2000); // 페이지 로딩 대기
        currentPage++;
      } else {
        hasMorePages = false;
      }
    }
  } catch (error) {
    console.error('페이지 처리 중 오류:', error);
  }
}

async function loginToHometax() {
  console.log('홈텍스 크롤링을 시작합니다...');
  
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome'
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('홈택스 페이지로 이동 중...');
    // 홈택스 페이지로 이동
    await page.goto('https://hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_pp.xml&menuCd=index3');
    
    console.log('로그인 진행 중...');
    // 아이디 로그인 버튼 클릭
    await page.click('#mf_txppWframe_loginboxFrame_anchor24');
    
    // 아이디 입력
    await page.fill('#mf_txppWframe_loginboxFrame_iptUserId', 'kaimen83');
    
    // 비밀번호 입력
    await page.fill('#mf_txppWframe_loginboxFrame_iptUserPw', 'pswd2371');
    
    // 로그인 버튼 클릭
    await page.click('.btn_cm.edit.btn_idlogin');
    
    // 로그인 완료 대기
    await page.waitForTimeout(3000);
    console.log('로그인 완료');
    
    console.log('현금영수증 조회 페이지로 이동 중...');
    // 지정된 페이지로 이동
    await page.goto('https://hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_pp.xml&tmIdx=46&tm2lIdx=4606010000&tm3lIdx=4606010100');
    
    // 페이지 로딩 대기
    await page.waitForLoadState('networkidle');

    console.log('월별 조회 탭 선택...');
    // 월별 탭 클릭
    await page.click('#mf_txppWframe_tabControl1_UTECRCB057_tab_tabs3');
    await page.waitForTimeout(1000);

    // 현재 날짜와 지난 달 계산
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 0-based이므로 +1
    
    // 지난 달 계산
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = currentYear - 1;
    }
    
    // 크롤링할 월 목록 (지난 달과 이번 달)
    const monthsToProcess = [
      { year: prevYear, month: prevMonth, label: `${prevYear}년 ${String(prevMonth).padStart(2, '0')}월` },
      { year: currentYear, month: currentMonth, label: `${currentYear}년 ${String(currentMonth).padStart(2, '0')}월` }
    ];
    
    // 각 월별로 데이터 크롤링
    for (const monthInfo of monthsToProcess) {
      console.log(`${monthInfo.label} 데이터 조회 중...`);
      
      // 셀렉트박스에서 해당 월 선택
      await page.selectOption('#mf_txppWframe_selectbox5', {
        label: monthInfo.label
      });
      await page.waitForTimeout(1000);

      // 조회 버튼 클릭
      await page.click('#mf_txppWframe_trigger1');
      
      // 데이터 로딩 대기
      await page.waitForTimeout(3000);

      console.log('페이지별 데이터 수집 시작...');
      // 모든 페이지 처리
      await processAllPages(page);
    }
    
    console.log('모든 데이터 수집 완료!');

  } catch (error) {
    console.error('프로세스 실행 중 오류:', error);
  } finally {
    await browser.close();
    await mongoose.disconnect();
  }
}

loginToHometax(); 