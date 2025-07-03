import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { chromium } from 'playwright';
import { MongoClient } from 'mongodb';

// 입금예정일 계산 함수
const calculateExpectedDepositDate = (saleDate: Date) => {
  let date = new Date(saleDate);
  let businessDays = 0;
  
  // 시작일을 다음날로 설정
  date.setDate(date.getDate() + 1);
  
  while (businessDays < 2) {
    // 주말이 아닌 경우에만 영업일 카운트
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      businessDays++;
    }
    
    // 다음 날로 이동
    if (businessDays < 2) {
      date.setDate(date.getDate() + 1);
    }
  }
  
  return date;
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // MongoDB 연결
    const client = new MongoClient(process.env.MONGODB_URI || '');
    await client.connect();
    const db = client.db(process.env.MONGODB_DATABASE || 'hospital_accounting');

    // 크롤링 실행
    const crawler = new CardSalesCrawler();
    
    try {
      await crawler.initialize();
      
      // 환경변수에서 로그인 정보 가져오기
      const loginSuccess = await crawler.login(
        process.env.CARDSALES_ID || '',
        process.env.CARDSALES_PASSWORD || ''
      );
      
      if (!loginSuccess) {
        throw new Error('로그인에 실패했습니다.');
      }
      
      const data = await crawler.searchPayments();
      
      if (!data || data.length === 0) {
        throw new Error('매출 데이터를 가져올 수 없습니다.');
      }
      
      // 데이터 처리
      const result = await crawler.processPaymentData(data, userId, db);
      
      await client.close();
      
      return NextResponse.json({
        success: true,
        message: '크롤링이 완료되었습니다.',
        processed: result.processed.length,
        errors: result.errors.length
      });
      
    } finally {
      await crawler.close();
    }
    
  } catch (error: any) {
    console.error('크롤링 오류:', error);
    return NextResponse.json({
      success: false,
      message: error.message || '크롤링 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}

// 크롤링 클래스
class CardSalesCrawler {
  private browser: any = null;
  private context: any = null;
  private page: any = null;

  async initialize() {
    try {
      // 크롤링 방지 우회를 위한 설정
      this.browser = await chromium.launch({
        headless: false, // 헤드풀 모드로 실행
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled'
        ]
      });

      // 브라우저 컨텍스트 생성
      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        locale: 'ko-KR',
        timezoneId: 'Asia/Seoul',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      // 새 페이지 생성
      this.page = await this.context.newPage();

      // 리소스 차단 (성능 최적화)
      await this.context.route('**/*.{png,jpg,jpeg,gif,svg,css,woff,woff2,ttf,otf}', (route: any) => route.abort());
      await this.context.route('**/analytics.js', (route: any) => route.abort());
      await this.context.route('**/gtag.js', (route: any) => route.abort());
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  async login(userId: string, password: string) {
    try {
      // 로그인 페이지로 이동
      await this.page.goto('https://www.cardsales.or.kr/signin', {
        waitUntil: 'networkidle'
      });
      
      // 랜덤 대기 시간 추가
      await this.page.waitForTimeout(Math.random() * 2000 + 1000);
      
      // ID 입력 필드가 나타날 때까지 대기
      await this.page.waitForSelector('#j_username', { timeout: 30000 });
      
      // 사람처럼 천천히 입력
      await this.page.fill('#j_username', userId, { timeout: 30000 });
      await this.page.waitForTimeout(Math.random() * 1000 + 500);
      
      await this.page.fill('#j_password', password, { timeout: 30000 });
      await this.page.waitForTimeout(Math.random() * 1000 + 500);
      
      // Promise.all을 사용하여 동시에 여러 이벤트 대기
      await Promise.all([
        this.page.waitForLoadState('networkidle'),
        this.page.waitForNavigation({ timeout: 30000 }),
        this.page.click('#goLogin')
      ]);
      
      // 로그인 성공 여부 확인
      const currentUrl = this.page.url();
      const isLoggedIn = !currentUrl.includes('/signin');
      
      return isLoggedIn;
    } catch (error) {
      console.error('로그인 오류:', error);
      return false;
    }
  }

  async searchPayments() {
    try {
      // 기간별 매출조회 페이지로 이동
      await this.page.goto('https://www.cardsales.or.kr/page/payment/term', {
        waitUntil: 'networkidle'
      });
      
      // 랜덤 대기
      await this.page.waitForTimeout(Math.random() * 2000 + 1000);
      
      // 조회 버튼이 나타날 때까지 대기
      await this.page.waitForSelector('#searchBtn', { timeout: 30000 });
      
      // Promise.all을 사용하여 동시에 여러 이벤트 대기
      await Promise.all([
        this.page.waitForLoadState('networkidle'),
        this.page.click('#searchBtn')
      ]);

      // 체크박스가 나타날 때까지 대기
      await this.page.waitForSelector('input[type="checkbox"]', { timeout: 30000 });
      
      // 체크박스 클릭
      await this.page.click('input[type="checkbox"]');
      
      // 페이지당 데이터 수를 50개로 변경
      await this.page.waitForSelector('#dataPerPage', { timeout: 30000 });
      await this.page.selectOption('#dataPerPage', '50');
      
      // 상세 내용이 로드될 때까지 대기
      await this.page.waitForSelector('#detail-content tr[name="detailTmplTr"]', { timeout: 30000 });
      
      // 랜덤 대기
      await this.page.waitForTimeout(Math.random() * 2000 + 1000);
      
      // 데이터 추출
      const data = await this.extractTableData();
      
      if (!data || data.length === 0) {
        throw new Error('데이터를 추출할 수 없습니다.');
      }
      
      // 데이터 처리 (userId 전달 필요)
      // 이 부분은 searchPayments 메서드에서 userId를 받아야 함
      
      return data;
    } catch (error) {
      console.error('매출 조회 오류:', error);
      throw error;
    }
  }

  async extractTableData() {
    try {
      const rows = await this.page.evaluate(() => {
        const tableRows = document.querySelectorAll('#detail-content tr[name="detailTmplTr"]');
        return Array.from(tableRows).map((row: any) => {
          const cells = row.getElementsByTagName('td');
          return {
            날짜: cells[1].textContent.trim(),
            카드사: cells[2].textContent.trim(),
            가맹점번호: cells[3].textContent.trim(),
            은행: cells[4].textContent.trim(),
            계좌번호: cells[5].textContent.trim(),
            건수: cells[6].textContent.trim(),
            매출금액: cells[7].textContent.trim(),
            보류금액: cells[8].textContent.trim(),
            부가세: cells[9].textContent.trim(),
            기타입금: cells[10].textContent.trim(),
            실입금액: cells[11].textContent.trim()
          };
        });
      });

      return rows;
    } catch (error) {
      console.error('데이터 추출 오류:', error);
      return [];
    }
  }

  async processPaymentData(data: any[], userId: string, db: any) {
    try {
      const processedResults = [];
      const errors = [];

      // 카드사 이름 매핑
      const cardCompanyMapping: { [key: string]: string } = {
        'KB카드': '국민카드',
        '농협NH카드': '농협카드'
      };

      // 전체 미입금 데이터 조회
      const allUnpaidDeposits = await db.collection('carddeposits').find({
        status: '미입금'
      }).toArray();

      for (const deposit of data) {
        try {
          // 금액에서 콤마 제거하고 숫자로 변환
          const saleAmount = parseInt(deposit.매출금액.replace(/[^0-9]/g, ''));
          
          // 카드사 이름 매핑
          const cardCompany = cardCompanyMapping[deposit.카드사] || deposit.카드사;

          // 미입금 상태인 데이터 찾기
          const existingDeposit = await db.collection('carddeposits').findOne({
            cardCompany: cardCompany,
            saleAmount: saleAmount,
            status: '미입금',
            $or: [
              { actualDepositAmount: { $exists: false } },
              { actualDepositAmount: null }
            ]
          });

          if (existingDeposit) {
            // 실제 입금액이 있는 경우에만 입금 처리
            const actualAmount = parseInt(deposit.실입금액.replace(/[^0-9]/g, ''));
            if (!isNaN(actualAmount) && actualAmount > 0) {
              const fee = existingDeposit.saleAmount - actualAmount;

              // 날짜 처리
              const depositDate = new Date(deposit.날짜);
              depositDate.setHours(0, 0, 0, 0); // 시간을 00:00:00으로 설정

              // 해당 날짜에 이미 처리된 입금이 있는지 확인
              const existingDailyDeposit = await db.collection('dailyactualcarddeposits').findOne({
                'deposits.cardDepositId': existingDeposit._id
              });

              if (existingDailyDeposit) {
                continue;
              }

              // 입금 처리
              await db.collection('carddeposits').updateOne(
                { _id: existingDeposit._id },
                {
                  $set: {
                    status: '입금완료',
                    actualDepositAmount: actualAmount,
                    actualDepositDate: depositDate,
                    fee: fee,
                    createdBy: existingDeposit.createdBy || userId
                  }
                }
              );
              
              // DailyActualCardDeposit 처리
              const startOfDay = new Date(depositDate);
              startOfDay.setHours(0, 0, 0, 0);
              const endOfDay = new Date(depositDate);
              endOfDay.setHours(23, 59, 59, 999);

              let dailyDeposit = await db.collection('dailyactualcarddeposits').findOne({
                depositDate: {
                  $gte: startOfDay,
                  $lte: endOfDay
                }
              });

              if (!dailyDeposit) {
                // 새로운 daily deposit 생성
                await db.collection('dailyactualcarddeposits').insertOne({
                  depositDate: startOfDay,
                  totalAmount: actualAmount,
                  deposits: [{
                    cardDepositId: existingDeposit._id,
                    amount: actualAmount,
                    cardCompany: existingDeposit.cardCompany
                  }],
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
              } else {
                // 기존 daily deposit 업데이트
                const updatedDeposits = [...dailyDeposit.deposits];
                const existingIndex = updatedDeposits.findIndex(
                  (d: any) => d.cardDepositId.toString() === existingDeposit._id.toString()
                );
                
                if (existingIndex === -1) {
                  updatedDeposits.push({
                    cardDepositId: existingDeposit._id,
                    amount: actualAmount,
                    cardCompany: existingDeposit.cardCompany
                  });
                }

                const newTotalAmount = updatedDeposits.reduce(
                  (sum: number, deposit: any) => sum + deposit.amount,
                  0
                );

                await db.collection('dailyactualcarddeposits').updateOne(
                  { _id: dailyDeposit._id },
                  {
                    $set: {
                      deposits: updatedDeposits,
                      totalAmount: newTotalAmount,
                      updatedAt: new Date()
                    }
                  }
                );
              }
              
              processedResults.push({
                id: existingDeposit._id,
                status: 'success',
                message: '입금 처리 완료',
                data: {
                  originalCardCompany: deposit.카드사,
                  mappedCardCompany: cardCompany,
                  saleAmount: existingDeposit.saleAmount,
                  actualAmount: actualAmount,
                  fee: fee
                }
              });
            }
          } else {
            errors.push({
              data: {
                originalCardCompany: deposit.카드사,
                mappedCardCompany: cardCompany,
                saleAmount: saleAmount,
                date: deposit.날짜
              },
              error: '매칭되는 미입금 데이터를 찾을 수 없습니다.'
            });
          }
        } catch (error: any) {
          errors.push({
            data: deposit,
            error: error.message
          });
        }
      }

      console.log('크롤링 처리 결과:', {
        success: processedResults.length,
        errors: errors.length
      });

      return {
        success: true,
        processed: processedResults,
        errors: errors
      };
    } catch (error) {
      console.error('데이터 처리 오류:', error);
      throw error;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}