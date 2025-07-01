import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { chromium } from 'playwright';
import { MongoClient } from 'mongodb';
import { format } from 'date-fns';

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined');
}

const client = new MongoClient(process.env.MONGODB_URI);

// 전역 상태 관리 (실제 프로덕션에서는 Redis 등을 사용)
let crawlingStatus = {
  isRunning: false,
  progress: 0,
  message: '',
  startedAt: null as Date | null,
  completedAt: null as Date | null,
  error: null as string | null
};

async function extractTableData(page: any) {
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
          issueType: await row.$eval('td[data-col_id="pblClCd"] nobr', (el: any) => el.textContent),
          transactionDate: await row.$eval('td[data-col_id="trsDtm"] nobr', (el: any) => new Date(el.textContent)),
          supplyAmount: await row.$eval('td[data-col_id="splCft"] nobr', (el: any) => parseInt(el.textContent.replace(/,/g, '')) || 0),
          vat: await row.$eval('td[data-col_id="vaTxamt"] nobr', (el: any) => parseInt(el.textContent.replace(/,/g, '')) || 0),
          serviceCharge: await row.$eval('td[data-col_id="tip"] nobr', (el: any) => parseInt(el.textContent.replace(/,/g, '')) || 0),
          totalAmount: await row.$eval('td[data-col_id="totaTrsAmt"] nobr', (el: any) => parseInt(el.textContent.replace(/,/g, '')) || 0),
          approvalNumber: await row.$eval('td[data-col_id="aprvNo"] nobr', (el: any) => el.textContent),
          issueMethod: await row.$eval('td[data-col_id="spstCnfrPartNo"] nobr', (el: any) => el.textContent),
          transactionType: await row.$eval('td[data-col_id="trsClNm"] nobr', (el: any) => el.textContent),
          usageType: await row.$eval('td[data-col_id="cshptUsgClNm"] nobr', (el: any) => el.textContent),
          note: await row.$eval('td[data-col_id="cshptTrsTypeNm"] nobr', (el: any) => el.textContent)
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

async function saveToDatabase(receipts: any[], db: any) {
  try {
    if (!receipts || receipts.length === 0) {
      return;
    }

    const collection = db.collection('hometaxcashreceipts');
    
    // 각 영수증에 대해 중복 체크 후 저장
    for (const receipt of receipts) {
      // MongoDB 필드명으로 변환
      const mongoReceipt = {
        승인번호: receipt.approvalNumber,
        거래일자: format(receipt.transactionDate, 'yyyy-MM-dd'),
        공급가액: receipt.supplyAmount,
        부가세: receipt.vat,
        봉사료: receipt.serviceCharge,
        매입금액: receipt.totalAmount,
        발급수단: receipt.issueMethod,
        거래구분: receipt.transactionType,
        사용구분: receipt.usageType,
        비고: receipt.note,
        type: receipt.issueType,
        createdAt: new Date()
      };
      
      const exists = await collection.findOne({ 
        승인번호: mongoReceipt.승인번호 
      });
      
      if (!exists) {
        await collection.insertOne(mongoReceipt);
      }
    }
  } catch (error) {
    console.error('DB 저장 중 오류:', error);
    throw error;
  }
}

async function processAllPages(page: any, db: any) {
  try {
    let hasMorePages = true;
    let currentPage = 1;

    while (hasMorePages) {
      crawlingStatus.message = `${currentPage}페이지 데이터 수집 중...`;
      crawlingStatus.progress = Math.min(50 + (currentPage * 10), 80);
      
      // 현재 페이지의 데이터 추출
      const receipts = await extractTableData(page);
      
      // DB에 저장
      if (receipts.length > 0) {
        await saveToDatabase(receipts, db);
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

async function runCrawling() {
  let browser;
  
  try {
    await client.connect();
    const db = client.db('hospital_accounting');
    
    crawlingStatus.progress = 10;
    crawlingStatus.message = '브라우저 시작 중...';
    
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();

    crawlingStatus.progress = 20;
    crawlingStatus.message = '홈택스 페이지로 이동 중...';
    
    // 홈택스 페이지로 이동
    await page.goto('https://hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_pp.xml&menuCd=index3');
    
    crawlingStatus.progress = 30;
    crawlingStatus.message = '로그인 진행 중...';
    
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
    
    crawlingStatus.progress = 40;
    crawlingStatus.message = '현금영수증 조회 페이지로 이동 중...';
    
    // 지정된 페이지로 이동
    await page.goto('https://hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_pp.xml&tmIdx=46&tm2lIdx=4606010000&tm3lIdx=4606010100');
    
    // 페이지 로딩 대기
    await page.waitForLoadState('networkidle');

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
    
    let totalProgress = 50;
    const progressPerMonth = 40 / monthsToProcess.length; // 50~90% 구간을 월별로 분배
    
    // 각 월별로 데이터 크롤링
    for (const monthInfo of monthsToProcess) {
      crawlingStatus.progress = totalProgress;
      crawlingStatus.message = `${monthInfo.label} 데이터 조회 중...`;
      
      // 셀렉트박스에서 해당 월 선택
      await page.selectOption('#mf_txppWframe_selectbox5', {
        label: monthInfo.label
      });
      await page.waitForTimeout(1000);

      // 조회 버튼 클릭
      await page.click('#mf_txppWframe_trigger1');
      
      // 데이터 로딩 대기
      await page.waitForTimeout(3000);

      // 모든 페이지 처리
      await processAllPages(page, db);
      
      totalProgress += progressPerMonth;
    }
    
    crawlingStatus.progress = 100;
    crawlingStatus.message = '크롤링 완료!';
    crawlingStatus.completedAt = new Date();
    
  } catch (error) {
    console.error('크롤링 중 오류:', error);
    crawlingStatus.error = error instanceof Error ? error.message : '알 수 없는 오류';
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
    await client.close();
    crawlingStatus.isRunning = false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 이미 크롤링이 진행 중인지 확인
    if (crawlingStatus.isRunning) {
      return NextResponse.json({ 
        error: '이미 크롤링이 진행 중입니다.',
        status: crawlingStatus 
      }, { status: 400 });
    }

    // 크롤링 상태 초기화
    crawlingStatus = {
      isRunning: true,
      progress: 0,
      message: '홈텍스 크롤링을 시작합니다...',
      startedAt: new Date(),
      completedAt: null,
      error: null
    };

    // 백그라운드에서 크롤링 실행
    runCrawling().catch(error => {
      console.error('크롤링 에러:', error);
      crawlingStatus.error = error.message;
      crawlingStatus.isRunning = false;
    });

    return NextResponse.json({
      success: true,
      message: '홈텍스 크롤링이 시작되었습니다.',
      status: crawlingStatus
    });

  } catch (error) {
    console.error('크롤링 시작 에러:', error);
    crawlingStatus.isRunning = false;
    crawlingStatus.error = error instanceof Error ? error.message : '알 수 없는 오류';
    
    return NextResponse.json(
      { error: '크롤링 시작 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 크롤링 상태 확인 API
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      status: crawlingStatus
    });

  } catch (error) {
    console.error('상태 확인 에러:', error);
    return NextResponse.json(
      { error: '상태 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}