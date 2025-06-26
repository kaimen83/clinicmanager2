const { chromium } = require('playwright');
const XLSX = require('xlsx');
const path = require('path');
const fetch = require('node-fetch');

class CardSalesCrawler {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.apiToken = null;
        // API 기본 URL 설정
        this.apiBaseUrl = process.env.API_BASE_URL;
    }

    async initialize() {
        try {
            // Chrome 브라우저 실행
            this.browser = await chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                executablePath: process.env.CHROME_PATH || undefined
            });

            // 브라우저 컨텍스트 생성
            this.context = await this.browser.newContext({
                viewport: { width: 1920, height: 1080 },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });

            // 새 페이지 생성
            this.page = await this.context.newPage();

            // 불필요한 리소스 차단
            await this.context.route('**/*.{png,jpg,jpeg,gif,svg,css,woff,woff2,ttf,otf}', route => route.abort());
            await this.context.route('**/analytics.js', route => route.abort());
            await this.context.route('**/gtag.js', route => route.abort());
            
            return true;
        } catch (error) {
            throw error;
        }
    }

    async login(userId, password) {
        try {
            // 로그인 페이지로 이동
            await this.page.goto('https://www.cardsales.or.kr/signin', {
                waitUntil: 'networkidle'
            });
            
            // ID 입력 필드가 나타날 때까지 대기
            await this.page.waitForSelector('#j_username', { timeout: 30000 });
            
            // 로그인 폼 입력
            await this.page.fill('#j_username', userId);
            await this.page.fill('#j_password', password);
            
            // Promise.all을 사용하여 동시에 여러 이벤트 대기
            await Promise.all([
                // 네트워크 요청이 완료될 때까지 대기
                this.page.waitForLoadState('networkidle'),
                // 페이지 이동 대기
                this.page.waitForNavigation({ timeout: 30000 }),
                // 로그인 버튼 클릭
                this.page.click('#goLogin')
            ]);
            
            // 로그인 성공 여부 확인 (URL 변경 확인)
            const currentUrl = this.page.url();
            const isLoggedIn = !currentUrl.includes('/signin');
            
            return isLoggedIn;
        } catch (error) {
            return false;
        }
    }

    async getApiToken() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: process.env.ADMIN_USERNAME,
                    password: process.env.ADMIN_PASSWORD
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API 로그인 실패: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            this.apiToken = data.token;
            return this.apiToken;
        } catch (error) {
            throw error;
        }
    }

    async processPaymentData(data) {
        try {
            if (!this.apiToken) {
                await this.getApiToken();
            }
            
            const response = await fetch(`${this.apiBaseUrl}/api/card-deposits/process-crawled-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiToken}`
                },
                body: JSON.stringify({ 
                    deposits: data.map(item => ({
                        날짜: item.날짜,
                        카드사: item.카드사,
                        매출금액: item.매출금액,
                        실입금액: item.실입금액
                    }))
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`입금 처리 실패: ${errorText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            throw error;
        }
    }

    async searchPayments() {
        try {
            // 기간별 매출조회 페이지로 이동
            await this.page.goto('https://www.cardsales.or.kr/page/payment/term', {
                waitUntil: 'networkidle'
            });
            
            // 조회 버튼이 나타날 때까지 대기
            await this.page.waitForSelector('#searchBtn', { timeout: 30000 });
            
            // Promise.all을 사용하여 동시에 여러 이벤트 대기
            await Promise.all([
                // 네트워크 요청이 완료될 때까지 대기
                this.page.waitForLoadState('networkidle'),
                // 조회 버튼 클릭
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
            
            // 잠시 대기하여 데이터가 완전히 로드되도록 함
            await this.page.waitForTimeout(2000);
            
            // 데이터 추출
            const data = await this.extractTableData();
            
            if (!data || data.length === 0) {
                throw new Error('데이터를 추출할 수 없습니다.');
            }
            
            // 데이터 처리 및 입금 처리
            await this.processPaymentData(data);
            
            // 엑셀 저장 (옵션)
            if (process.env.SAVE_EXCEL === 'true') {
                await this.saveToExcel(data);
            }
            
            return true;
        } catch (error) {
            throw error;
        }
    }

    async extractTableData() {
        try {
            // 테이블 데이터 추출
            const rows = await this.page.evaluate(() => {
                const tableRows = document.querySelectorAll('#detail-content tr[name="detailTmplTr"]');
                return Array.from(tableRows).map(row => {
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
            return [];
        }
    }

    async saveToExcel(data) {
        try {
            // 워크북 생성
            const wb = XLSX.utils.book_new();
            
            // 워크시트 생성
            const ws = XLSX.utils.json_to_sheet(data);
            
            // 열 너비 설정
            const colWidths = {
                A: 5,  // 번호
                B: 12, // 날짜
                C: 10, // 카드사
                D: 15, // 가맹점번호
                E: 10, // 은행
                F: 20, // 계좌번호
                G: 5,  // 건수
                H: 15, // 매출금액
                I: 15, // 보류금액
                J: 15, // 부가세
                K: 15, // 기타입금
                L: 15  // 실입금액
            };
            
            ws['!cols'] = Object.keys(colWidths).map(key => ({ wch: colWidths[key] }));
            
            // 워크시트를 워크북에 추가
            XLSX.utils.book_append_sheet(wb, ws, "매출내역");
            
            // 현재 날짜를 파일명에 포함
            const now = new Date();
            const fileName = `카드매출내역_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.xlsx`;
            
            // 파일 저장
            XLSX.writeFile(wb, fileName);
        } catch (error) {
            throw error;
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

module.exports = CardSalesCrawler; 