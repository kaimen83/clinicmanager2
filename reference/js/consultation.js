import { formatCurrency } from '../utils.js';
import { loadSettings } from '../settings.js';

let currentPeriodDays = 30;
let currentStatus = 'all';
let currentFilteredData = [];

export function initConsultation() {
    setupConsultationEventListeners();
    initializeDateFilters();
}

function initializeDateFilters() {
    const startDateInput = document.getElementById('consultation-start-date');
    const endDateInput = document.getElementById('consultation-end-date');
    
    // 현재 날짜를 종료일로 설정

    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
    const today = new Date(koreaTime.toISOString().split('T')[0]);
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    // 날짜를 YYYY-MM-DD 형식으로 변환
    startDateInput.value = oneMonthAgo.toISOString().split('T')[0];
    endDateInput.value = today.toISOString().split('T')[0];
}

function setupConsultationEventListeners() {
    // 날짜 필터 이벤트
    const startDateInput = document.getElementById('consultation-start-date');
    const endDateInput = document.getElementById('consultation-end-date');
    
    startDateInput.addEventListener('change', () => filterAndDisplayData());
    endDateInput.addEventListener('change', () => filterAndDisplayData());

    // 기간 필터 버튼 이벤트
    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentPeriodDays = button.dataset.period;
            filterAndDisplayData();
        });
    });

    // 상태 필터 버튼 이벤트
    const statusSelect = document.getElementById('payment-status-select');
    statusSelect.addEventListener('change', () => {
        currentStatus = statusSelect.value;
        filterAndDisplayData();
    });

    // 미동의 금액 select 이벤트
    const notAgreedSelect = document.getElementById('notagreed-select');
    notAgreedSelect.addEventListener('change', () => {
        filterAndDisplayData();
    });

    // 엑셀 저장 버튼 이벤트
    document.getElementById('export-excel').addEventListener('click', () => {
        if (!currentFilteredData || currentFilteredData.length === 0) {
            alert('저장할 데이터가 없습니다.');
            return;
        }
        exportToExcel(currentFilteredData);
    });
}

export async function loadConsultationData() {
    await filterAndDisplayData();
}

async function filterAndDisplayData() {
    try {
        const settings = await loadSettings();
        const consultResponse = await fetch('/api/consultations', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const consultations = await consultResponse.json();

        const transResponse = await fetch('/api/transactions', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const transactions = await transResponse.json();

        // 기간 필터링을 위한 날짜 설정
        const startDateInput = document.getElementById('consultation-start-date');
        const endDateInput = document.getElementById('consultation-end-date');
        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);
        endDate.setHours(23, 59, 59, 999); // 종료일의 끝시간으로 설정

        // 선택된 기간 내의 상담 기록만 필터링
        const filteredConsultations = consultations.filter(consultation => {
            const targetDate = consultation.agreed ? new Date(consultation.confirmedDate) : new Date(consultation.date);
            return targetDate >= startDate && targetDate <= endDate;
        });

        // 선택된 기간 내의 수납 내역만 필터링
        const filteredTransactions = transactions.filter(transaction => {
            const transDate = new Date(transaction.date);
            return transDate >= startDate && transDate <= endDate;
        });

        let filteredData = groupConsultationsByChart(filteredConsultations, filteredTransactions);

        // 상태 필터링
        if (currentStatus !== 'all') {
            filteredData = filteredData.filter(group => {
                // 각 상담 내역별로 필터링 조건 평가
                const filteredConsultations = group.consultations.filter(consultation => {
                    const isAgreed = consultation.agreed;
                    const amount = consultation.amount || 0;
                    const paidAmount = group.payments.consultation
                        .reduce((sum, p) => sum + (p.amount || 0), 0);

                    switch (currentStatus) {
                        case 'completed':
                            return isAgreed && amount > 0 && amount <= paidAmount;
                        case 'partial':
                            return isAgreed && amount > 0 && amount > paidAmount;
                        case 'pending':
                            return isAgreed && amount > 0 && amount < paidAmount;
                        case 'notagreed':
                            return !isAgreed;
                        default:
                            return true;
                    }
                });

                // 필터링된 상담 내역이 있는 경우에만 해당 그룹 포함
                if (filteredConsultations.length > 0) {
                    group.consultations = filteredConsultations;
                    return true;
                }
                return false;
            });
        }

        // 미동의 금액 필터링
        const notAgreedSelect = document.getElementById('notagreed-select');
        const notAgreedValue = notAgreedSelect.value;
        
        if (notAgreedValue !== 'all') {
            filteredData = filteredData.filter(group => {
                const notAgreedAmount = group.consultations
                    .filter(c => !c.agreed)
                    .reduce((sum, c) => sum + (c.amount || 0), 0);
                
                switch (notAgreedValue) {
                    case 'under100': return notAgreedAmount <= 1000000;
                    case 'over100': return notAgreedAmount > 1000000;
                    case 'over200': return notAgreedAmount > 2000000;
                    case 'over300': return notAgreedAmount > 3000000;
                    default: return true;
                }
            });
        }

        // 현재 필터링된 데이터 저장 및 표시
        currentFilteredData = filteredData;
        displayConsultationGroups(filteredData);

    } catch (error) {
        console.error('데이터 로드 중 에러:', error);
        alert('데이터를 불러오는데 실패했습니다.');
    }
}

// 차트번호별 그룹화 함수 수정
function groupConsultationsByChart(consultations, transactions) {
    const groups = {};
    
    consultations.forEach(consultation => {
        if (!groups[consultation.chartNumber]) {
            groups[consultation.chartNumber] = {
                chartNumber: consultation.chartNumber,
                patientName: consultation.patientName,
                consultations: [],
                payments: {
                    consultation: [],
                    normal: []
                },
                lastConsultDate: new Date(consultation.date)
            };
        }
        groups[consultation.chartNumber].consultations.push(consultation);
        
        // 최근 상담일자 업데이트 (정렬 목적으로 유지)
        const consultDate = new Date(consultation.date);
        if (consultDate > groups[consultation.chartNumber].lastConsultDate) {
            groups[consultation.chartNumber].lastConsultDate = consultDate;
        }
    });

    // 수납 내역 추가 (이미 필터링된 transactions 사용)
    transactions.forEach(transaction => {
        if (groups[transaction.chartNumber]) {
            if (transaction.isConsultation) {
                groups[transaction.chartNumber].payments.consultation.push({
                    date: transaction.date,
                    amount: transaction.paymentAmount
                });
            } else {
                groups[transaction.chartNumber].payments.normal.push({
                    date: transaction.date,
                    amount: transaction.paymentAmount
                });
            }
        }
    });

    // 각 그룹 내 상담내역과 수납내역을 날짜순으로 정렬
    Object.values(groups).forEach(group => {
        group.consultations.sort((a, b) => {
            const dateA = a.agreed ? new Date(a.confirmedDate) : new Date(a.date);
            const dateB = b.agreed ? new Date(b.confirmedDate) : new Date(b.date);
            return dateB - dateA;
        });
        group.payments.consultation.sort((a, b) => new Date(b.date) - new Date(a.date));
        group.payments.normal.sort((a, b) => new Date(b.date) - new Date(a.date));
    });

    // 최근 날짜 기준으로 그룹 정렬 (동의된 상담은 확정날짜, 미동의는 상담날짜 기준)
    return Object.values(groups).sort((a, b) => {
        const getLatestDate = (group) => {
            if (!group.consultations.length) return new Date(0);
            const consultation = group.consultations[0]; // 이미 정렬된 상태이므로 첫 번째 항목이 가장 최신
            return consultation.agreed ? new Date(consultation.confirmedDate) : new Date(consultation.date);
        };
        
        const dateA = getLatestDate(a);
        const dateB = getLatestDate(b);
        return dateB - dateA;
    });
}

// displayConsultationGroups 함수 추가
function displayConsultationGroups(groups) {
    // 전체 합계 계산
    const totals = groups.reduce((acc, group) => {
        const totalAmount = group.consultations.reduce((sum, c) => sum + (c.amount || 0), 0);
        const agreedAmount = group.consultations.filter(c => c.agreed).reduce((sum, c) => sum + (c.amount || 0), 0);
        const notAgreedAmount = group.consultations.filter(c => !c.agreed).reduce((sum, c) => sum + (c.amount || 0), 0);
        const paidAmount = group.payments.consultation.reduce((sum, p) => sum + (p.amount || 0), 0);
        
        return {
            total: acc.total + totalAmount,
            agreed: acc.agreed + agreedAmount,
            notAgreed: acc.notAgreed + notAgreedAmount,
            paid: acc.paid + paidAmount
        };
    }, { total: 0, agreed: 0, notAgreed: 0, paid: 0 });

    // 헤더 금액 업데이트
    document.getElementById('total-amount-sum').textContent = formatCurrency(totals.total);
    const agreedRate = totals.total > 0 ? ((totals.agreed / totals.total) * 100).toFixed(1) : 0;
    document.getElementById('agreed-amount-sum').textContent = `${formatCurrency(totals.agreed)} (동의율: ${agreedRate}%)`;
    document.getElementById('not-agreed-amount-sum').textContent = formatCurrency(totals.notAgreed);
    document.getElementById('paid-amount-sum').textContent = formatCurrency(totals.paid);
    
    const remainingAmountElement = document.getElementById('remaining-amount-sum');
    remainingAmountElement.textContent = formatCurrency(Math.abs(totals.agreed - totals.paid));
    remainingAmountElement.style.cursor = 'pointer';
    remainingAmountElement.title = '클릭하면 전체 기간의 미수금을 확인할 수 있습니다';
    
    // 미수금 클릭 이벤트 추가
    remainingAmountElement.onclick = async () => {
        try {
            // 전체 데이터 조회
            const consultResponse = await fetch('/api/consultations', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const allConsultations = await consultResponse.json();

            const transResponse = await fetch('/api/transactions', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const allTransactions = await transResponse.json();

            // 전체 기간의 데이터로 그룹화
            const allGroups = groupConsultationsByChart(allConsultations, allTransactions);
            
            // 전체 미수금 계산
            const totalRemaining = allGroups.reduce((acc, group) => {
                const agreedAmount = group.consultations
                    .filter(c => c.agreed)
                    .reduce((sum, c) => sum + (c.amount || 0), 0);
                const paidAmount = group.payments.consultation
                    .reduce((sum, p) => sum + (p.amount || 0), 0);
                return acc + (agreedAmount - paidAmount);
            }, 0);

            // 툴팁 생성 및 표시
            const tooltip = document.createElement('div');
            tooltip.className = 'remaining-tooltip';
            tooltip.innerHTML = `
                <div class="tooltip-content">
                    <div>전체 진료잔액: ${formatCurrency(Math.abs(totalRemaining))}</div>
                </div>
            `;
            
            // 기존 툴팁 제거
            const existingTooltip = document.querySelector('.remaining-tooltip');
            if (existingTooltip) {
                existingTooltip.remove();
            }

            // 툴팁 위치 설정 및 표시
            document.body.appendChild(tooltip);
            const rect = remainingAmountElement.getBoundingClientRect();
            tooltip.style.position = 'absolute';
            tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
            tooltip.style.left = `${rect.left + window.scrollX}px`;

            // 툴팁 제거 이벤트
            const removeTooltip = (e) => {
                if (!tooltip.contains(e.target) && e.target !== remainingAmountElement) {
                    tooltip.remove();
                    document.removeEventListener('click', removeTooltip);
                }
            };
            document.addEventListener('click', removeTooltip);
        } catch (error) {
            console.error('전체 미수금 계산 중 에러:', error);
            alert('전체 미수금을 계산하는데 실패했습니다.');
        }
    };

    // 리스트 표시
    const container = document.getElementById('consultation-groups');
    container.innerHTML = `
        <div class="consultation-list-header">
            <div class="consultation-grid">
                <div class="patient-info">
                    <span>차트번호</span>
                    <span>환자명</span>
                </div>
                <div class="amount-info">
                    <div class="amount-item">상담총액</div>
                    <div class="amount-item">동의금액</div>
                    <div class="amount-item">미동의금액</div>
                    <div class="amount-item">상담수납액</div>
                    <div class="amount-item">수납상태</div>
                </div>
            </div>
        </div>
        ${groups.map(group => {
            const totalConsultAmount = group.consultations.reduce((sum, c) => sum + (c.amount || 0), 0);
            const agreedAmount = group.consultations.filter(c => c.agreed).reduce((sum, c) => sum + (c.amount || 0), 0);
            const notAgreedAmount = group.consultations.filter(c => !c.agreed).reduce((sum, c) => sum + (c.amount || 0), 0);
            const totalConsultPaidAmount = group.payments.consultation.reduce((sum, p) => sum + (p.amount || 0), 0);
            const remainingAmount = agreedAmount - totalConsultPaidAmount;

            let remainingText = '';
            let statusClass = '';
            
            if (agreedAmount === 0 && totalConsultPaidAmount === 0) {
                remainingText = '미동의';
                statusClass = 'not-agreed';
            } else if (remainingAmount > 0) {
                remainingText = '미납금액';
                statusClass = 'unpaid';
            } else if (remainingAmount < 0) {
                remainingText = '초과납부';
                statusClass = 'overpaid';
            } else {
                remainingText = '완납';
                statusClass = 'paid';
            }

            return `
                <div class="consultation-group">
                    <div class="group-header">
                        <div class="consultation-grid">
                            <div class="patient-info">
                                <span class="chart-number">${group.chartNumber}</span>
                                <span class="patient-name">${group.patientName}</span>
                            </div>
                            <div class="amount-info">
                                <div class="amount-item">
                                    <span class="value">${formatCurrency(totalConsultAmount)}</span>
                                </div>
                                <div class="amount-item">
                                    <span class="value amount-blue">${formatCurrency(agreedAmount)}</span>
                                </div>
                                <div class="amount-item">
                                    <span class="value amount-gray">${formatCurrency(notAgreedAmount)}</span>
                                </div>
                                <div class="amount-item">
                                    <span class="value amount-red">${formatCurrency(totalConsultPaidAmount)}</span>
                                </div>
                                <div class="amount-item">
                                    <span class="amount-remaining ${statusClass}">
                                        ${remainingText} ${agreedAmount === 0 && totalConsultPaidAmount === 0 ? '' : formatCurrency(Math.abs(remainingAmount))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="group-details">
                        <div class="timeline-container">
                            <h4>상담 내역</h4>
                            <div class="consultation-timeline">
                                ${group.consultations.map(consultation => `
                                    <div class="timeline-item">
                                        <span class="timeline-date">
                                            ${new Date(consultation.agreed ? consultation.confirmedDate : consultation.date).toLocaleDateString()}
                                        </span>
                                        <div class="timeline-content">
                                            ${consultation.agreed ? '동의' : '미동의'}
                                        </div>
                                        <span class="consultation-amount ${consultation.agreed ? 'agreed' : 'not-agreed'}">
                                            ${formatCurrency(consultation.amount)}
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="timeline-container">
                            <h4>상담 수납 내역</h4>
                            <div class="payment-timeline">
                                ${group.payments.consultation.map(payment => `
                                    <div class="timeline-item">
                                        <span class="timeline-date">
                                            ${new Date(payment.date).toLocaleDateString()}
                                        </span>
                                        <span class="payment-amount consultation">
                                            ${formatCurrency(payment.amount)}
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('')}
    `;

    // 그룹 헤더 클릭 이벤트 리스너 추가
    document.querySelectorAll('.group-header').forEach(header => {
        header.addEventListener('click', () => {
            const details = header.nextElementSibling;
            const isActive = details.classList.contains('active');
            
            // 다른 열린 상세 정보 닫기
            document.querySelectorAll('.group-details.active').forEach(el => {
                if (el !== details) {
                    el.classList.remove('active');
                }
            });

            // 현재 상세 정보 토글
            details.classList.toggle('active');
        });
    });
}

// exportToExcel 함수 추가
async function exportToExcel(data) {
    try {
        const activeFilterBtn = document.querySelector('.filter-btn.active');
        const activeStatusBtn = document.querySelector('.status-btn.active');
        const notAgreedSelect = document.getElementById('notagreed-select');
        
        const period = activeFilterBtn?.textContent || '전체';
        const status = activeStatusBtn?.textContent || '전체';
        const notAgreed = notAgreedSelect?.options[notAgreedSelect.selectedIndex]?.text || '전체';
        const timestamp = new Date().toISOString().slice(0, 10);
        const defaultFileName = `상담수납_기간${period}_수납상태${status}_미동의금액${notAgreed}_${timestamp}.xlsx`;

        const excelData = data.map(group => ({
            '차트번호': group.chartNumber,
            '환자명': group.patientName,
            '총액': group.consultations.reduce((sum, c) => sum + (c.amount || 0), 0),
            '동의금액': group.consultations.filter(c => c.agreed).reduce((sum, c) => sum + (c.amount || 0), 0),
            '미동의금액': group.consultations.filter(c => !c.agreed).reduce((sum, c) => sum + (c.amount || 0), 0),
            '수납금액': group.payments.consultation.reduce((sum, p) => sum + (p.amount || 0), 0),
            '최근상담일': new Date(group.lastConsultDate).toLocaleDateString()
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "상담수납현황");

        XLSX.writeFile(workbook, defaultFileName);
    } catch (error) {
        console.error('엑셀 저장 중 에러:', error);
        alert('엑셀 파일 저장에 실패했습니다.');
    }
}

// 상담 내역 목록 업데이트 함수 수정
function updateConsultationList() {
    const listElement = document.getElementById('consultation-list');
    if (!listElement) return;

    listElement.innerHTML = consultations.map((consultation) => `
        <tr>
            <td>${new Date(consultation.date).toLocaleDateString()}</td>
            <td>${consultation.confirmedDate ? new Date(consultation.confirmedDate).toLocaleDateString() : '-'}</td>
            <td class="amount">${consultation.amount.toLocaleString()}원</td>
            <td>${consultation.staff}</td>
            <td>
                <button type="button" 
                        class="toggle-btn ${consultation.agreed ? 'agreed' : 'not-agreed'}"
                        onclick="toggleConsultationAgreed('${consultation._id}')">
                    ${consultation.agreed ? '동의' : '미동의'}
                </button>
            </td>
            <td>
                <button type="button" class="delete-btn" onclick="removeConsultation('${consultation._id}')">
                    삭제
                </button>
            </td>
        </tr>
    `).join('');
}

// 동의여부 토글 함수 수정
window.toggleConsultationAgreed = async function(consultationId) {
    try {
        // 현재 상담 데이터 찾기
        const consultation = consultations.find(c => c._id === consultationId);
        const isCurrentlyAgreed = consultation.agreed;
        const willBeAgreed = !isCurrentlyAgreed;

        let confirmedDate = null;
        
        // 미동의에서 동의로 변경하는 경우에만 확정날짜 모달 표시
        if (!isCurrentlyAgreed && willBeAgreed) {
            // 확정날짜 모달 표시
            const confirmedDateModal = document.getElementById('confirmed-date-modal');
            // 현재 날짜를 기본값으로 설정
            document.getElementById('confirmed-date').value = new Date().toISOString().split('T')[0];
            confirmedDateModal.style.display = 'block';

            try {
                // 모달에서 날짜 선택 완료를 기다림
                confirmedDate = await new Promise((resolve, reject) => {
                    // 저장 버튼 클릭 시
                    document.getElementById('save-confirmed-date').onclick = function() {
                        const date = document.getElementById('confirmed-date').value;
                        confirmedDateModal.style.display = 'none';
                        if (date) {
                            resolve(date);
                        } else {
                            reject(new Error('날짜를 선택해주세요.'));
                        }
                    };

                    // 취소 버튼 클릭 시
                    document.getElementById('cancel-confirmed-date').onclick = function() {
                        confirmedDateModal.style.display = 'none';
                        reject(new Error('취소되었습니다.'));
                    };
                });
            } catch (error) {
                if (error.message === '취소되었습니다.') {
                    return; // 취소된 경우 함수 종료
                }
                throw error;
            }
        }

        const response = await fetch(`/api/consultations/${consultationId}/toggle-agreed`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ confirmedDate })
        });

        if (!response.ok) {
            throw new Error('동의여부 수정 실패');
        }

        const updatedConsultation = await response.json();
        
        // 해당 상담내역 업데이트
        consultations = consultations.map(c => 
            c._id === consultationId ? updatedConsultation : c
        );
        
        // 목록과 합계 업데이트
        updateConsultationList();
        updateConsultationTotal();
        updateConsultationStatus();
        
    } catch (error) {
        console.error('동의여부 수정 중 에러:', error);
        alert('동의여부 수정에 실패했습니다.');
    }
};

// 상담 수정 제출 처리
async function handleEditConsultationSubmit(e) {
    e.preventDefault();
    
    const id = e.target.dataset.consultationId;
    
    try {
        // 기존 상담 정보를 API에서 직접 가져옴
        const consultationResponse = await fetch(`/api/consultations/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!consultationResponse.ok) {
            throw new Error('상담 정보를 가져오는데 실패했습니다.');
        }

        const originalConsultation = await consultationResponse.json();
        const wasAgreed = originalConsultation.agreed;
        const willBeAgreed = document.getElementById('edit-consultation-agreed').checked;

        let confirmedDate = originalConsultation.confirmedDate;
        
        // 미동의에서 동의로 변경되는 경우에만 확정날짜 모달 표시
        if (!wasAgreed && willBeAgreed) {
            // 확정날짜 모달 표시
            const confirmedDateModal = document.getElementById('confirmed-date-modal');
            // 현재 날짜를 기본값으로 설정
            document.getElementById('confirmed-date').value = new Date().toISOString().split('T')[0];
            confirmedDateModal.style.display = 'block';

            try {
                // 모달에서 날짜 선택 완료를 기다림
                confirmedDate = await new Promise((resolve, reject) => {
                    // 저장 버튼 클릭 시
                    document.getElementById('save-confirmed-date').onclick = function() {
                        const date = document.getElementById('confirmed-date').value;
                        confirmedDateModal.style.display = 'none';
                        if (date) {
                            resolve(date);
                        } else {
                            reject(new Error('날짜를 선택해주세요.'));
                        }
                    };

                    // 취소 버튼 클릭 시
                    document.getElementById('cancel-confirmed-date').onclick = function() {
                        confirmedDateModal.style.display = 'none';
                        reject(new Error('취소되었습니다.'));
                    };
                });
            } catch (error) {
                if (error.message === '취소되었습니다.') {
                    return; // 취소된 경우 함수 종료
                }
                throw error;
            }
        } else if (!willBeAgreed) {
            // 미동의로 변경되는 경우 confirmedDate를 null로 설정
            confirmedDate = null;
        }

        const formData = {
            date: document.getElementById('edit-consultation-date').value,
            chartNumber: document.getElementById('edit-consultation-chartNumber').value,
            patientName: document.getElementById('edit-consultation-patientName').value,
            doctor: document.getElementById('edit-consultation-doctor').value,
            staff: document.getElementById('edit-consultation-staff').value,
            amount: Number(document.getElementById('edit-consultation-amount').value),
            agreed: willBeAgreed,
            confirmedDate: confirmedDate,
            notes: document.getElementById('edit-consultation-notes').value
        };

        const response = await fetch(`/api/consultations/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('상담 정보 수정에 실패했습니다.');
        }

        // 모달 닫기
        document.getElementById('edit-consultation-modal').style.display = 'none';
        
        // 리스트 새로고침
        const activeTab = document.querySelector('.stat-period.active').dataset.period;
        await showConsultationList(formData.agreed, activeTab);
        
        // 통계 업데이트를 위한 transactions 데이터 가져오기
        const transactionsResponse = await fetch('/api/transactions', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const transactions = await transactionsResponse.json();
        
        // 통계 업데이트
        const selectedDate = document.getElementById('statistics-date').value;
        await updateStatistics(transactions, selectedDate);

        alert('상담 정보가 수정되었습니다.');

    } catch (error) {
        console.error('상담 정보 수정 중 에러:', error);
        alert(error.message);
    }
}

// 상담입력 폼 제출 처리
document.getElementById('new-consultation')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const consultationDate = document.getElementById('consultation-date').value;
    const isAgreed = document.getElementById('consultation-agreed').checked;

    const consultationData = {
        date: consultationDate,
        chartNumber: document.getElementById('consultation-chartNumber').value,
        patientName: document.getElementById('consultation-patientName').value,
        doctor: document.getElementById('consultation-doctor').value,
        staff: document.getElementById('consultation-staff').value,
        amount: Number(document.getElementById('consultation-amount').value),
        agreed: isAgreed,
        confirmedDate: isAgreed ? consultationDate : null,  // 동의 체크시 상담날짜와 동일하게 설정
        notes: document.getElementById('consultation-notes').value
    };

    try {
        const response = await fetch('/api/consultations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(consultationData)
        });

        if (!response.ok) {
            throw new Error('상담 내역 저장에 실패했습니다.');
        }

        const savedConsultation = await response.json();
        
        // 상담 목록 업데이트
        consultations.push(savedConsultation);
        updateConsultationList();
        updateConsultationTotal();
        updateConsultationStatus();  // 상태 업데이트 추가

        // 모달 닫기
        document.getElementById('consultation-form').style.display = 'none';
        e.target.reset();
        
        alert('상담 내역이 저장되었습니다.');
    } catch (error) {
        console.error('상담 저장 중 에러:', error);
        alert(error.message);
    }
});

// CSS 스타일 추가
const style = document.createElement('style');
style.textContent = `
    .remaining-tooltip {
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        padding: 10px;
        z-index: 1000;
    }
    .tooltip-content {
        font-size: 14px;
        line-height: 1.5;
    }
    .tooltip-content div {
        margin: 5px 0;
    }
`;
document.head.appendChild(style);
