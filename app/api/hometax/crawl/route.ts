import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 크롤링 상태 초기화
    global.crawlingStatus = {
      progress: 0,
      message: '크롤링을 시작합니다...',
      isRunning: true
    };

    // 크롤링 실행 (비동기)
    startCrawlingProcess().catch(error => {
      console.error('크롤링 프로세스 오류:', error);
      global.crawlingStatus = {
        progress: 0,
        message: '크롤링 중 오류가 발생했습니다.',
        isRunning: false
      };
    });

    return NextResponse.json({ success: true, message: '크롤링이 시작되었습니다.' });
  } catch (error) {
    console.error('크롤링 API 오류:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function startCrawlingProcess() {
  try {
    // 크롤링 로직을 직접 구현 (서버 환경에서 실행)
    const { chromium } = require('playwright');
    const { connectToDatabase } = await import('@/lib/mongodb');
    const { HomeTaxReceipt } = await import('@/lib/models/HomeTaxReceipt');
    const { HomeTaxCashReceipt } = await import('@/lib/models/HomeTaxCashReceipt');

    // 금액 문자열을 숫자로 변환하는 함수
    function parseAmount(amountStr: string) {
      if (!amountStr) return 0;
      return parseInt(amountStr.replace(/[^0-9]/g, '')) || 0;
    }

    // 크롤링 상태를 업데이트하는 함수
    function updateStatus(progress: number, message: string) {
      global.crawlingStatus = {
        progress,
        message,
        isRunning: progress < 100
      };
    }

    await connectToDatabase();

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
      
      // 모달 프레임 찾기 (oacx/index.jsp URL로)
      const modalFrame = frames.find((frame: any) => frame.url().includes('oacx/index.jsp'));
      if (modalFrame) {
        // 네이버 로그인 버튼 클릭
        await modalFrame.click('img[alt="NAVER(네이버)"]');
        
        // 이름 입력 필드가 나타날 때까지 대기
        await modalFrame.waitForSelector('input[data-id="oacx_name"]', { timeout: 60000 });
        
        // 환경변수 값 문자열로 변환
        const name = String(process.env.HOMETAX_NAME || '');
        const birth = String(process.env.HOMETAX_BIRTH || '');
        const phone = String(process.env.HOMETAX_PHONE || '');

        // 이름 입력
        await modalFrame.fill('input[data-id="oacx_name"]', name);

        // 생년월일 입력
        await modalFrame.fill('input[data-id="oacx_birth"]', birth);

        // 휴대폰번호 입력
        await modalFrame.fill('input[data-id="oacx_phone2"]', phone);

        // 체크박스 선택
        await modalFrame.check('#totalAgree');

        // 인증 요청 버튼 클릭
        await modalFrame.click('#oacx-request-btn-pc');

        // 새로운 모달이 로드될 때까지 대기
        await page.waitForTimeout(5000);

        // 새로운 프레임 찾기
        const newFrames = page.frames();
        
        // 새로운 모달 프레임 찾기
        const newModalFrame = newFrames.find((frame: any) => frame.url().includes('oacx'));
        if (newModalFrame) {
          // 인증 완료 버튼이 나타날 때까지 대기
          await newModalFrame.waitForSelector('button.basic.sky.w70', { timeout: 60000 });
          
          // 7초 대기
          await page.waitForTimeout(7000);
          
          // 인증 완료 버튼 클릭
          await newModalFrame.click('button.basic.sky.w70');
          
          // 메인 페이지가 로드될 때까지 대기
          await page.waitForTimeout(5000);

          // 사업장전환 버튼이 나타날 때까지 대기
          await page.waitForSelector('#mf_wfHeader_group1508', { timeout: 60000 });
          
          // 사업장전환 버튼 클릭
          await page.click('#mf_wfHeader_group1508');

          // 새로운 모달이 로드될 때까지 대기
          await page.waitForTimeout(3000);

          // 메인 프레임에서 확인 버튼 찾기
          const mainFrame = await page.frames().find((frame: any) => 
              frame.url().includes('/ui/pp/index_pp.xml')
            );
    
            if (mainFrame) {
              // 확인 버튼 찾아서 클릭
              const confirmButton = await mainFrame.$('input[type="button"][value="확인"]');
              if (confirmButton) {
                await confirmButton.click();
              }
            }

          // 모달이 사라질 때까지 대기
          await page.waitForTimeout(4000);

          // 새로운 URL로 이동
          await page.goto('https://hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_pp.xml&tmIdx=46&tm2lIdx=4609050000&tm3lIdx=4609050100', {
            waitUntil: 'networkidle'
          });

          // 매입 라디오 버튼 클릭
          await page.waitForSelector('label[for="mf_txppWframe_radio7_input_1"]');
          await page.click('label[for="mf_txppWframe_radio7_input_1"]');

          // 1개월 버튼 클릭
          await page.waitForSelector('#mf_txppWframe_btnChk3');
          await page.click('#mf_txppWframe_btnChk1');

          // 조회 버튼 클릭
          await page.waitForSelector('#mf_txppWframe_trigger50');
          await page.click('#mf_txppWframe_trigger50');

          // 테이블 데이터 수집 함수
          async function collectTableData() {
            const tableData = await page.evaluate(() => {
              const rows = Array.from(document.querySelectorAll('#mf_txppWframe_resultGrid_body_table tbody tr'));
              return rows.map(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                return {
                  작성일자: cells[2]?.textContent?.trim(),
                  발급일자: cells[3]?.textContent?.trim(),
                  전송일자: cells[4]?.textContent?.trim(),
                  공급자등록번호: cells[6]?.textContent?.trim(),
                  상호: cells[8]?.textContent?.trim(),
                  대표자명: cells[9]?.textContent?.trim(),
                  품목명: cells[10]?.textContent?.trim(),
                  합계금액: cells[11]?.textContent?.trim(),
                  공급가액: cells[12]?.textContent?.trim(),
                  세액: cells[13]?.textContent?.trim(),
                  승인번호: cells[14]?.textContent?.trim()
                };
              });
            });
            // 금액 데이터 숫자로 변환
            return tableData.map((item: any) => ({
              ...item,
              합계금액: parseAmount(item.합계금액),
              공급가액: parseAmount(item.공급가액),
              세액: parseAmount(item.세액)
            }));
          }

          // 모든 페이지의 데이터 수집
          updateStatus(40, '세금계산서 데이터 수집 중...');
          let allData: any[] = [];
          let currentPage = 1;
          let hasNextPage = true;

          while (hasNextPage) {
            updateStatus(40 + (currentPage * 2), `세금계산서 ${currentPage}페이지 처리 중...`);
            
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
          
          // MongoDB에 데이터 저장
          try {
            // 데이터 저장 (중복 방지)
            for (const item of allData) {
              await HomeTaxReceipt.updateOne(
                { 승인번호: item.승인번호 },  // 조건
                item,                        // 새로운 데이터
                { upsert: true }            // 없으면 생성
              );
            }
            
          } catch (error) {
            console.error('MongoDB 저장 중 에러 발생:', error);
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
  } catch (error) {
    console.error('크롤링 실행 오류:', error);
    throw error;
  }
}

// 타입 확장
declare global {
  var crawlingStatus: {
    progress: number;
    message: string;
    isRunning: boolean;
  };
}