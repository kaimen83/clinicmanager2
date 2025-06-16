import CashDepositModal from './CashDepositModal.js';
import { modalManager } from '../modalManager.js';

// 종합일계표 관련 기능을 담당하는 클래스
class DailyReport {
    constructor() {
        this.container = document.getElementById('daily-report-content');
        this.currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM 형식
        this.viewType = 'daily'; // 'daily' 또는 'monthly'
        this.initializeUI();
        this.depositModal = new CashDepositModal();
    }

    // UI 초기화
    initializeUI() {
        if (!this.container) {
            console.error('daily-report-content를 찾을 수 없습니다.');
            return;
        }

        // 현재 날짜로 currentMonth 설정
        const now = new Date();
        this.currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // UI 렌더링
        this.renderUI();
        
        // 이벤트 리스너 설정
        this.setupEventListeners();
        
        // month picker 초기화
        const monthPicker = this.container.querySelector('#month-picker');
        if (monthPicker) {
            monthPicker.value = this.currentMonth;
        }
        
        // 데이터 로드 및 네비게이션 버튼 상태 업데이트
        this.updateNavigationButtons();
        this.loadData();
    }

    // UI 렌더링
    renderUI() {
        this.container.innerHTML = `
            <div class="daily-report-header">
                <div class="view-type-selector">
                    <button class="view-type-btn ${this.viewType === 'daily' ? 'active' : ''}" data-view="daily">일간</button>
                    <button class="view-type-btn ${this.viewType === 'monthly' ? 'active' : ''}" data-view="monthly">월간</button>
                </div>
                <div class="month-selector">
                    <button class="calendar-nav-button" id="prev-month">◀ 이전</button>
                    <input type="month" id="month-picker">
                    <input type="number" id="year-picker" min="2000" max="2100" value="${new Date().getFullYear()}" style="display: none;">
                    <button class="calendar-nav-button" id="next-month">다음 ▶</button>
                </div>
            </div>
            <div class="daily-report-table-container">
                <table class="daily-report-table">
                    <thead>
                        <tr>
                            <th>${this.viewType === 'daily' ? '날짜' : '월'}</th>
                            <th>총수입</th>
                            <th>카드</th>
                            <th>계좌입금</th>
                            <th>현금</th>
                            <th>진료외수입</th>
                            <th>카드사 입금</th>
                            <th>원장님 전달</th>
                            <th>총지출</th>
                            <th>신환</th>
                            <th>총환자수</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- 데이터가 여기에 동적으로 추가됩니다 -->
                    </tbody>
                    <tfoot>
                        <tr class="monthly-summary">
                            <td>${this.viewType === 'daily' ? '월 합계' : '연간 합계'}</td>
                            <td class="amount-cell">0</td>
                            <td class="amount-cell">0</td>
                            <td class="amount-cell">0</td>
                            <td class="amount-cell">0</td>
                            <td class="amount-cell">0</td>
                            <td class="amount-cell">0</td>
                            <td class="amount-cell">0</td>
                            <td class="amount-cell">0</td>
                            <td>0</td>
                            <td>0</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <!-- 상세 내역 모달 -->
            <div class="detail-modal" id="detail-modal">
                <div class="detail-modal-content">
                    <div class="detail-modal-header">
                        <h2>일일 상세 내역</h2>
                        <span class="detail-modal-close">&times;</span>
                    </div>
                    <div class="detail-content">
                        <!-- 상세 내역이 여기에 동적으로 추가됩니다 -->
                    </div>
                </div>
            </div>

            <!-- 계좌입금 상세 모달 -->
            <div class="deposit-modal" id="deposit-modal">
                <div class="deposit-modal-content">
                    <div class="deposit-modal-header">
                        <h2>계좌입금 상세 내역</h2>
                        <span class="deposit-modal-close">&times;</span>
                    </div>
                    <div class="deposit-actions">
                        <button class="deposit-button primary complete-button">입금완료</button>
                        <button class="deposit-button secondary group-button">선택항목 그룹화</button>
                    </div>
                    <div class="deposit-summary">
                        <div>선택된 항목: 0개</div>
                        <div class="total">합계: ￦0</div>
                    </div>
                    <div class="deposit-list">
                        <table class="deposit-table">
                            <thead>
                                <tr>
                                    <th class="checkbox-cell">
                                        <input type="checkbox" id="select-all">
                                    </th>
                                    <th>날짜</th>
                                    <th>내용</th>
                                    <th>금액</th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- 계좌입금 내역이 여기에 동적으로 추가됩니다 -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        // month-picker 이벤트 리스너
        const monthPicker = this.container.querySelector('#month-picker');
        if (monthPicker) {
            // 초기값 설정
            monthPicker.value = this.currentMonth;
            
            monthPicker.addEventListener('input', (e) => {
                this.currentMonth = e.target.value;
                this.loadData();
                this.updateNavigationButtons();
            });
            
            monthPicker.addEventListener('change', (e) => {
                this.currentMonth = e.target.value;
                this.loadData();
                this.updateNavigationButtons();
            });
        }

        // 이전/다음 버튼 이벤트 리스너
        const prevButton = this.container.querySelector('#prev-month');
        const nextButton = this.container.querySelector('#next-month');

        // 이전/다음 버튼 이벤트 리스너
        prevButton?.addEventListener('click', () => {
            if (this.viewType === 'daily') {
                const [year, month] = this.currentMonth.split('-').map(Number);
                let prevYear = year;
                let prevMonth = month - 1;
                
                if (prevMonth === 0) {
                    prevMonth = 12;
                    prevYear--;
                }
                
                this.currentMonth = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
                const monthPicker = this.container.querySelector('#month-picker');
                if (monthPicker) monthPicker.value = this.currentMonth;
            } else {
                const yearPicker = this.container.querySelector('#year-picker');
                if (yearPicker) {
                    const currentYear = parseInt(yearPicker.value);
                    yearPicker.value = currentYear - 1;
                    this.currentMonth = `${currentYear - 1}-01`;
                }
            }
            
            this.loadData();
            this.updateNavigationButtons();
        });

        nextButton?.addEventListener('click', () => {
            if (this.viewType === 'daily') {
                const [year, month] = this.currentMonth.split('-').map(Number);
                let nextYear = year;
                let nextMonth = month + 1;
                
                if (nextMonth === 13) {
                    nextMonth = 1;
                    nextYear++;
                }
                
                this.currentMonth = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
                const monthPicker = this.container.querySelector('#month-picker');
                if (monthPicker) monthPicker.value = this.currentMonth;
            } else {
                const yearPicker = this.container.querySelector('#year-picker');
                if (yearPicker) {
                    const currentYear = parseInt(yearPicker.value);
                    yearPicker.value = currentYear + 1;
                    this.currentMonth = `${currentYear + 1}-01`;
                }
            }
            
            this.loadData();
            this.updateNavigationButtons();
        });

        // year-picker 이벤트 리스너
        const yearPicker = this.container.querySelector('#year-picker');
        yearPicker?.addEventListener('change', (e) => {
            this.currentMonth = `${e.target.value}-01`;
            this.loadData();
            this.updateNavigationButtons();
        });

        // 뷰 타입 선택 버튼 이벤트
        const viewTypeButtons = this.container.querySelectorAll('.view-type-btn');
        viewTypeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                viewTypeButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.viewType = button.dataset.view;
                
                const monthPicker = this.container.querySelector('#month-picker');
                const yearPicker = this.container.querySelector('#year-picker');
                
                if (this.viewType === 'daily') {
                    monthPicker.style.display = '';
                    yearPicker.style.display = 'none';
                } else {
                    monthPicker.style.display = 'none';
                    yearPicker.style.display = '';
                    const [year] = this.currentMonth.split('-');
                    yearPicker.value = year;
                }

                const headerDateCell = this.container.querySelector('.daily-report-table thead th:first-child');
                const footerSummaryCell = this.container.querySelector('.monthly-summary td:first-child');
                
                if (headerDateCell) {
                    headerDateCell.textContent = this.viewType === 'daily' ? '날짜' : '월';
                }
                if (footerSummaryCell) {
                    footerSummaryCell.textContent = this.viewType === 'daily' ? '월 합계' : '연간 합계';
                }
                
                this.loadData();
                this.updateNavigationButtons();
            });
        });

        // 테이블 이벤트 리스너 설정
        this.setupTableEventListeners();
    }

    // 테이블 이벤트 리스너 설정
    setupTableEventListeners() {
        const tbody = this.container?.querySelector('.daily-report-table tbody');
        if (tbody) {
            tbody.addEventListener('click', (e) => {
                const cell = e.target.closest('td');
                const row = e.target.closest('tr');
                
                if (!cell || !row) return;
                
                const cellIndex = Array.from(row.children).indexOf(cell);
                const date = row.getAttribute('data-date');
                
                if (cellIndex === 7) { // 현금입금 컬럼
                    if (date) this.depositModal.show(date);
                } else {
                    if (date) this.showDailyDetail(date);
                }
            });
        }
    }

    // 모달 닫기 함수
    closeDetailModal() {
        const modal = document.getElementById('detail-modal');
        if (modal) {
            modal.style.display = 'none';
            // 다른 모달들도 모두 닫기
            document.querySelectorAll('.modal').forEach(otherModal => {
                if (otherModal !== modal && otherModal.style.display === 'block') {
                    otherModal.style.display = 'none';
                }
            });
        }
    }

    // 월간 데이터 로드
    async loadData() {
        if (this.viewType === 'daily') {
            await this.loadDailyData();
        } else {
            await this.loadMonthlyData();
        }
    }

    async loadDailyData() {
        try {
            const [year, month] = this.currentMonth.split('-');
            const token = localStorage.getItem('token');
            
            const [reportResponse, cardDepositsResponse] = await Promise.all([
                fetch(`/api/daily-report/monthly/${year}/${month}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }),
                fetch(`/api/daily-actual-card-deposits/monthly/${year}/${month}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
            ]);
            
            if (!reportResponse.ok || !cardDepositsResponse.ok) {
                throw new Error('데이터 로드 중 오류가 발생했습니다.');
            }

            const [data, cardDepositsData] = await Promise.all([
                reportResponse.json(),
                cardDepositsResponse.json()
            ]);

            // 카드사 입금 데이터를 날짜별로 매핑
            const cardDepositsByDate = {};
            cardDepositsData.forEach(deposit => {
                const dateKey = new Date(deposit.depositDate).toISOString().split('T')[0];
                cardDepositsByDate[dateKey] = deposit.totalAmount;
            });

            data.dailyData = data.dailyData.map(day => ({
                ...day,
                cardDepositsAmount: cardDepositsByDate[day.date] || 0
            }));

            data.summary.totalCardDeposits = Object.values(cardDepositsByDate).reduce((sum, amount) => sum + amount, 0);

            this.updateTable(data);
        } catch (error) {
            console.error('데이터 로드 중 오류:', error);
            alert('데이터를 불러오는 중 오류가 발생했습니다.');
        }
    }

    async loadMonthlyData() {
        try {
            const year = this.currentMonth.split('-')[0];
            const token = localStorage.getItem('token');
            
            const monthlyData = { dailyData: [], summary: {} };
            
            // 1월부터 12월까지의 데이터 로드
            for (let month = 1; month <= 12; month++) {
                const [reportResponse, cardDepositsResponse] = await Promise.all([
                    fetch(`/api/daily-report/monthly/${year}/${month}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }),
                    fetch(`/api/daily-actual-card-deposits/monthly/${year}/${month}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    })
                ]);

                if (!reportResponse.ok || !cardDepositsResponse.ok) continue;

                const [monthData, cardDepositsData] = await Promise.all([
                    reportResponse.json(),
                    cardDepositsResponse.json()
                ]);

                const totalCardDeposits = cardDepositsData.reduce((sum, deposit) => sum + deposit.totalAmount, 0);

                monthlyData.dailyData.push({
                    date: `${year}-${String(month).padStart(2, '0')}`,
                    ...monthData.summary,
                    cardDepositsAmount: totalCardDeposits
                });
            }

            // 연간 합계 계산
            monthlyData.summary = monthlyData.dailyData.reduce((sum, month) => ({
                totalIncome: (sum.totalIncome || 0) + (month.totalIncome || 0),
                cardAmount: (sum.cardAmount || 0) + (month.cardAmount || 0),
                transferAmount: (sum.transferAmount || 0) + (month.transferAmount || 0),
                cashAmount: (sum.cashAmount || 0) + (month.cashAmount || 0),
                extraIncomeAmount: (sum.extraIncomeAmount || 0) + (month.extraIncomeAmount || 0),
                totalCardDeposits: (sum.totalCardDeposits || 0) + (month.cardDepositsAmount || 0),
                cashDeposit: (sum.cashDeposit || 0) + (month.cashDeposit || 0),
                totalExpense: (sum.totalExpense || 0) + (month.totalExpense || 0),
                totalNewPatients: (sum.totalNewPatients || 0) + (month.totalNewPatients || 0),
                totalPatients: (sum.totalPatients || 0) + (month.totalPatients || 0)
            }), {});

            this.updateTable(monthlyData);
        } catch (error) {
            console.error('데이터 로드 중 오류:', error);
            alert('데이터를 불러오는 중 오류가 발생했습니다.');
        }
    }

    // 테이블 업데이트
    updateTable(data) {
        const tbody = this.container?.querySelector('.daily-report-table tbody');
        const tfoot = this.container?.querySelector('.daily-report-table tfoot');
        
        if (!tbody || !tfoot) {
            console.error('테이블 본문 또는 푸터를 찾을 수 없습니다.');
            return;
        }

        if (this.viewType === 'daily') {
            // 일간 뷰 테이블 업데이트
            const [year, month] = this.currentMonth.split('-');
            const startDate = new Date(year, parseInt(month) - 1, 1, 9); // KST 9시 = UTC 0시
            const endDate = new Date(year, parseInt(month), 0, 9);
            const daysInMonth = endDate.getDate();
            
            // 오늘 날짜 (KST 기준)
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9).toISOString().split('T')[0];
            
            tbody.innerHTML = Array.from({length: daysInMonth}, (_, i) => {
                const date = new Date(year, parseInt(month) - 1, i + 1, 9);
                const dateStr = date.toISOString().split('T')[0];
                const dayData = data.dailyData.find(d => d.date === dateStr) || {
                    totalIncome: 0,
                    cardAmount: 0,
                    transferAmount: 0,
                    cashAmount: 0,
                    extraIncomeAmount: 0,
                    cardDepositsAmount: 0,
                    cashDeposit: 0,
                    totalExpense: 0,
                    newPatients: 0,
                    totalPatients: 0,
                    isDepositCompleted: false
                };

                // 각 값이 undefined나 null인 경우 0으로 설정
                Object.keys(dayData).forEach(key => {
                    if (typeof dayData[key] === 'undefined' || dayData[key] === null) {
                        dayData[key] = 0;
                    }
                });

                const isSunday = date.getDay() === 0;
                const isToday = dateStr === today;
                
                return `
                    <tr data-date="${dateStr}" class="${isSunday ? 'weekend' : ''} ${isToday ? 'today' : ''}" style="cursor: pointer;">
                        <td>${this.formatDate(dateStr)}</td>
                        <td class="amount-cell ${dayData.totalIncome > 0 ? 'positive' : ''}">${this.formatAmount(dayData.totalIncome)}</td>
                        <td class="amount-cell">${this.formatAmount(dayData.cardAmount)}</td>
                        <td class="amount-cell">${this.formatAmount(dayData.transferAmount)}</td>
                        <td class="amount-cell">${this.formatAmount(dayData.cashAmount)}</td>
                        <td class="amount-cell">${this.formatAmount(dayData.extraIncomeAmount)}</td>
                        <td class="amount-cell">${this.formatAmount(dayData.cardDepositsAmount)}</td>
                        <td class="amount-cell deposit-cell ${dayData.isDepositCompleted ? 'completed' : ''}" data-amount="${dayData.cashDeposit}">${this.formatAmount(dayData.cashDeposit)}</td>
                        <td class="amount-cell ${dayData.totalExpense > 0 ? 'negative' : ''}">${this.formatAmount(dayData.totalExpense)}</td>
                        <td>${dayData.newPatients}</td>
                        <td>${dayData.totalPatients}</td>
                    </tr>
                `;
            }).join('');
        } else {
            // 월간 뷰 테이블 업데이트
            tbody.innerHTML = data.dailyData.map(monthData => {
                const date = new Date(monthData.date);
                const month = date.getMonth() + 1;
                
                return `
                    <tr data-date="${monthData.date}" style="cursor: pointer;">
                        <td>${month}월</td>
                        <td class="amount-cell ${monthData.totalIncome > 0 ? 'positive' : ''}">${this.formatAmount(monthData.totalIncome)}</td>
                        <td class="amount-cell">${this.formatAmount(monthData.cardAmount)}</td>
                        <td class="amount-cell">${this.formatAmount(monthData.transferAmount)}</td>
                        <td class="amount-cell">${this.formatAmount(monthData.cashAmount)}</td>
                        <td class="amount-cell">${this.formatAmount(monthData.extraIncomeAmount)}</td>
                        <td class="amount-cell">${this.formatAmount(monthData.cardDepositsAmount)}</td>
                        <td class="amount-cell deposit-cell ${monthData.isDepositCompleted ? 'completed' : ''}" data-amount="${monthData.cashDeposit}">${this.formatAmount(monthData.cashDeposit)}</td>
                        <td class="amount-cell ${monthData.totalExpense > 0 ? 'negative' : ''}">${this.formatAmount(monthData.totalExpense)}</td>
                        <td>${monthData.totalNewPatients}</td>
                        <td>${monthData.totalPatients}</td>
                    </tr>
                `;
            }).join('');
        }

        // 합계 행 업데이트
        const summary = data.summary || {
            totalIncome: 0,
            cardAmount: 0,
            transferAmount: 0,
            cashAmount: 0,
            extraIncomeAmount: 0,
            totalCardDeposits: 0,
            cashDeposit: 0,
            totalExpense: 0,
            totalNewPatients: 0,
            totalPatients: 0
        };
        
        // 각 값이 undefined나 null인 경우 0으로 설정
        Object.keys(summary).forEach(key => {
            if (typeof summary[key] === 'undefined' || summary[key] === null) {
                summary[key] = 0;
            }
        });

        // 각 셀이 존재하는지 확인하고 값을 설정
        const cells = tfoot.querySelector('.monthly-summary').children;
        if (cells.length >= 11) {
            cells[1].textContent = this.formatAmount(summary.totalIncome);
            cells[2].textContent = this.formatAmount(summary.cardAmount);
            cells[3].textContent = this.formatAmount(summary.transferAmount);
            cells[4].textContent = this.formatAmount(summary.cashAmount);
            cells[5].textContent = this.formatAmount(summary.extraIncomeAmount);
            cells[6].textContent = this.formatAmount(summary.totalCardDeposits);
            cells[7].textContent = this.formatAmount(summary.cashDeposit);
            cells[8].textContent = this.formatAmount(summary.totalExpense);
            cells[9].textContent = summary.totalNewPatients;
            cells[10].textContent = summary.totalPatients;
        } else {
            console.error('월간 합계 행의 셀 개수가 부족합니다.');
        }
    }

    // 일일 상세 내역 표시
    async showDailyDetail(date) {
        try {
            const token = localStorage.getItem('token');
            
            // 모달 요소 확인
            const modal = document.getElementById('detail-modal');
            const detailContent = modal?.querySelector('.detail-content');
            
            if (!modal || !detailContent) {
                console.error('모달 또는 컨텐츠 요소를 찾을 수 없습니다.');
                return;
            }

            // 기존에 열려있는 다른 모달들 닫기
            document.querySelectorAll('.modal').forEach(otherModal => {
                if (otherModal !== modal && otherModal.style.display === 'block') {
                    otherModal.style.display = 'none';
                }
            });

            // 닫기 버튼 이벤트 리스너 설정
            const closeBtn = modal.querySelector('.detail-modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    modal.style.display = 'none';
                });
            }
            
            // 일일 상세 내역 데이터 가져오기
            const detailResponse = await fetch(`/api/daily-report/detail/${date}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!detailResponse.ok) {
                throw new Error('상세 데이터 로드 중 오류가 발생했습니다.');
            }

            const data = await detailResponse.json();

            // 진료외 수입 데이터 가져오기
            const extraIncomeResponse = await fetch('/api/extra-incomes', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!extraIncomeResponse.ok) {
                throw new Error('진료외 수입 데이터 로드 중 오류가 발생했습니다.');
            }

            const allExtraIncomeData = await extraIncomeResponse.json();
            
            // 선택된 날짜의 시작과 끝 시간 설정 (KST 기준)
            const targetDate = new Date(date);
            const startTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
            const endTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

            // 해당 날짜의 진료외 수입만 필터링
            const extraIncomeData = allExtraIncomeData.filter(item => {
                const itemDate = new Date(item.date);
                return itemDate >= startTime && itemDate <= endTime;
            });

            const formattedDate = this.formatDate(date);
            
            detailContent.innerHTML = `
                <div class="detail-tabs">
                    <button class="detail-tab active" data-tab="income">수입 내역</button>
                    <button class="detail-tab" data-tab="extra-income">진료외 수입</button>
                    <button class="detail-tab" data-tab="expense">지출 내역</button>
                </div>

                <div class="detail-tab-content active" id="income-content">
                    <div class="payment-summary">
                        <div class="payment-item">
                            <span class="label">카드</span>
                            <span class="amount">${this.formatAmount(data.income.filter(item => item.paymentMethod === '카드').reduce((sum, item) => sum + item.amount, 0))}</span>
                        </div>
                        <div class="payment-item">
                            <span class="label">계좌이체</span>
                            <span class="amount">${this.formatAmount(data.income.filter(item => item.paymentMethod === '계좌이체').reduce((sum, item) => sum + item.amount, 0))}</span>
                        </div>
                        <div class="payment-item">
                            <span class="label">현금</span>
                            <span class="amount">${this.formatAmount(data.income.filter(item => item.paymentMethod === '현금').reduce((sum, item) => sum + item.amount, 0))}</span>
                        </div>
                    </div>
                    <div class="detail-table-container">
                        <table class="detail-table">
                            <thead>
                                <tr>
                                    <th>환자명</th>
                                    <th>진료내용</th>
                                    <th>결제방법</th>
                                    <th>금액</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.income.map(item => `
                                    <tr>
                                        <td>${item.patientName}</td>
                                        <td>${item.description}</td>
                                        <td>${item.paymentMethod}</td>
                                        <td class="amount-cell">${this.formatAmount(item.amount)}</td>
                                    </tr>
                                `).join('')}
                                <tr class="total-row">
                                    <td colspan="3">합계</td>
                                    <td class="amount-cell">${this.formatAmount(data.income.reduce((sum, item) => sum + item.amount, 0))}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="detail-tab-content" id="extra-income-content">
                    <div class="detail-table-container">
                        <table class="detail-table">
                            <thead>
                                <tr>
                                    <th>유형</th>
                                    <th>금액</th>
                                    <th>메모</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${extraIncomeData.map(item => `
                                    <tr>
                                        <td>${item.type}</td>
                                        <td class="amount-cell">${this.formatAmount(item.amount)}</td>
                                        <td>${item.notes || ''}</td>
                                    </tr>
                                `).join('')}
                                <tr class="total-row">
                                    <td>합계</td>
                                    <td class="amount-cell">${this.formatAmount(extraIncomeData.reduce((sum, item) => sum + item.amount, 0))}</td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="detail-tab-content" id="expense-content">
                    <div class="detail-table-container">
                        <table class="detail-table">
                            <thead>
                                <tr>
                                    <th>항목</th>
                                    <th>금액</th>
                                    <th>비고</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.expenses.map(item => `
                                    <tr>
                                        <td>${item.description}</td>
                                        <td class="amount-cell">${this.formatAmount(item.amount)}</td>
                                        <td>${item.note || ''}</td>
                                    </tr>
                                `).join('')}
                                <tr class="total-row">
                                    <td>합계</td>
                                    <td class="amount-cell">${this.formatAmount(data.expenses.reduce((sum, item) => sum + item.amount, 0))}</td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            // 모달 제목 업데이트
            const modalTitle = modal.querySelector('.detail-modal-header h2');
            if (modalTitle) {
                modalTitle.textContent = `${formattedDate} 상세 내역`;
            }

            // 탭 전환 이벤트 설정
            const tabs = detailContent.querySelectorAll('.detail-tab');
            const tabContents = detailContent.querySelectorAll('.detail-tab-content');

            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    // 활성 탭 변경
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');

                    // 탭 컨텐츠 변경
                    tabContents.forEach(content => content.classList.remove('active'));
                    const targetContent = document.getElementById(`${tab.dataset.tab}-content`);
                    if (targetContent) {
                        targetContent.classList.add('active');
                    }
                });
            });

            modal.style.display = 'block';
        } catch (error) {
            console.error('상세 데이터 로드 중 오류 발생:', error);
            alert('상세 내역을 불러오는 중 오류가 발생했습니다.');
        }
    }

    // 날짜 포맷팅
    formatDate(dateString) {
        // KST 기준으로 날짜 변환
        const date = new Date(dateString);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
        return `${month}/${day} (${dayOfWeek})`;
    }

    // 금액 포맷팅
    formatAmount(amount) {
        if (!amount || isNaN(amount)) {
            amount = 0;
        }
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW'
        }).format(amount);
    }

    // 네비게이션 버튼 상태 업데이트
    updateNavigationButtons() {
        const nextButton = this.container.querySelector('#next-month');
        if (nextButton) {
            const now = new Date();
            if (this.viewType === 'daily') {
                const currentDate = new Date(this.currentMonth);
                const currentYearMonth = now.getFullYear() * 12 + now.getMonth();
                const selectedYearMonth = currentDate.getFullYear() * 12 + currentDate.getMonth();
                nextButton.disabled = selectedYearMonth >= currentYearMonth;
            } else {
                const selectedYear = parseInt(this.currentMonth);
                nextButton.disabled = selectedYear >= now.getFullYear();
            }
        }
    }
}

// 모듈 내보내기
export default DailyReport; 