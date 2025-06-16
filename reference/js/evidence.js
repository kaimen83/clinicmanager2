import { formatCurrency } from '../utils.js';
import { loadSettings } from '../settings.js';

let currentReceiptFilter = 'all';
let startDate = null;
let endDate = null;

export function initEvidence() {
    setupEvidenceEventListeners();
    initializeDateInputs();
    loadExpenses();
}

export async function loadEvidenceData() {
    await loadExpenses();
}

function initializeDateInputs() {
    // 오늘 날짜를 기본값으로 설정

    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
    const today = new Date(koreaTime.toISOString().split('T')[0]);
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(today.getMonth() - 1);  // 1개월 전으로 설정
    
    const startDateInput = document.getElementById('evidence-start-date');
    const endDateInput = document.getElementById('evidence-end-date');
    
    startDateInput.value = oneMonthAgo.toISOString().split('T')[0];
    endDateInput.value = today.toISOString().split('T')[0];
    
    startDate = oneMonthAgo;
    endDate = today;
}

function setupEvidenceEventListeners() {
    // 날짜 입력 이벤트
    const startDateInput = document.getElementById('evidence-start-date');
    const endDateInput = document.getElementById('evidence-end-date');

    startDateInput.addEventListener('change', (e) => {
        startDate = new Date(e.target.value);
        loadExpenses();
    });

    endDateInput.addEventListener('change', (e) => {
        endDate = new Date(e.target.value);
        loadExpenses();
    });

    // 자동 크롤링 버튼 이벤트
    const autoCrawlingBtn = document.createElement('button');
    autoCrawlingBtn.className = 'auto-crawling-btn';
    autoCrawlingBtn.textContent = '자동 크롤링';
    document.querySelector('#evidence-content .date-range-group').appendChild(autoCrawlingBtn);

    // 모달 요소 생성
    const modal = document.createElement('div');
    modal.className = 'crawling-modal';
    modal.innerHTML = `
        <div class="crawling-modal-content">
            <header class="modal-header">
                <h3>홈택스 자동 크롤링</h3>
                <span class="crawling-modal-close">&times;</span>
            </header>
            <div class="modal-body">
                <div class="status-container">
                    <div class="status-icon">
                        <i class="fas fa-sync-alt"></i>
                    </div>
                    <p class="status-message">자동 크롤링을 시작하려면 시작 버튼을 클릭하세요.</p>
                    <div class="progress-container">
                        <div class="progress-bar"></div>
                    </div>
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="start-btn">시작</button>
                <button type="button" class="cancel-btn">취소</button>
            </div>
        </div>
    `;
    
    // 모달을 DOM에 추가
    document.body.appendChild(modal);

    // 크롤링 상태 변수 추가
    let isCrawling = false;

    // 모달 열기
    autoCrawlingBtn.addEventListener('click', () => {
        modal.style.display = 'block';
        const progressBar = modal.querySelector('.progress-bar');
        const statusMessage = modal.querySelector('.status-message');
        progressBar.style.width = '0%';
        statusMessage.textContent = '자동 크롤링을 시작하려면 시작 버튼을 클릭하세요.';
    });

    // 모달 닫기 (X 버튼)
    const closeBtn = modal.querySelector('.crawling-modal-close');
    closeBtn.addEventListener('click', () => {
        if (!isCrawling) {
            modal.style.display = 'none';
        }
    });

    // 취소 버튼
    const cancelBtn = modal.querySelector('.cancel-btn');
    cancelBtn.addEventListener('click', () => {
        if (!isCrawling) {
            modal.style.display = 'none';
        }
    });

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block' && !isCrawling) {
            modal.style.display = 'none';
        }
    });

    // 모달 외부 클릭시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal && !isCrawling) {
            modal.style.display = 'none';
        }
    });

    // 시작 버튼
    const startBtn = modal.querySelector('.start-btn');
    startBtn.addEventListener('click', async () => {
        const progressBar = modal.querySelector('.progress-bar');
        const statusMessage = modal.querySelector('.status-message');
        const statusIcon = modal.querySelector('.status-icon i');
        startBtn.disabled = true;
        cancelBtn.disabled = true;
        isCrawling = true;
        
        statusIcon.classList.add('rotating');
        
        try {
            // 크롤링 시작
            statusMessage.textContent = '홈택스 로그인 중...';
            progressBar.style.width = '10%';

            const response = await fetch('/api/hometax/crawl', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('크롤링 요청 실패');
            }

            // 크롤링 진행 상태 모니터링
            const eventSource = new EventSource('/api/hometax/status');
            
            eventSource.onmessage = async (event) => {
                const data = JSON.parse(event.data);
                progressBar.style.width = `${data.progress}%`;
                statusMessage.textContent = data.message;

                if (data.progress >= 100) {
                    eventSource.close();
                    isCrawling = false;
                    statusIcon.classList.remove('rotating');
                    
                    statusMessage.textContent = '영수증 매칭 중...';
                    try {
                        const matchResponse = await fetch('/api/hometax/match-receipts', {
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            }
                        });
                        
                        if (!matchResponse.ok) {
                            throw new Error('영수증 매칭 요청 실패');
                        }
                        
                        const matchResults = await matchResponse.json();
                        
                        // 자동 매칭 리스트
                        for (const match of matchResults.automatic) {
                            await fetch('/api/hometax/confirm-match', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                },
                                body: JSON.stringify({ expenseId: match.expense._id })
                            });
                        }
                        
                        modal.style.display = 'none';
                        
                        if (matchResults.needConfirmation.length > 0) {
                            showMatchConfirmationModal(matchResults.needConfirmation, matchResults.automatic);
                        } else {
                            const summary = showMatchingSummary(matchResults.automatic.length, 0, 0);
                            // 자동 매칭된 항목들의 상세 내역 추가
                            matchResults.automatic.forEach(item => summary.updateMatchingDetails('automatic-matches', item));
                        }
                        
                    } catch (error) {
                        console.error('영수증 매칭 중 오류:', error);
                        statusMessage.textContent = '영수증 매칭 중 오류가 발생했습니다.';
                    }
                }
            };

            eventSource.onerror = () => {
                eventSource.close();
                throw new Error('크롤링 상태 모니터링 실패');
            };

        } catch (error) {
            console.error('크롤링 실패:', error);
            statusMessage.textContent = '크롤링 중 오류가 발생했습니다.';
            progressBar.style.width = '0%';
            isCrawling = false;
            statusIcon.classList.remove('rotating');
        } finally {
            startBtn.disabled = false;
            cancelBtn.disabled = false;
        }
    });

    // 영수증 필터 이벤트
    const receiptFilter = document.getElementById('receipt-filter');
    if (receiptFilter) {
        receiptFilter.addEventListener('change', () => {
            currentReceiptFilter = receiptFilter.value;
            loadExpenses();
        });
    }

    // 수정 폼 제출 이벤트 리스너
    const editForm = document.getElementById('edit-expense-form');
    if (editForm) {
        editForm.addEventListener('submit', handleEditExpenseSubmit);
    }
}

async function loadExpenses() {
    try {
        const response = await fetch('/api/expenses', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const expenses = await response.json();

        // 영수증 필터 적용
        let filteredExpenses = expenses;
        if (currentReceiptFilter !== 'all') {
            filteredExpenses = expenses.filter(expense => 
                currentReceiptFilter === 'yes' ? expense.hasReceipt : !expense.hasReceipt
            );
        }

        // 날짜 필터링
        if (startDate && endDate) {
            filteredExpenses = filteredExpenses.filter(expense => {
                const expenseDate = new Date(expense.date);
                return expenseDate >= startDate && expenseDate <= endDate;
            });
        }

        // 총액 계산
        const totalAmount = filteredExpenses.reduce((sum, expense) => 
            sum + (expense.amount || 0), 0);

        // 헤더 금액 업데이트
        document.getElementById('total-expense-amount').textContent = 
            formatCurrency(totalAmount);

        // 리스트 표시
        const container = document.getElementById('no-receipt-expenses');
        container.innerHTML = `
            <div class="evidence-list-header">
                <div class="evidence-grid">
                    <div>지출일자</div>
                    <div>지출내역</div>
                    <div>거래처</div>
                    <div>지출방법</div>
                    <div>지출금액</div>
                    <div>영수증</div>
                    <div>비고</div>
                    <div></div>
                </div>
            </div>
            ${filteredExpenses.length > 0 ? filteredExpenses.map(expense => `
                <div class="evidence-group">
                    <div class="evidence-item">
                        <div class="evidence-grid">
                            <div class="date-info">
                                <span class="date">${new Date(expense.date).toLocaleDateString()}</span>
                            </div>
                            <div class="info-item">${expense.details}</div>
                            <div class="info-item">${expense.vendor || '-'}</div>
                            <div class="info-item">${expense.method}</div>
                            <div class="info-item amount">${formatCurrency(expense.amount)}</div>
                            <div class="info-item receipt-status">
                                <span class="${expense.hasReceipt ? 'has-receipt' : 'no-receipt'}">${expense.hasReceipt ? '있음' : '없음'}</span>
                            </div>
                            <div class="info-item">${expense.notes || ''}</div>
                            <div class="info-item">
                                <div class="evidence-action-container">
                                    <button onclick="editExpense('${expense._id}')" class="evidence-edit-btn">수정</button>
                                    <button onclick="deleteExpense('${expense._id}')" class="evidence-delete-btn">삭제</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('') : '<div class="no-data">지출 내역이 없습니다.</div>'}
        `;

    } catch (error) {
        console.error('지출 데이터 로드 중 에러:', error);
        alert('데이터를 불러오는데 실패했습니다.');
    }
}

// 수정 모달 이벤트 리스너를 전역으로 등록
window.editExpense = async function(expenseId) {
    try {
        // 설정 데이터 로드
        const settings = await loadSettings();
        
        // 거래처 select 옵션 업데이트
        const vendorSelect = document.getElementById('edit-expense-vendor');
        if (settings.vendors) {
            vendorSelect.innerHTML = `
                <option value="">선택하세요</option>
                ${settings.vendors.map(v => `
                    <option value="${v.name}">${v.name}</option>
                `).join('')}
            `;
        }

        // 지출계정 select 옵션 업데이트
        const accountSelect = document.getElementById('edit-expense-account');
        if (settings.expenseAccount) {
            accountSelect.innerHTML = `
                <option value="">선택하세요</option>
                ${settings.expenseAccount.map(a => `
                    <option value="${a.value}">${a.value}</option>
                `).join('')}
            `;
        }

        // 지출 데이터 가져오기
        const response = await fetch(`/api/expenses/${expenseId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('지출 정보를 가져오는데 실패했습니다.');
        
        const expense = await response.json();
        
        // 모달에 데이터 채우기
        document.getElementById('edit-expense-date').value = 
            new Date(expense.date).toISOString().split('T')[0];
        document.getElementById('edit-expense-details').value = expense.details;
        document.getElementById('edit-expense-amount').value = expense.amount;
        document.getElementById('edit-expense-method').value = expense.method;
        document.getElementById('edit-expense-vendor').value = expense.vendor || '';
        document.getElementById('edit-expense-account').value = expense.account || '';
        document.getElementById('edit-expense-notes').value = expense.notes || '';
        document.getElementById('edit-expense-receipt').checked = expense.hasReceipt;
        
        // 수정 폼에 expense ID 저장
        const form = document.getElementById('edit-expense-form');
        form.dataset.expenseId = expenseId;
        
        // 모달 표시
        document.getElementById('edit-expense-modal').style.display = 'block';
    } catch (error) {
        console.error('지출 정보 로드 중 에러:', error);
        alert('지출 정보를 불러오는데 실패했습니니다.');
    }
};

// 수정 폼 제출 처리 함수
async function handleEditExpenseSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const expenseId = e.target.dataset.expenseId;
    const formData = {
        date: document.getElementById('edit-expense-date').value,
        details: document.getElementById('edit-expense-details').value,
        amount: Number(document.getElementById('edit-expense-amount').value),
        method: document.getElementById('edit-expense-method').value,
        vendor: document.getElementById('edit-expense-vendor').value,
        account: document.getElementById('edit-expense-account').value,
        notes: document.getElementById('edit-expense-notes').value,
        hasReceipt: document.getElementById('edit-expense-receipt').checked
    };

    try {
        const response = await fetch(`/api/expenses/${expenseId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('지출 정보 수정에 실패했습니다.');

        // 모달 닫기
        document.getElementById('edit-expense-modal').style.display = 'none';
        
        // 목록 새로고침
        await loadExpenses();
        
        alert('지출 정보가 수정되었습니다.');
    } catch (error) {
        console.error('지출 정보 수정 중 에러:', error);
        alert(error.message);
    }
}

// 삭제 함수를 전역으로 등록
window.deleteExpense = async function(expenseId) {
    if (!confirm('정말 이 지출 내역을 삭제하시겠습니까?')) {
        return;
    }

    try {
        const response = await fetch(`/api/expenses/${expenseId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('지출 정보 삭제에 실패했습니다.');
        
        // 목록 새로고침
        await loadExpenses();
        
        alert('지출 내역이 삭제되었습니다.');
    } catch (error) {
        console.error('지출 정보 삭제 중 에러:', error);
        alert(error.message);
    }
};

// 매칭 결과 브리핑을 보여주는 함수 수정
function showMatchingSummary(automaticCount, confirmedCount, rejectedCount) {
    const summaryModal = document.createElement('div');
    summaryModal.className = 'match-confirmation-modal';
    summaryModal.innerHTML = `
        <div class="match-confirmation-content">
            <header class="modal-header">
                <div class="modal-title">
                    <i class="fas fa-chart-pie"></i>
                    <h3>영수증 매칭 결과</h3>
                </div>
                <span class="confirmation-modal-close">&times;</span>
            </header>
            <div class="modal-body">
                <div class="matching-details">
                    <div id="automatic-matches-section" class="details-section ${automaticCount > 0 ? '' : 'empty'}">
                        <div class="details-header">
                            <i class="fas fa-robot"></i>
                            <h4>자동 매칭 내역 (${automaticCount}건)</h4>
                        </div>
                        <div class="details-content" id="automatic-matches">
                            ${automaticCount > 0 ? '' : '<p class="no-items">자동 매칭된 항목이 없습니다.</p>'}
                        </div>
                    </div>
                    <div id="confirmed-matches-section" class="details-section ${confirmedCount > 0 ? '' : 'empty'}">
                        <div class="details-header">
                            <i class="fas fa-user-check"></i>
                            <h4>수동 매칭 확인 내역 (${confirmedCount}건)</h4>
                        </div>
                        <div class="details-content" id="confirmed-matches">
                            ${confirmedCount > 0 ? '' : '<p class="no-items">수동 확인된 항목이 없습니다.</p>'}
                        </div>
                    </div>
                    <div id="rejected-matches-section" class="details-section ${rejectedCount > 0 ? '' : 'empty'}">
                        <div class="details-header">
                            <i class="fas fa-user-times"></i>
                            <h4>매칭 제외 내역 (${rejectedCount}건)</h4>
                        </div>
                        <div class="details-content" id="rejected-matches">
                            ${rejectedCount > 0 ? '' : '<p class="no-items">제외된 항목이 없습니다.</p>'}
                        </div>
                    </div>
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="evidence-complete-btn">
                    <i class="fas fa-check-circle"></i> 확인
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(summaryModal);

    // 섹션 접기/펼치기 이벤트 추가
    summaryModal.querySelectorAll('.details-header').forEach(header => {
        header.addEventListener('click', () => {
            const section = header.closest('.details-section');
            section.classList.toggle('expanded');
        });
    });

    // 이벤트 리스너 추가
    const closeModal = () => {
        summaryModal.remove();
        loadExpenses();
    };

    summaryModal.querySelector('.confirmation-modal-close').addEventListener('click', closeModal);
    summaryModal.querySelector('.evidence-complete-btn').addEventListener('click', closeModal);

    // 매칭 내역을 업데이트하는 함수
    function updateMatchingDetails(type, item) {
        const container = summaryModal.querySelector(`#${type}`);
        if (!container) {
            console.error(`Container #${type} not found`);
            return;
        }

        // no-items 메시지 제거
        const noItemsMessage = container.querySelector('.no-items');
        if (noItemsMessage) {
            container.innerHTML = '';
        }
        
        const detailsItem = document.createElement('div');
        detailsItem.className = 'details-item';
        detailsItem.innerHTML = `
            <div class="details-item-header">
                <span class="details-amount">${item.expense.amount.toLocaleString()}원</span>
                <span class="details-date">${new Date(item.expense.date).toLocaleDateString()}</span>
            </div>
            <div class="details-item-content">
                <div class="details-expense">
                    <p><strong>지출내역:</strong> ${item.expense.details}</p>
                    <p><strong>거래처:</strong> ${item.expense.vendor || '-'}</p>
                </div>
                <div class="details-receipt">
                    <p><strong>${item.type === 'tax' ? '세금계산서' : '현금영수증'}:</strong> 
                       ${item.type === 'tax' ? item.receipt.상호 : item.receipt.가맹점명}</p>
                </div>
            </div>
        `;
        container.appendChild(detailsItem);

        // empty 클래스 제거
        const sectionElement = summaryModal.querySelector(`#${type}-section`);
        if (sectionElement) {
            sectionElement.classList.remove('empty');
            sectionElement.classList.add('expanded');
        }
    }

    return {
        updateMatchingDetails
    };
}

// 매칭 확인 모달 표시 함수 수정
function showMatchConfirmationModal(matchItems, automaticItems) {
    let confirmedCount = 0;
    let rejectedCount = 0;
    const automaticCount = automaticItems.length;
    const matchedItems = []; // 배열로 변경
    const rejectedItems = []; // 배열로 변경

    const confirmationModal = document.createElement('div');
    confirmationModal.className = 'match-confirmation-modal';
    confirmationModal.innerHTML = `
        <div class="match-confirmation-content">
            <header class="modal-header">
                <div class="modal-title">
                    <i class="fas fa-receipt"></i>
                    <h3>영수증 매칭 확인</h3>
                </div>
                <span class="confirmation-modal-close">&times;</span>
            </header>
            <div class="modal-body">
                <div class="match-items">
                    <div class="match-info">
                        <i class="fas fa-info-circle"></i>
                        <p>다음 항목들의 매칭 여부를 확인해주세요</p>
                    </div>
                    ${matchItems.map((item, index) => `
                        <div class="match-item">
                            <div class="match-item-header">
                                <div class="match-title">
                                    <span class="match-label">매칭 ${index + 1}</span>
                                    <span class="match-amount">${item.expense.amount.toLocaleString()}원</span>
                                </div>
                                <div class="match-date">${new Date(item.expense.date).toLocaleDateString()}</div>
                            </div>
                            <div class="match-details">
                                <div class="expense-info">
                                    <div class="info-header">
                                        <i class="fas fa-file-invoice"></i>
                                        <h5>지출내역</h5>
                                    </div>
                                    <div class="info-content">
                                        <div class="info-row">
                                            <span class="info-label">내용</span>
                                            <span class="info-value">${item.expense.details}</span>
                                        </div>
                                        <div class="info-row">
                                            <span class="info-label">거래처</span>
                                            <span class="info-value">${item.expense.vendor || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="receipt-info">
                                    <div class="info-header">
                                        <i class="fas fa-receipt"></i>
                                        <h5>${item.type === 'tax' ? '세금계산서' : '현금영수증'}</h5>
                                    </div>
                                    <div class="info-content">
                                        <div class="info-row">
                                            <span class="info-label">상호</span>
                                            <span class="info-value">${item.type === 'tax' ? item.receipt.상호 : item.receipt.가맹점명}</span>
                                        </div>
                                        <div class="info-row">
                                            <span class="info-label">날짜</span>
                                            <span class="info-value">${item.type === 'tax' ? item.receipt.작성일자 : item.receipt.매입일시}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="match-actions">
                                <button class="confirm-match-btn" data-expense-id="${item.expense._id}">
                                    <i class="fas fa-check"></i> 매칭 확인
                                </button>
                                <button class="reject-match-btn" data-expense-id="${item.expense._id}">
                                    <i class="fas fa-times"></i> 매칭 제외
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    // 매칭 확인 버튼 이벤트 수정
    confirmationModal.querySelectorAll('.confirm-match-btn').forEach((btn, index) => {
        btn.addEventListener('click', async () => {
            const expenseId = btn.dataset.expenseId;
            try {
                await fetch('/api/hometax/confirm-match', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ expenseId })
                });
                
                confirmedCount++;
                matchedItems.push(matchItems[index]); // 배열에 추가
                btn.closest('.match-item').remove();
                
                checkAndShowSummary();
            } catch (error) {
                console.error('매칭 확인 중 오류:', error);
                alert('매칭 확인 중 오류가 발생했습니다.');
            }
        });
    });

    // 매칭 제외 버튼 이벤트 수정
    confirmationModal.querySelectorAll('.reject-match-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            rejectedCount++;
            rejectedItems.push(matchItems[index]); // 배열에 추가
            btn.closest('.match-item').remove();
            checkAndShowSummary();
        });
    });

    function checkAndShowSummary() {
        const remainingItems = confirmationModal.querySelectorAll('.match-item');
        if (remainingItems.length === 0) {
            confirmationModal.remove();
            const summary = showMatchingSummary(automaticCount, confirmedCount, rejectedCount);
            
            automaticItems.forEach(item => summary.updateMatchingDetails('automatic-matches', item));
            matchedItems.forEach(item => summary.updateMatchingDetails('confirmed-matches', item));
            rejectedItems.forEach(item => summary.updateMatchingDetails('rejected-matches', item));
        }
    }

    document.body.appendChild(confirmationModal);
}

export { handleEditExpenseSubmit }; 