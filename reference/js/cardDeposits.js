// 카드매출/입금 관리 모듈
import { modalManager } from './modalManager.js';

class CardDepositsManager {
    constructor() {
        this.initialized = false;
        // 바인딩된 이벤트 핸들러를 인스턴스 속성으로 저장
        this.boundHandleTransactionDelete = this.handleTransactionDelete.bind(this);
        this.boundHandleTransactionUpdate = this.handleTransactionUpdate.bind(this);
        this.filteredData = []; // 필터링된 데이터를 저장할 속성 추가
        this.cardCompanies = []; // 카드사 목록을 저장할 속성 추가
        this.selectedRows = new Set();
        this.selectedCardCompany = null;
    }

    async init() {
        if (this.initialized) return;
        
        // DOM 요소 참조 저장
        this.startDateInput = document.getElementById('start-date');
        this.endDateInput = document.getElementById('end-date');
        this.cardCompanyFilter = document.getElementById('card-company-filter');
        this.exportButton = document.getElementById('card-export-excel');
        this.cardSalesTab = document.querySelector('button[data-tab="card-sales"]');
        
        // 카드사 목록 로드
        await this.loadCardCompanies();
        
        // 금액 입력 필드에 천단위 구분자 적용
        const actualAmountInput = document.getElementById('actual-deposit-amount');
        if (actualAmountInput) {
            actualAmountInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/[^\d]/g, '');
                e.target.value = value ? Number(value).toLocaleString() : '';
            });
        }

        if (!this.startDateInput || !this.endDateInput) {
            console.error('필요한 DOM 요소를 찾을 수 없습니다.');
            return;
        }

        // 오늘부터 1주일을 기본값으로 설정
        const now = new Date();
        const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
        const today = new Date(koreaTime.toISOString().split('T')[0]);
        const oneWeekAgo = new Date(today);
        oneWeekAgo.setDate(today.getDate() - 6); // 오늘 포함 7일
        
        this.startDateInput.value = this.formatDate(oneWeekAgo);
        this.endDateInput.value = this.formatDate(today);
        
        this.setupEventListeners();
        this.loadData();
        
        this.initialized = true;
    }

    // 카드사 목록을 로드하는 메서드 추가
    async loadCardCompanies() {
        try {
            const response = await fetch('/api/settings', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('카드사 목록을 가져오는데 실패했습니다.');
            }

            const settings = await response.json();
            this.cardCompanies = settings.cardCompany || [];

            // 카드사 필터 옵션 업데이트
            if (this.cardCompanyFilter) {
                this.cardCompanyFilter.innerHTML = `
                    <option value="all">전체</option>
                    ${this.cardCompanies.map(company => 
                        `<option value="${company.value}">${company.value}</option>`
                    ).join('')}
                `;
            }
        } catch (error) {
            console.error('카드사 목록 로드 실패:', error);
        }
    }

    setupEventListeners() {
        // 기존 이벤트 리스너 제거
        document.removeEventListener('transactionDeleted', this.boundHandleTransactionDelete);
        document.removeEventListener('transactionUpdated', this.boundHandleTransactionUpdate);
        
        // 트랜잭션 이벤트 리스너 등록
        document.addEventListener('transactionDeleted', this.boundHandleTransactionDelete);
        document.addEventListener('transactionUpdated', this.boundHandleTransactionUpdate);
        
        // 탭 전환 이벤트 리스너
        this.cardSalesTab?.addEventListener('click', () => {
            // 탭 진입 시 최신 데이터로 동기화
            this.loadData();
        });

        // 필터 변경 이벤트 리스너
        this.startDateInput?.addEventListener('change', () => this.loadData());
        this.endDateInput?.addEventListener('change', () => this.loadData());
        this.cardCompanyFilter?.addEventListener('change', () => this.filterData());
        this.exportButton?.addEventListener('click', () => this.exportToExcel());

        // 체크박스 이벤트 리스너
        document.addEventListener('change', (e) => {
            if (e.target.matches('.row-checkbox')) {
                this.handleRowSelection(e.target);
            }
        });

        // 전체해제 버튼 이벤트 리스너
        document.getElementById('clear-selection-btn')?.addEventListener('click', () => {
            this.clearSelection();
        });

        // 일괄입금 버튼 이벤트 리스너
        document.getElementById('bulk-deposit-btn')?.addEventListener('click', () => {
            this.showBulkDepositModal();
        });

        // 일괄입금 모달 폼 제출 이벤트 리스너
        document.getElementById('bulk-deposit-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.processBulkDeposit();
        });

        // 일괄입금 모달 취소 버튼 이벤트 리스너
        document.querySelector('#bulk-deposit-modal .cancel-btn')?.addEventListener('click', () => {
            this.hideBulkDepositModal();
        });

        // 실제 입금액 입력 시 수수료 자동 계산
        document.getElementById('bulk-actual-amount')?.addEventListener('input', (e) => {
            this.calculateBulkFee(e.target.value);
        });

        // 테이블 행 클릭 이벤트 리스너
        document.addEventListener('click', (e) => {
            const cell = e.target.closest('td');
            if (!cell) return;

            const row = cell.closest('tr');
            if (!row) return;

            // 상태 칼럼이나 관리 칼럼 클릭은 제외
            const isStatusCell = cell.querySelector('.status-select');
            const isManageCell = cell.querySelector('button');
            const isCheckboxCell = cell.classList.contains('checkbox-cell');
            
            if (!isStatusCell && !isManageCell && !isCheckboxCell) {
                const checkbox = row.querySelector('.row-checkbox');
                if (checkbox && !checkbox.disabled) {
                    checkbox.checked = !checkbox.checked;
                    this.handleRowSelection(checkbox);
                }
            }
        });

        // 필터 변경 이벤트 리스너
        if (this.cardCompanyFilter) {
            this.cardCompanyFilter.style.cursor = 'pointer';
        }
        if (this.exportButton) {
            this.exportButton.style.cursor = 'pointer';
        }
        if (this.startDateInput) {
            this.startDateInput.style.cursor = 'pointer';
        }
        if (this.endDateInput) {
            this.endDateInput.style.cursor = 'pointer';
        }
    }

    filterData() {
        if (!this.filteredData) return;

        const selectedCardCompany = this.cardCompanyFilter?.value;
        
        let filteredData = [...this.filteredData];
        
        // 카드사 필터 적용
        if (selectedCardCompany && selectedCardCompany !== 'all') {
            filteredData = filteredData.filter(item => item.cardCompany === selectedCardCompany);
        }

        // 필터링된 결과 출력
        this.renderData(filteredData);

        // 선택 상태 복원
        this.restoreSelectionState();
    }

    restoreSelectionState() {
        // 선택된 행들의 UI 상태 복원
        this.selectedRows.forEach(rowId => {
            const row = document.querySelector(`tr[data-id="${rowId}"]`);
            if (row) {
                const checkbox = row.querySelector('.row-checkbox');
                if (checkbox) {
                    checkbox.checked = true;
                }
                row.classList.add('selected');
            }
        });

        // 플로팅 모달 상태 업데이트
        this.updateFloatingModal();
    }

    // 내원정보 업데이트 이벤트 핸들러
    async handleTransactionUpdate(event) {
        const transaction = event.detail;
        
        // 카드 결제인 경우에만 처리
        if (transaction.paymentMethod === '카드') {
            
            try {
                // 기존 카드매출/입금 데이터 삭제
                const oldCardDeposit = await this.findCardDepositByTransaction(transaction._id);
                if (oldCardDeposit) {
                    await this.deleteCardDeposit(oldCardDeposit._id);
                }
                
                // 현재 표시된 데이터 다시 로드
                await this.loadData();
            } catch (error) {
                console.error('카드매출/입금 데이터 갱신 실패:', error);
            }
        }
    }

    // 내원정보 삭제 이벤트 핸들러
    async handleTransactionDelete(event) {
        const transaction = event.detail;
        
        // 카드 결제인 경우에만 처리
        if (transaction.paymentMethod === '카드') {
            try {
                // 연결된 카드매출/입금 데이터 삭제
                const cardDeposit = await this.findCardDepositByTransaction(transaction._id);
                
                if (cardDeposit) {
                    const deleteResponse = await this.deleteCardDeposit(cardDeposit._id);
                    if (!deleteResponse.ok) {
                        throw new Error('카드매출/입금 데이터 삭제 실패');
                    }
                }
            } catch (error) {
                console.error('카드매출/입금 데이터 삭제 실패:', error);
            } finally {
                // 성공/실패와 관계없이 데이터 다시 로드
                try {
                    await this.loadData();
                } catch (loadError) {
                    console.error('데이터 새로고침 실패:', loadError);
                }
            }
        }
    }

    // 거래 ID로 카드매출/입금 데이터 찾기
    async findCardDepositByTransaction(transactionId) {
        try {
            const response = await fetch(`/api/card-deposits/by-transaction/${transactionId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('카드매출/입금 데이터 조회 실패');
            }
            
            return await response.json();
        } catch (error) {
            console.error('카드매출/입금 데이터 조회 중 에러:', error);
            return null;
        }
    }

    // 카드매출/입금 데이터 삭제
    async deleteCardDeposit(cardDepositId) {
        const response = await fetch(`/api/card-deposits/${cardDepositId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('카드매출/입금 데이터 삭제 실패 응답:', errorText);
            throw new Error('카드매출/입금 데이터 삭제 실패');
        }
        
        return response;
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    async loadData() {
        try {
            if (!this.startDateInput || !this.endDateInput) {
                throw new Error('필요한 DOM 요소가 없습니다.');
            }
    
            const startDate = this.startDateInput.value;
            const endDate = this.endDateInput.value;
    
            if (!startDate || !endDate) {
                return;
            }
    
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('인증이 필요합니다.');
            }
    
            const url = `/api/card-deposits?startDate=${startDate}&endDate=${endDate}`;
    
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'same-origin'
            });
                        
            if (!response.ok) {
                const errorText = await response.text();
                console.error('서버 응답:', errorText);
                
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    window.location.href = '/login';
                    return;
                }
                
                throw new Error('데이터 로드 실패');
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('잘못된 Content-Type:', contentType);
                console.error('응답 내용:', text);
                throw new Error('서버가 JSON이 아닌 응답을 반환했습니다.');
            }
            
            let data = await response.json();
    
            // 매출일자 오름차순으로 정렬
            data.sort((a, b) => new Date(a.saleDate) - new Date(b.saleDate));
            
            // 전체 데이터 저장
            this.filteredData = data;
            
            // 필터 적용하여 데이터 표시
            this.filterData();
            
        } catch (error) {
            console.error('데이터 로드 실패:', error);
            alert('데이터를 불러오는데 실패했습니다.');
        }
    }
    
    renderData(data) {
        const container = document.getElementById('card-deposits-container');
        if (!container) {
            console.error('card-deposits-container를 찾을 수 없습니다.');
            return;
        }

        container.innerHTML = '';

        // 요약 정보 렌더링
        const summary = this.calculateSummary(data);
        this.renderSummary(summary);

        // 상세 데이터 렌더링
        const table = document.createElement('table');
        table.className = 'data-table';
        
        // 테이블 헤더
        table.innerHTML = `
            <thead>
                <tr>
                    <th class="checkbox-cell"></th>
                    <th>매출일자</th>
                    <th>카드사</th>
                    <th>매출금액</th>
                    <th>입금예정일</th>
                    <th>실제입금일</th>
                    <th>실제입금액</th>
                    <th>수수료</th>
                    <th>수수료율</th>
                    <th>상태</th>
                    <th>보류사유</th>
                    <th>관리</th>
                </tr>
            </thead>
            <tbody>
                ${this.renderTableRows(data)}
            </tbody>
        `;

        container.appendChild(table);
    }

    calculateSummary(data) {
        return data.reduce((acc, item) => {
            acc.totalSaleAmount += item.saleAmount;
            acc.totalDepositAmount += item.actualDepositAmount || 0;
            if (item.status === '미입금') {
                acc.totalUnpaidAmount += item.saleAmount;
            }
            acc.totalFee += item.fee || 0;
            return acc;
        }, {
            totalSaleAmount: 0,
            totalDepositAmount: 0,
            totalUnpaidAmount: 0,
            totalFee: 0
        });
    }

    renderSummary(summary) {
        const summaryContainer = document.getElementById('summary-container');
        if (!summaryContainer) return;

        summaryContainer.innerHTML = `
            <div class="summary-row">
                <div class="summary-item" style="cursor: pointer;">
                    <span class="label">총 매출액:</span>
                    <span class="value">${this.formatCurrency(summary.totalSaleAmount)}</span>
                </div>
                <div class="summary-item" style="cursor: pointer;">
                    <span class="label">총 입금액:</span>
                    <span class="value">${this.formatCurrency(summary.totalDepositAmount)}</span>
                </div>
                <div class="summary-item" style="cursor: pointer;">
                    <span class="label">총 미입금액:</span>
                    <span class="value">${this.formatCurrency(summary.totalUnpaidAmount)}</span>
                </div>
                <div class="summary-item" style="cursor: pointer;">
                    <span class="label">총 수수료:</span>
                    <span class="value">${this.formatCurrency(summary.totalFee)}</span>
                </div>
            </div>
        `;
    }

    renderTableRows(data) {
        return data.map(item => {
            const feeRate = item.saleAmount ? ((item.fee / item.saleAmount) * 100).toFixed(2) : '0.00';
            return `
                <tr data-id="${item._id}" 
                    data-sale-amount="${item.saleAmount}" 
                    data-expected-date="${item.expectedDepositDate}" 
                    data-card-company="${item.cardCompany}"
                    data-status="${item.status}">
                    <td class="checkbox-cell">
                        <input type="checkbox" class="row-checkbox" ${item.status === '입금완료' ? 'disabled' : ''} style="cursor: pointer;">
                    </td>
                    <td>${new Date(item.saleDate).toLocaleDateString()}</td>
                    <td>${item.cardCompany}</td>
                    <td class="amount">${this.formatCurrency(item.saleAmount)}</td>
                    <td>${new Date(item.expectedDepositDate).toLocaleDateString()}</td>
                    <td>${item.actualDepositDate ? new Date(item.actualDepositDate).toLocaleDateString() : '-'}</td>
                    <td class="amount">${item.actualDepositAmount ? this.formatCurrency(item.actualDepositAmount) : '-'}</td>
                    <td class="amount">${item.fee ? this.formatCurrency(item.fee) : '-'}</td>
                    <td class="amount">${feeRate}%</td>
                    <td>
                        <select class="status-select" data-id="${item._id}" data-current-status="${item.status}" 
                                onchange="cardDeposits.updateStatus(this)"
                                ${item.status === '입금완료' ? 'disabled' : ''}
                                style="cursor: pointer;">
                            <option value="미입금" ${item.status === '미입금' ? 'selected' : ''}>미입금</option>
                            <option value="입금완료" ${item.status === '입금완료' ? 'selected' : ''}>입금완료</option>
                            <option value="입금보류" ${item.status === '입금보류' ? 'selected' : ''}>입금보류</option>
                        </select>
                    </td>
                    <td>${item.holdReason || '-'}</td>
                    <td>
                        <button class="edit-btn" onclick="cardDeposits.editDeposit('${item._id}', '${item.status}')" style="cursor: pointer;">수정</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
    }

    async updateStatus(select) {
        try {
            const id = select.dataset.id;
            const status = select.value;
            const currentStatus = select.getAttribute('data-current-status');
            const row = select.closest('tr');
            const saleAmount = parseFloat(row.getAttribute('data-sale-amount'));
            const expectedDate = row.getAttribute('data-expected-date');
            const isEditMode = select.dataset.editMode === 'true';
            
            if (currentStatus === '입금완료' && status !== '입금완료' && !isEditMode) {
                const passwordModal = document.getElementById('password-modal');
                const passwordForm = document.getElementById('password-form');
                
                return new Promise((resolve, reject) => {
                    passwordModal.style.display = 'block';
                    modalManager.pushModal(passwordModal);
                    
                    const closeModal = () => {
                        passwordModal.style.display = 'none';
                        modalManager.removeModal(passwordModal);
                        passwordForm.reset();
                        select.value = currentStatus;
                        resolve();
                    };

                    const cancelBtn = passwordModal.querySelector('.cancel-btn');
                    const closeBtn = passwordModal.querySelector('.close');
                    cancelBtn.onclick = closeModal;
                    closeBtn.onclick = closeModal;

                    passwordForm.onsubmit = async (e) => {
                        e.preventDefault();
                        const password = document.getElementById('status-change-password').value;
                        
                        try {
                            const response = await fetch('/api/auth/verify-password', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                },
                                body: JSON.stringify({ password })
                            });

                            if (response.ok) {
                                passwordModal.style.display = 'none';
                                modalManager.removeModal(passwordModal);
                                passwordForm.reset();
                                await this.processStatusUpdate(select, status, currentStatus);
                                resolve();
                            } else {
                                const data = await response.json();
                                alert(data.message || '비밀번호가 올바르지 않습니다.');
                                select.value = currentStatus;
                                resolve();
                            }
                        } catch (error) {
                            console.error('비밀번호 검증 실패:', error);
                            alert('비밀번호 검증 중 오류가 발생했습니다.');
                            select.value = currentStatus;
                            reject(error);
                        }
                    };
                });
            }

            await this.processStatusUpdate(select, status, currentStatus);

        } catch (error) {
            console.error('상태 업데이트 실패:', error);
            alert('상태 업데이트에 실패했습니다.');
            if (select) {
                select.value = currentStatus;
            }
        }
    }

    async processStatusUpdate(select, status, currentStatus) {
        const id = select.dataset.id;
        const row = select.closest('tr');
        const saleAmount = parseFloat(row.getAttribute('data-sale-amount'));
        const expectedDate = row.getAttribute('data-expected-date');

        if (status === '입금완료') {
            const statusChangeModal = document.getElementById('status-change-modal');
            const statusChangeForm = document.getElementById('status-change-form');
            const actualDateInput = document.getElementById('actual-deposit-date');
            const actualAmountInput = document.getElementById('actual-deposit-amount');
            
            if (expectedDate) {
                actualDateInput.value = expectedDate.split('T')[0];
            }
            
            if (saleAmount) {
                actualAmountInput.value = saleAmount.toLocaleString();
            }
            
            return new Promise((resolve, reject) => {
                statusChangeModal.style.display = 'block';
                modalManager.pushModal(statusChangeModal);
                
                const closeModal = () => {
                    statusChangeModal.style.display = 'none';
                    modalManager.removeModal(statusChangeModal);
                    statusChangeForm.reset();
                    select.value = currentStatus;
                    resolve();
                };

                const cancelBtn = statusChangeModal.querySelector('.cancel-btn');
                const closeBtn = statusChangeModal.querySelector('.close');
                cancelBtn.onclick = closeModal;
                closeBtn.onclick = closeModal;

                statusChangeForm.onsubmit = async (e) => {
                    e.preventDefault();
                    
                    const actualAmount = parseInt(actualAmountInput.value.replace(/[^\d]/g, ''), 10);
                    const actualDate = new Date(actualDateInput.value);
                    
                    if (isNaN(actualAmount)) {
                        alert('올바른 금액을 입력해주세요.');
                        return;
                    }
                    
                    if (isNaN(actualDate.getTime())) {
                        alert('올바른 날짜를 입력해주세요.');
                        return;
                    }
                    
                    try {
                        await this.updateDeposit(id, {
                            status,
                            actualDepositAmount: actualAmount,
                            actualDepositDate: actualDate.toISOString()
                        });
                        
                        statusChangeModal.style.display = 'none';
                        modalManager.removeModal(statusChangeModal);
                        statusChangeForm.reset();
                        
                        if (select) {
                            select.value = status;
                            select.disabled = true;
                            select.dataset.editMode = 'false';
                        }
                        
                        this.loadData();
                        resolve();
                    } catch (error) {
                        console.error('입금 처리 실패:', error);
                        alert('입금 처리에 실패했습니다.');
                        select.value = currentStatus;
                        reject(error);
                    }
                };
            });
        } else if (status === '입금보류') {
            const holdReasonModal = document.getElementById('hold-reason-modal');
            const holdReasonForm = document.getElementById('hold-reason-form');
            
            return new Promise((resolve, reject) => {
                holdReasonModal.style.display = 'block';
                modalManager.pushModal(holdReasonModal);

                const closeModal = () => {
                    holdReasonModal.style.display = 'none';
                    modalManager.removeModal(holdReasonModal);
                    holdReasonForm.reset();
                    select.value = currentStatus;
                    resolve();
                };

                const cancelBtn = holdReasonModal.querySelector('.cancel-btn');
                const closeBtn = holdReasonModal.querySelector('.close');
                cancelBtn.onclick = closeModal;
                closeBtn.onclick = closeModal;

                holdReasonForm.onsubmit = async (e) => {
                    e.preventDefault();
                    const reason = document.getElementById('hold-reason').value;
                    
                    try {
                        await this.updateDeposit(id, {
                            status,
                            holdReason: reason,
                            actualDepositAmount: null,
                            actualDepositDate: null
                        });
                        
                        holdReasonModal.style.display = 'none';
                        modalManager.removeModal(holdReasonModal);
                        holdReasonForm.reset();
                        
                        if (select) {
                            select.value = status;
                            select.dataset.editMode = 'false';
                        }
                        
                        this.loadData();
                        resolve();
                    } catch (error) {
                        console.error('입금보류 처리 실패:', error);
                        alert('상태 변경에 실패했습니다.');
                        select.value = currentStatus;
                        reject(error);
                    }
                };
            });
        } else if (status === '미입금') {
            try {
                await this.updateDeposit(id, {
                    status,
                    actualDepositAmount: null,
                    actualDepositDate: null,
                    fee: null,
                    holdReason: null
                });
                
                if (select) {
                    select.value = status;
                    select.disabled = false;
                    select.dataset.editMode = 'false';
                }
                
                this.loadData();
            } catch (error) {
                console.error('미입금 처리 실패:', error);
                alert('상태 변경에 실패했습니다.');
                select.value = currentStatus;
            }
        }
    }

    async editDeposit(id, currentStatus) {
        try {
            const passwordModal = document.getElementById('password-modal');
            const passwordForm = document.getElementById('password-form');
            
            return new Promise((resolve) => {
                passwordModal.style.display = 'block';
                modalManager.pushModal(passwordModal);
                
                const closeModal = () => {
                    passwordModal.style.display = 'none';
                    modalManager.removeModal(passwordModal);
                    passwordForm.reset();
                    resolve();
                };

                const cancelBtn = passwordModal.querySelector('.cancel-btn');
                const closeBtn = passwordModal.querySelector('.close');
                cancelBtn.onclick = closeModal;
                closeBtn.onclick = closeModal;

                passwordForm.onsubmit = async (e) => {
                    e.preventDefault();
                    const password = document.getElementById('status-change-password').value;
                    
                    try {
                        const response = await fetch('/api/auth/verify-password', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            },
                            body: JSON.stringify({ password })
                        });

                        if (response.ok) {
                            passwordModal.style.display = 'none';
                            modalManager.removeModal(passwordModal);
                            passwordForm.reset();
                            
                            const select = document.querySelector(`select[data-id="${id}"]`);
                            if (select) {
                                select.disabled = false;
                                select.dataset.editMode = 'true';
                            }
                            resolve();
                        } else {
                            const data = await response.json();
                            alert(data.message || '비밀번호가 올바르지 않습니다.');
                        }
                    } catch (error) {
                        console.error('비밀번호 검증 실패:', error);
                        alert('비밀번호 검증 중 오류가 발생했습니다.');
                    }
                };
            });
        } catch (error) {
            console.error('수정 처리 실패:', error);
            alert('수정 처리에 실패했습니다.');
        }
    }

    async updateDeposit(id, data) {
        
        const response = await fetch(`/api/card-deposits/${id}`, {
            method: 'PATCH',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[API 에러]:', errorText);
            throw new Error('입금 정보 업데이트 실패');
        }

        const result = await response.json();
        return result;
    }

    handleRowSelection(checkbox) {
        const row = checkbox.closest('tr');
        const cardCompany = row.dataset.cardCompany;
        const rowId = row.dataset.id;

        if (checkbox.checked) {
            // 다른 카드사가 선택되어 있는 경우
            if (this.selectedCardCompany && this.selectedCardCompany !== cardCompany) {
                checkbox.checked = false;
                alert('동일한 카드사의 건만 선택할 수 있습니다.');
                return;
            }

            // 첫 선택인 경우 카드사 저장
            if (!this.selectedCardCompany) {
                this.selectedCardCompany = cardCompany;
                this.selectedRows.add(rowId);
                row.classList.add('selected');
                
                // 카드사 필터 자동 선택 (선택 상태 저장 후 필터링)
                if (this.cardCompanyFilter) {
                    this.cardCompanyFilter.value = cardCompany;
                    this.filterData();
                }
            } else {
                this.selectedRows.add(rowId);
                row.classList.add('selected');
            }
        } else {
            this.selectedRows.delete(rowId);
            row.classList.remove('selected');

            // 선택된 건이 없는 경우 선택된 카드사 초기화
            if (this.selectedRows.size === 0) {
                this.selectedCardCompany = null;
                // 카드사 필터를 '전체'로 변경
                if (this.cardCompanyFilter) {
                    this.cardCompanyFilter.value = 'all';
                    this.filterData();
                }
            }
        }

        this.updateFloatingModal();
    }

    updateFloatingModal() {
        const floatingModal = document.getElementById('floating-selection-modal');
        if (!floatingModal) return;

        if (this.selectedRows.size > 0) {
            const selectedCount = this.selectedRows.size;
            const totalAmount = this.calculateSelectedTotal();

            document.getElementById('selected-count').textContent = selectedCount;
            document.getElementById('selected-amount').textContent = this.formatCurrency(totalAmount);
            floatingModal.style.display = 'block';
        } else {
            floatingModal.style.display = 'none';
        }
    }

    calculateSelectedTotal() {
        let total = 0;
        this.selectedRows.forEach(rowId => {
            const row = document.querySelector(`tr[data-id="${rowId}"]`);
            if (row) {
                total += parseFloat(row.dataset.saleAmount) || 0;
            }
        });
        return total;
    }

    clearSelection() {
        this.selectedRows.clear();
        this.selectedCardCompany = null;
        document.querySelectorAll('.row-checkbox').forEach(checkbox => {
            checkbox.checked = false;
            checkbox.closest('tr')?.classList.remove('selected');
        });
        this.updateFloatingModal();
    }

    showBulkDepositModal() {
        const modal = document.getElementById('bulk-deposit-modal');
        if (!modal) return;

        const totalAmount = this.calculateSelectedTotal();
        
        // 여러 건 선택 시 총 매출금액이 양수인지 확인
        if (this.selectedRows.size > 1 && totalAmount <= 0) {
            alert('여러 건을 선택할 경우 총 매출금액이 양수여야 합니다.');
            return;
        }

        document.getElementById('bulk-selected-count').textContent = `${this.selectedRows.size}건`;
        document.getElementById('bulk-total-amount').textContent = this.formatCurrency(totalAmount);
        document.getElementById('bulk-deposit-date').value = this.formatDate(new Date());
        document.getElementById('bulk-actual-amount').value = '';
        document.getElementById('bulk-fee').textContent = '0원';

        // 실제 입금액 입력 필드에 천단위 컴마 이벤트 리스너 추가
        const actualAmountInput = document.getElementById('bulk-actual-amount');
        actualAmountInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^\d]/g, '');  // 숫자만 추출
            if (value) {
                e.target.value = Number(value).toLocaleString();  // 천단위 컴마 추가
                this.calculateBulkFee(value);  // 수수료 계산 시에는 숫자만 전달
            } else {
                e.target.value = '';
                document.getElementById('bulk-fee').textContent = '0원';
            }
        });

        // 닫기 버튼 이벤트 리스너
        const closeBtn = modal.querySelector('.close-btn');
        const cancelBtn = modal.querySelector('.cancel-btn');
        
        const closeModal = () => {
            modal.style.display = 'none';
            document.removeEventListener('keydown', handleEscKey);
        };

        // ESC 키 이벤트 핸들러
        const handleEscKey = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };

        closeBtn?.addEventListener('click', closeModal);
        cancelBtn?.addEventListener('click', closeModal);
        document.addEventListener('keydown', handleEscKey);

        modal.style.display = 'block';
    }

    hideBulkDepositModal() {
        const modal = document.getElementById('bulk-deposit-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    calculateBulkFee(actualAmountStr) {
        const actualAmount = parseFloat(actualAmountStr.replace(/[^\d]/g, '')) || 0;
        const totalAmount = this.calculateSelectedTotal();
        const fee = totalAmount - actualAmount;

        document.getElementById('bulk-fee').textContent = this.formatCurrency(fee);
    }

    async processBulkDeposit() {
        const actualAmountStr = document.getElementById('bulk-actual-amount').value;
        const actualAmount = parseFloat(actualAmountStr.replace(/[^\d]/g, '')) || 0;
        const depositDate = document.getElementById('bulk-deposit-date').value;
        const totalAmount = this.calculateSelectedTotal();
        const fee = totalAmount - actualAmount;

        if (fee < 0) {
            alert('실제 입금액이 총 매출액보다 클 수 없습니다.');
            return;
        }

        try {
            // 선택된 각 건에 대해 입금 처리
            const promises = Array.from(this.selectedRows).map(async (rowId) => {
                const row = document.querySelector(`tr[data-id="${rowId}"]`);
                if (!row) return;

                const saleAmount = parseFloat(row.dataset.saleAmount) || 0;
                const rowFee = Math.round((saleAmount / totalAmount) * fee); // 비율에 따른 수수료 계산
                const rowActualAmount = saleAmount - rowFee;

                const response = await fetch(`/api/card-deposits/${rowId}`, {
                    method: 'PATCH',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        status: '입금완료',
                        actualDepositDate: depositDate,
                        actualDepositAmount: rowActualAmount,
                        fee: rowFee,
                        bulkDeposit: true // 일괄입금 여부를 표시하는 플래그 추가
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('[API 에러]:', errorText);
                    throw new Error(`Failed to update deposit ${rowId}`);
                }

                return await response.json();
            });

            await Promise.all(promises);
            
            this.hideBulkDepositModal();
            this.clearSelection();
            this.loadData(); // 데이터 새로고침
            
            alert('일괄입금 처리가 완료되었습니다.');
        } catch (error) {
            console.error('일괄입금 처리 실패:', error);
            alert('일괄입금 처리 중 오류가 발생했습니다.');
        }
    }

    async exportToExcel() {
        // 현재 필터 조건으로 데이터 다시 로드
        await this.loadData();
        
        // 카드사 필터 적용
        let dataToExport = [...this.filteredData];
        const selectedCardCompany = this.cardCompanyFilter.value;
        
        if (selectedCardCompany !== 'all') {
            dataToExport = dataToExport.filter(item => item.cardCompany === selectedCardCompany);
        }

        if (!dataToExport || dataToExport.length === 0) {
            alert('저장할 데이터가 없습니다.');
            return;
        }

        const startDate = this.startDateInput.value;
        const endDate = this.endDateInput.value;
        const cardCompanyName = selectedCardCompany === 'all' ? '전체' : 
            this.cardCompanyFilter.options[this.cardCompanyFilter.selectedIndex].text;

        // 파일명 생성
        const fileName = `카드내역_${startDate}_${endDate}_${cardCompanyName}.xlsx`;

        // 날짜 포맷 함수
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            const koreanDate = new Date(date.getTime() + (9 * 60 * 60 * 1000)); // UTC+9 (한국 시간)
            return koreanDate.toISOString().split('T')[0];
        };

        // 엑셀 데이터 준비
        const headers = ['매출일자', '카드사', '매출금액', '수수료', '수수료율', '입금예정일', '입금일자', '입금금액', '비고'];
        const excelData = dataToExport.map(item => {
            // 수수료율 계산
            const feeRate = item.saleAmount ? ((item.fee / item.saleAmount) * 100).toFixed(2) : '0.00';
            
            const row = [
                formatDate(item.saleDate),
                item.cardCompany || '',
                (item.saleAmount || 0),
                (item.fee || 0),
                `${feeRate}%`,
                formatDate(item.expectedDepositDate),
                formatDate(item.actualDepositDate),
                (item.actualDepositAmount || 0),
                item.note || ''
            ];
            return row;
        });

        // 워크북 생성
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...excelData]);

        // 열 너비 설정
        const colWidths = [12, 10, 12, 12, 10, 12, 12, 12, 20];
        ws['!cols'] = colWidths.map(width => ({ width }));

        // 워크시트를 워크북에 추가
        XLSX.utils.book_append_sheet(wb, ws, '카드매출입금내역');

        // 파일 저장
        XLSX.writeFile(wb, fileName);
    }
}

// 전역 인스턴스 생성
const cardDeposits = new CardDepositsManager();

// DOM이 완전히 로드된 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 카드매출/입금 탭이 활성화되어 있는 경우에만 초기화
    const cardSalesContent = document.getElementById('card-sales-content');
    if (cardSalesContent && cardSalesContent.classList.contains('active')) {
        cardDeposits.init();
    }
});

// 탭 전환 이벤트 리스너
document.addEventListener('click', (e) => {
    if (e.target.matches('button[data-tab="card-sales"]')) {
        setTimeout(() => cardDeposits.init(), 100);
    }
});

// 전역 접근을 위해 export
window.cardDeposits = cardDeposits;

// 크롤링 완료 후 목록 새로고침 이벤트 리스너
window.addEventListener('refreshCardDeposits', async () => {
    console.log('카드매출/입금 목록 새로고침 시작');
    
    // cardDeposits 인스턴스의 loadData 메서드 호출
    await cardDeposits.loadData();
    
    console.log('카드매출/입금 목록 새로고침 완료');
});
