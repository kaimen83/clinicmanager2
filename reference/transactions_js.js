import { updateFormSelections, getDoctorVisibility } from './settings.js';
import { updateextraincomestatistics, displayextraincomes } from './extraincomes.js';
import { loadSettings } from './settings.js';
import { PatientHistoryModal } from './components/PatientHistoryModal.js';
import { PatientInfoModal } from './components/PatientInfoModal.js';
import { modalManager } from './modalManager.js';
import { CashReceiptModal } from './components/CashReceiptModal.js';

// 한국 시간 기준 날짜 가져오기
function getKoreanDate(dateString = null) {
    const date = dateString ? new Date(dateString) : new Date();
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    return new Date(utc + (9 * 60 * 60 * 1000));
}

// 한국 시간 기준 날짜 문자열 반환
function getKoreanDateString(date) {
    return date.toISOString().split('T')[0];
}

// PatientHistoryModal 인스턴스 생성
const patientHistoryModal = new PatientHistoryModal();
// PatientInfoModal 인스턴스 생성
const patientInfoModal = new PatientInfoModal();

// 거래 관련 함수들
async function loadTransactions(selectedDate = null) {
    try {
        const response = await fetch('/api/transactions', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const transactions = await response.json();

        await displayTransactions(transactions, selectedDate);
        await updateStatistics(transactions, selectedDate);
        await updateMonthlyStatistics(transactions, selectedDate);  // 여기서 월간 통계 업데이트
    } catch (error) {
        console.error('거래 내역 로딩 중 에러:', error);
    }
}

// 정렬 상태를 저장할 변수 추가
let sortConfig = {
    field: null,
    direction: 'asc'
};

// 정렬 함수 수정
function sortTransactions(transactions, field, direction) {
    return [...transactions].sort((a, b) => {
        let valueA = a[field];
        let valueB = b[field];

        // 등록시간 정렬 처리
        if (field === 'createdAt') {
            valueA = new Date(valueA).getTime();
            valueB = new Date(valueB).getTime();
        }
        // 수납금액은 숫자로 변환하여 비교
        else if (field === 'paymentAmount') {
            valueA = Number(valueA) || 0;
            valueB = Number(valueB) || 0;
        }

        // 문자열은 한글 정렬을 위해 localeCompare 사용
        if (typeof valueA === 'string' && typeof valueB === 'string') {
            return direction === 'asc' 
                ? valueA.localeCompare(valueB, 'ko-KR')
                : valueB.localeCompare(valueA, 'ko-KR');
        }

        // 숫자 비교
        return direction === 'asc' 
            ? valueA - valueB 
            : valueB - valueA;
    });
}

// displayTransactions 함수 수정
async function displayTransactions(transactions, selectedDate = null) {
    try {
        // 먼저 의사 목록을 가져옴
        const settingsResponse = await fetch('/api/settings', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const settings = await settingsResponse.json();
        const doctors = settings.doctor || [];

        // 선택된 날짜 또는 오늘 날짜 사용
        const targetDate = selectedDate ? new Date(selectedDate) : new Date();
        targetDate.setHours(0, 0, 0, 0);
        
        const filteredTransactions = transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            transactionDate.setHours(0, 0, 0, 0);
            return transactionDate.getTime() === targetDate.getTime();
        });

        // 거래 목록 컨테를 찾음
        const listsContainer = document.querySelector('.transaction-lists-container');
        listsContainer.innerHTML = ''; // 기존 내용 초기화

        // 각 의사별로 테이블 생성
        doctors.forEach(doctor => {
            let doctorTransactions = filteredTransactions.filter(t => t.doctor === doctor.value);
            
            // 정렬이 설정되어 있다면 적용
            if (sortConfig.field) {
                doctorTransactions = sortTransactions(doctorTransactions, sortConfig.field, sortConfig.direction);
            }

            // 의사별 섹션 생성
            const doctorSection = document.createElement('div');
            doctorSection.className = 'doctor-transactions';
            doctorSection.dataset.doctor = doctor.value;
            doctorSection.style.display = getDoctorVisibility(doctor.value) ? 'block' : 'none';
            doctorSection.innerHTML = `
                <h4>
                    <span class="doctor-name" style="cursor: pointer;">${doctor.value} 원장</span>
                    <div class="doctor-stats">
                        <span class="patient-count" id="${doctor.value}-patient-count">0명</span>
                        <span class="total-amount" id="${doctor.value}-total-amount">0원</span>
                    </div>
                </h4>
                <div class="transaction-table-container">
                    <table class="transaction-table">
                        <thead>
                            <tr>
                                <th style="width: 20px">No.</th>
                                <th>차트번호</th>
                                <th>환자성명</th>
                                <th>진료내용</th>
                                <th>수납금액</th>
                                <th>수납방법</th>
                                <th style="width: 120px"></th>
                            </tr>
                        </thead>
                        <tbody id="${doctor.value}-transaction-list">
                        </tbody>
                    </table>
                </div>
            `;
            listsContainer.appendChild(doctorSection);

            // 의사 이름 클릭 이벤트 추가
            const doctorNameElement = doctorSection.querySelector('.doctor-name');
            if (doctorNameElement) {
                doctorNameElement.addEventListener('click', () => {
                    if (window.doctorModal) {
                        window.doctorModal.show(doctor.value);
                    }
                });
            }

            // 의사 거래 내역 표시
            const doctorList = document.getElementById(`${doctor.value}-transaction-list`);
            doctorList.innerHTML = doctorTransactions.map((transaction, index) => `
                <tr class="transaction-row ${transaction.isNew ? 'new-patient' : ''}">
                    <td class="text-center">${index + 1}</td>
                    <td>
                        <span class="chart-number-link" 
                              data-chart-number="${transaction.chartNumber}" 
                              data-patient-name="${transaction.patientName}">
                            ${transaction.chartNumber}
                        </span>
                    </td>
                    <td>
                        <span class="patient-name-link" 
                              data-chart-number="${transaction.chartNumber}" 
                              data-patient-name="${transaction.patientName}">
                              ${transaction.patientName}
                        </span>
                        ${transaction.isNew ? '<span class="badge new">신환</span>' : ''}
                    </td>
                    <td>${transaction.treatmentType}</td>
                    <td class="amount">${transaction.paymentAmount ? Number(transaction.paymentAmount).toLocaleString() + '원' : ''}</td>
                    <td>${
                        transaction.paymentMethod === '카드' 
                            ? `카드 (${transaction.cardCompany})` 
                            : (transaction.paymentMethod === '현금' || transaction.paymentMethod === '계좌이체')
                                ? `${transaction.paymentMethod}(${transaction.cashReceipt ? '발행' : '미발행'})`
                                : transaction.paymentMethod
                    }</td>
                    <td class="actions">
                        ${hasEditDeletePermission(transaction.date) ? `
                            <button onclick="editTransaction('${transaction._id}')" class="edit-btn">수정</button>
                            <button onclick="deleteTransaction('${transaction._id}')" class="transaction-delete-btn">삭제</button>
                        ` : ''}
                    </td>
                </tr>
            `).join('');

            // 의사별 통계 업데이트
            const stats = {
                patientCount: new Set(doctorTransactions.map(t => t.chartNumber)).size,
                totalAmount: doctorTransactions.reduce((sum, t) => sum + (Number(t.paymentAmount) || 0), 0)
            };
            document.getElementById(`${doctor.value}-patient-count`).textContent = `${stats.patientCount}명`;
            document.getElementById(`${doctor.value}-total-amount`).textContent = `${stats.totalAmount.toLocaleString()}원`;

            // 환자 목록 생성 부분 제거 (불필요한 코드)
            
            // 차트번호와 환자 이름 클릭 이벤트 설정
            doctorList.querySelectorAll('.patient-name-link, .chart-number-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const chartNumber = e.target.dataset.chartNumber;
                    const patientName = e.target.dataset.patientName;
                    
                    // 기존 컨텍스트 메뉴 제거
                    const existingMenu = document.querySelector('.context-menu');
                    if (existingMenu) {
                        existingMenu.remove();
                    }

                    // 컨텍스트 메뉴 생성
                    const menu = document.createElement('div');
                    menu.className = 'context-menu';
                    menu.innerHTML = `
                        <div class="menu-item patient-info">환자정보</div>
                        <div class="menu-item view-logs">로그보기</div>
                    `;

                    // 메뉴 위치 설정
                    menu.style.position = 'absolute';
                    menu.style.left = `${e.pageX}px`;
                    menu.style.top = `${e.pageY}px`;
                    document.body.appendChild(menu);

                    // ESC 키 이벤트 리스너 추가
                    function handleEscKey(e) {
                        if (e.key === 'Escape') {
                            menu.remove();
                            document.removeEventListener('keydown', handleEscKey);
                        }
                    }
                    document.addEventListener('keydown', handleEscKey);

                    // 메뉴 아이템 클릭 이벤트
                    menu.querySelector('.patient-info').addEventListener('click', () => {
                        menu.remove();
                        document.removeEventListener('keydown', handleEscKey);
                        patientInfoModal.show(chartNumber, patientName);
                    });

                    menu.querySelector('.view-logs').addEventListener('click', () => {
                        menu.remove();
                        document.removeEventListener('keydown', handleEscKey);
                        patientHistoryModal.show(chartNumber, patientName);
                    });

                    // 다른 곳 클릭 시 메뉴 닫기
                    document.addEventListener('click', function closeMenu(e) {
                        if (!menu.contains(e.target) && e.target !== link) {
                            menu.remove();
                            document.removeEventListener('keydown', handleEscKey);
                            document.removeEventListener('click', closeMenu);
                        }
                    });
                });
            });
        });

        // 전체 통계 업데이트
        updateStatistics(filteredTransactions);
        updateMonthlyStatistics(transactions, selectedDate || new Date());
        await updateextraincomestatistics(); // 진료외수입 통계 업데이트 추가

        // 정렬 이벤트 리스너 다시 설정
        setupSortingListeners();

    } catch (error) {
        console.error('거래 내역 표시 중 에러:', error);
        alert('거래 내역을 표시하는데 실패했습니다.');
    }
}

async function handleTransactionSubmit(e) {
    e.preventDefault();
    
    const formData = {
        date: document.getElementById('date').value,
        chartNumber: document.getElementById('chartNumber').value.trim(),
        patientName: document.getElementById('patientName').value.trim(),
        visitPath: document.getElementById('visitPath').value,
        doctor: document.getElementById('doctor').value,
        treatmentType: document.getElementById('treatmentType').value,
        isNew: document.getElementById('isNew').checked,
        isConsultation: document.getElementById('isConsultation').checked,
        paymentMethod: document.getElementById('paymentMethod').value,
        cardCompany: document.getElementById('paymentMethod').value === '카드' ? document.getElementById('cardCompany').value : undefined,
        cashReceipt: (document.getElementById('paymentMethod').value === '현금' || document.getElementById('paymentMethod').value === '계좌이체') ? document.getElementById('cashReceipt').checked : undefined,
        paymentAmount: document.getElementById('paymentAmount').value,
        notes: document.getElementById('notes')?.value?.trim() || ''
    };

    try {
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            // 현금 결제인 경우 현금시재 목록 갱신
            if (formData.paymentMethod === '현금') {
                if (typeof window.displayCashRecords === 'function') {
                    await window.displayCashRecords();
                }
            }

            await loadTransactions(document.getElementById('statistics-date').value);
            alert('내원 정보가 성공적으로 등록되었습니다.');

            // 상담수납인 경우 추가 저장 여부 확인
            if (formData.isConsultation) {
                const confirmAdditional = confirm('일반 수납도 저장하시겠습니까?');
                if (confirmAdditional) {
                    // 기존 데이터 유지하고 일부 필드만 초기화
                    const isConsultationCheckbox = document.getElementById('isConsultation');
                    const paymentMethodSelect = document.getElementById('paymentMethod');
                    const cardCompanyGroup = document.getElementById('cardCompanyGroup');
                    const cardCompanySelect = document.getElementById('cardCompany');
                    const paymentAmountInput = document.getElementById('paymentAmount');
                    const notesInput = document.getElementById('notes');

                    if (isConsultationCheckbox) isConsultationCheckbox.checked = false;
                    if (paymentMethodSelect) paymentMethodSelect.value = '';
                    if (cardCompanyGroup) cardCompanyGroup.style.display = 'none';
                    if (cardCompanySelect) cardCompanySelect.value = '';
                    if (paymentAmountInput) paymentAmountInput.value = '';
                    if (notesInput) notesInput.value = '';
                    
                    return; // 모달을 닫지 않고 유지
                }
            }

            // 추가 저장을 하지 않는 경우 모달 닫기
            document.getElementById('transaction-form').style.display = 'none';
            e.target.reset();
        } else {
            const data = await response.json();
            alert(data.message || '저장에 실패했습니다.');
        }
    } catch (error) {
        console.error('저장 중 에러:', error);
        alert('저장 중 오류가 발생했습니다.');
    }
}

async function editTransaction(id) {
    try {
        // 먼저 거래 정보를 가져옴
        const transactionResponse = await fetch(`/api/transactions/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!transactionResponse.ok) {
            throw new Error('거래 정보를 가져오는데 실패했습니다.');
        }

        const transactionData = await transactionResponse.json();
        
        // 권한 체크
        if (!hasEditDeletePermission(transactionData.date)) {
            alert('지난 날짜의 내원정보는 수정할 수 없습니다.');
            return;
        }

        // 관리자 권한 확인
        const user = JSON.parse(localStorage.getItem('user'));
        const isAdmin = user && user.role === '관리자';

        // 설정 데이터 로드
        const settings = await loadSettings();
        
        // select 옵션들을 업데이트
        await updateFormSelections(settings, 'edit-');

        // 해당 거래 정보 가져오기
        const response = await fetch(`/api/transactions/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('거래 정보를 가져오는데 실패했습니다.');
        }

        const transaction = await response.json();

        // 수정 폼에 데이터 채우기
        const dateField = document.getElementById('edit-date');
        dateField.value = new Date(transaction.date).toISOString().split('T')[0];
        // 관리자가 아닌 경우 날짜 필드 비활성화
        dateField.readOnly = !isAdmin;
        dateField.style.backgroundColor = !isAdmin ? '#f0f0f0' : 'white';

        document.getElementById('edit-chartNumber').value = transaction.chartNumber;
        document.getElementById('edit-patientName').value = transaction.patientName;
        document.getElementById('edit-visitPath').value = transaction.visitPath;
        document.getElementById('edit-doctor').value = transaction.doctor;
        document.getElementById('edit-treatmentType').value = transaction.treatmentType;
        document.getElementById('edit-isNew').checked = transaction.isNew;
        document.getElementById('edit-isConsultation').checked = transaction.isConsultation;
        document.getElementById('edit-paymentMethod').value = transaction.paymentMethod;
        document.getElementById('edit-paymentAmount').value = transaction.paymentAmount;
        document.getElementById('edit-notes').value = transaction.notes || '';

        // 카드사 그룹과 현금영수증 그룹 요소 가져오기
        const cardCompanyGroup = document.getElementById('edit-cardCompanyGroup');
        const cardCompanySelect = document.getElementById('edit-cardCompany');
        const cashReceiptGroup = document.getElementById('edit-cashReceiptGroup');
        const cashReceiptCheckbox = document.getElementById('edit-cashReceipt');
        
        // 모든 관련 필드 초기화
        if (cardCompanyGroup) cardCompanyGroup.style.display = 'none';
        if (cardCompanySelect) {
            cardCompanySelect.required = false;
            cardCompanySelect.value = '';
        }
        if (cashReceiptGroup) cashReceiptGroup.style.display = 'none';
        if (cashReceiptCheckbox) cashReceiptCheckbox.checked = false;
        
        // 수납방법에 따른 필드 표시/숨김 처리
        if (transaction.paymentMethod === '카드') {
            if (cardCompanyGroup) cardCompanyGroup.style.display = 'block';
            if (cardCompanySelect) {
                cardCompanySelect.required = true;
                cardCompanySelect.value = transaction.cardCompany;
            }
            if (cashReceiptGroup) cashReceiptGroup.style.display = 'none';
        } else if (transaction.paymentMethod === '현금' || transaction.paymentMethod === '계좌이체') {
            if (cardCompanyGroup) cardCompanyGroup.style.display = 'none';
            if (cashReceiptGroup) cashReceiptGroup.style.display = 'block';
            if (cashReceiptCheckbox) cashReceiptCheckbox.checked = transaction.cashReceipt || false;
        }

        // 폼에 거래 ID 설정
        const form = document.getElementById('edit-transaction');
        form.dataset.transactionId = id;

        // 수정 폼 표시
        document.getElementById('edit-transaction-form').style.display = 'block';

    } catch (error) {
        console.error('거래 정보 로딩 중 에러:', error);
        alert('거래 정보를 불러오는데 실패했습니다.');
    }
}

async function deleteTransaction(id) {
    try {
        // 먼저 거래 정보를 가져옴
        const transactionResponse = await fetch(`/api/transactions/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!transactionResponse.ok) {
            throw new Error('거래 정보를 가져오는데 실패했습니다.');
        }

        const transactionData = await transactionResponse.json();
        
        // 권한 체크
        if (!hasEditDeletePermission(transactionData.date)) {
            alert('지난 날짜의 내원정보는 삭제할 수 없습니다.');
            return;
        }

        if (!confirm('정말 삭제하시겠습니까?')) {
            return;
        }

        const deleteResponse = await fetch(`/api/transactions/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (deleteResponse.ok) {
            const data = await deleteResponse.json();

            // 현금 결제였던 경우 현금시재 목록 갱신
            if (data.deletedTransaction && data.deletedTransaction.paymentMethod === '현금') {
                if (typeof window.displayCashRecords === 'function') {
                    await window.displayCashRecords();
                }
            }

            await loadTransactions(document.getElementById('statistics-date').value);
            alert('삭제되었습니다.');
        } else {
            const errorData = await deleteResponse.json();
            throw new Error(errorData.message || '삭제에 실패했습니다.');
        }
    } catch (error) {
        alert(error.message || '삭제 중 오류가 발생했습니다.');
    }
}

// 통계 업데이트 함수 수정
async function updateStatistics(transactions, selectedDate) {
    try {
        // 날짜 범위 설정
        const targetDate = new Date(selectedDate);
        targetDate.setHours(0, 0, 0, 0);
        const endDate = new Date(targetDate);
        endDate.setHours(23, 59, 59, 999);

        // 일간 거래 필터링
        const dailyTransactions = transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            transactionDate.setHours(0, 0, 0, 0);
            return transactionDate.getTime() === targetDate.getTime();
        });

        // 일간 통계 계산 - 중복 제거된 환자 수 계산
        const uniqueDailyPatients = new Set(dailyTransactions.map(t => t.chartNumber)).size;
        const uniqueDailyNewPatients = new Set(dailyTransactions.filter(t => t.isNew).map(t => t.chartNumber)).size;
        const totalAmount = dailyTransactions.reduce((sum, t) => sum + (Number(t.paymentAmount) || 0), 0);
        const cardAmount = dailyTransactions
            .filter(t => t.paymentMethod.includes('카드'))
            .reduce((sum, t) => sum + (Number(t.paymentAmount) || 0), 0);
        const cashTransferAmount = dailyTransactions
            .filter(t => t.paymentMethod === '현금' || t.paymentMethod === '계좌이체')
            .reduce((sum, t) => sum + (Number(t.paymentAmount) || 0), 0);

        // 상담 내역 데이터 가져오기
        const consultationsResponse = await fetch('/api/consultations', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const consultations = await consultationsResponse.json();

        // 동의된 상담 내역 필터링 (동의날짜 기준)
        const agreedConsultations = consultations.filter(consultation => {
            if (!consultation.agreed || !consultation.confirmedDate) return false;
            const confirmDate = new Date(consultation.confirmedDate);
            confirmDate.setHours(0, 0, 0, 0);
            return confirmDate.getTime() === targetDate.getTime();
        });

        // 미동의 상담 내역 필터링 (상담날짜 기준 - 기존과 동일)
        const notAgreedConsultations = consultations.filter(consultation => {
            if (consultation.agreed) return false;
            const consultDate = new Date(consultation.date);
            consultDate.setHours(0, 0, 0, 0);
            return consultDate.getTime() === targetDate.getTime();
        });
        
        const agreedAmount = agreedConsultations.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
        const notAgreedAmount = notAgreedConsultations.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

        // 진료외수입 데이터 가져오기
        const response = await fetch('/api/extra-incomes', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const extraincomes = await response.json();

        // 선택된 날짜의 진료외수입만 필터링
        const dailyextraincomes = extraincomes.filter(income => {
            const incomeDate = new Date(income.date);
            incomeDate.setHours(0, 0, 0, 0);
            return incomeDate.getTime() === targetDate.getTime();
        });

        // 일간 진료외수입 액 계산
        const extraIncomeAmount = dailyextraincomes.reduce((sum, income) => sum + (Number(income.amount) || 0), 0);
        
        // 총수입 계산 (전체 수납금액 + 진료외수입)
        const totalIncome = totalAmount + extraIncomeAmount;

        // 일간 통계 표시 업데이트
        document.getElementById('total-patients').textContent = `${uniqueDailyPatients}명`;
        document.getElementById('new-patients').textContent = `${uniqueDailyNewPatients}명`;
        document.getElementById('total-income').textContent = `${totalIncome.toLocaleString()}원`;
        document.getElementById('total-amount').textContent = `${totalAmount.toLocaleString()}원`;
        document.getElementById('card-amount').textContent = `${cardAmount.toLocaleString()}원`;
        document.getElementById('cash-transfer-amount').textContent = `${cashTransferAmount.toLocaleString()}원`;
        document.getElementById('daily-extra-income').textContent = `${extraIncomeAmount.toLocaleString()}원`;

        // 상담 통계 표시 업데이트
        document.getElementById('agreed-consultation').textContent = 
            `${agreedConsultations.length}건 / ${agreedAmount.toLocaleString()}원`;
        document.getElementById('not-agreed-consultation').textContent = 
            `${notAgreedConsultations.length}건 / ${notAgreedAmount.toLocaleString()}원`;

        // 월간 통계도 함께 업데이트
        await updateMonthlyStatistics(transactions, selectedDate);

    } catch (error) {
        console.error('[통계] 오류 발생:', error);
    }
}

// 월간 통계 업데이트 함수 수정
async function updateMonthlyStatistics(transactions, selectedDate) {
    try {
        // 날짜 값 유효성 검사 및 기본값 설정
        let targetDate;
        try {
            targetDate = selectedDate ? new Date(selectedDate) : new Date();
            if (isNaN(targetDate.getTime())) {
                console.warn('유효하지 않은 날짜:', selectedDate);
                targetDate = new Date();
            }
        } catch (dateError) {
            console.warn('날짜 변환 중 오류:', dateError);
            targetDate = new Date();
        }

        // 월 시작일과 종료일 계산 (시간을 정확하게 설정)
        const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1, 0, 0, 0, 0);
        const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);

        // ISO 문자열로 변환 전 유효성 검사
        if (isNaN(monthStart.getTime()) || isNaN(monthEnd.getTime())) {
            throw new Error('유효하지 않은 월 범위');
        }

        // 월간 진료외수입 계산
        const extraincomesResponse = await fetch('/api/extra-incomes', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const allextraincomes = await extraincomesResponse.json();

        // 해당 월의 진료외수입만 필터링
        const monthlyextraincomes = allextraincomes.filter(income => {
            const incomeDate = new Date(income.date);
            return incomeDate >= monthStart && incomeDate <= monthEnd;
        });

        // 상담 내역 데이터 가져오기
        const consultationsResponse = await fetch('/api/consultations', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const consultations = await consultationsResponse.json();

        // 월간 동의된 상담 내역 필터링 (동의날짜 기준)
        const monthlyAgreedConsultations = consultations.filter(consultation => {
            if (!consultation.agreed || !consultation.confirmedDate) return false;
            const confirmDate = new Date(consultation.confirmedDate);
            return confirmDate >= monthStart && confirmDate <= monthEnd;
        });

        // 월간 미동의 상담 내역 필터링 (상담날짜 기준 - 기존과 동일)
        const monthlyNotAgreedConsultations = consultations.filter(consultation => {
            if (consultation.agreed) return false;
            const consultDate = new Date(consultation.date);
            return consultDate >= monthStart && consultDate <= monthEnd;
        });
        
        const monthlyAgreedAmount = monthlyAgreedConsultations.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
        const monthlyNotAgreedAmount = monthlyNotAgreedConsultations.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

        // 월간 거래 필터링
        const monthlyTransactions = transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transactionDate >= monthStart && transactionDate <= monthEnd;
        });

        // 일자별로 환자 중복을 제거하여 월간 총 내원인원 계산
        const dailyPatients = new Map(); // 날짜별 환자 목록을 저장할 Map
        monthlyTransactions.forEach(transaction => {
            const dateStr = new Date(transaction.date).toISOString().split('T')[0];
            if (!dailyPatients.has(dateStr)) {
                dailyPatients.set(dateStr, new Set());
            }
            dailyPatients.get(dateStr).add(transaction.chartNumber);
        });

        // 일별 중복 제거된 환자 수의 합계 계산
        const monthlyTotalPatients = Array.from(dailyPatients.values())
            .reduce((sum, patients) => sum + patients.size, 0);

        const uniqueMonthlyNewPatients = new Set(monthlyTransactions.filter(t => t.isNew).map(t => t.chartNumber)).size;
        const monthlyTotalAmount = monthlyTransactions.reduce((sum, t) => sum + (Number(t.paymentAmount) || 0), 0);
        const monthlyCardAmount = monthlyTransactions
            .filter(t => t.paymentMethod.includes('카드'))
            .reduce((sum, t) => sum + (Number(t.paymentAmount) || 0), 0);
        const monthlyCashTransferAmount = monthlyTransactions
            .filter(t => t.paymentMethod === '현금' || t.paymentMethod === '계좌이체')
            .reduce((sum, t) => sum + (Number(t.paymentAmount) || 0), 0);

        const monthlyExtraIncomeAmount = monthlyextraincomes.reduce((sum, income) => sum + (Number(income.amount) || 0), 0);
        const monthlyTotalIncome = monthlyTotalAmount + monthlyExtraIncomeAmount;


        // 월간 통계 표시 업데이트
        document.getElementById('monthly-total-patients').textContent = `${monthlyTotalPatients}명`;
        document.getElementById('monthly-new-patients').textContent = `${uniqueMonthlyNewPatients}명`;
        document.getElementById('monthly-total-income').textContent = `${monthlyTotalIncome.toLocaleString()}원`;
        document.getElementById('monthly-total-amount').textContent = `${monthlyTotalAmount.toLocaleString()}원`;
        document.getElementById('monthly-card-amount').textContent = `${monthlyCardAmount.toLocaleString()}원`;
        document.getElementById('monthly-cash-transfer-amount').textContent = `${monthlyCashTransferAmount.toLocaleString()}원`;
        document.getElementById('monthly-extra-income').textContent = `${monthlyExtraIncomeAmount.toLocaleString()}원`;

        // 월간 상담 통계 표시 업데이트
        document.getElementById('monthly-agreed-consultation').textContent = 
            `${monthlyAgreedConsultations.length}건 / ${monthlyAgreedAmount.toLocaleString()}원`;
        document.getElementById('monthly-not-agreed-consultation').textContent = 
            `${monthlyNotAgreedConsultations.length}건 / ${monthlyNotAgreedAmount.toLocaleString()}원`;

    } catch (error) {
        console.error('[월간 통계] 오류 발생:', error);
    }
}

// 정렬 이벤트 핸들러 추가
function setupSortingListeners() {
    const tables = document.querySelectorAll('.doctor-transactions .transaction-table');
    
    tables.forEach(table => {
        const headers = table.querySelectorAll('th');
        headers.forEach((header, index) => {
            // 관리 열만 제외 (No. 칼럼도 정렬 가능하도록 수정)
            if (!header.classList.contains('actions')) {
                header.style.cursor = 'pointer';
                header.addEventListener('click', () => {
                    const field = getFieldFromIndex(index);
                    if (field) {
                        // 같은 필드를 다시 클릭하면 정렬 방향 전환
                        if (sortConfig.field === field) {
                            sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
                        } else {
                            sortConfig.field = field;
                            sortConfig.direction = 'asc';
                        }

                        // 정렬 표시 업데이트
                        updateSortIndicators(headers, header);
                        
                        // 데이터 다시 로드
                        loadTransactions(document.getElementById('statistics-date').value);
                    }
                });
            }
        });
    });
}

// 필드 인덱스를 실제 필드명으로 변환
function getFieldFromIndex(index) {
    const fields = {
        0: 'createdAt',     // No. (등록시간)
        1: 'chartNumber',    // 차트번호
        2: 'patientName',    // 환자성명
        3: 'treatmentType',  // 진료내용
        4: 'paymentAmount',  // 수납금액
        5: 'paymentMethod'   // 수납방법
    };
    return fields[index];
}

// 정렬 표시 업데이트
function updateSortIndicators(headers, currentHeader) {
    // 모든 헤더의 정렬 표시 제거
    headers.forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
    });
    
    // 현재 헤더에 정렬 방향 표시
    if (currentHeader) {
        currentHeader.classList.add(`sort-${sortConfig.direction}`);
    }
}

// DOMContentLoaded 이벤트에서 정렬 리스너 설정
document.addEventListener('DOMContentLoaded', () => {
    // 정렬 리스너 설정
    setupSortingListeners();
    
    // 결제 방법 변경 이벤트 리스너
    const paymentMethodSelect = document.getElementById('paymentMethod');
    if (paymentMethodSelect) {
        paymentMethodSelect.addEventListener('change', (e) => {
            toggleCardCompany(e.target.value);
        });
    }

    // 취소 버튼 이벤트 리스너
    const cancelTransactionBtn = document.getElementById('cancel-transaction');
    if (cancelTransactionBtn) {
        cancelTransactionBtn.addEventListener('click', closeTransactionModal);
    }

    // ESC 키 이벤트 리스너도 동일하게 수정
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const transactionModal = document.getElementById('transaction-form');
            if (transactionModal && transactionModal.style.display === 'block') {
                transactionModal.style.display = 'none';
                document.getElementById('new-transaction').reset();
                
                // 상담 내역 초기화
                consultations = [];
                updateConsultationList();
                updateConsultationTotal();
                
                // 수납 내역 초기화
                const paymentList = document.getElementById('payment-list');
                if (paymentList) {
                    paymentList.innerHTML = '';
                }
                const totalPaymentAmount = document.getElementById('total-payment-amount');
                if (totalPaymentAmount) {
                    totalPaymentAmount.textContent = '0원';
                }

                // 상담 상태 표시 초기화
                const consultationStatus = document.querySelector('.consultation-status');
                if (consultationStatus) {
                    consultationStatus.remove();
                }

                modalManager.removeModal(transactionModal);
            }
        }
    });

    // 상담입력 모달에 직접 이벤트 리스너 추가
    document.getElementById('consultation-form')?.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            e.preventDefault();
            e.stopImmediatePropagation();
            
            document.getElementById('consultation-form').style.display = 'none';
            document.getElementById('new-consultation').reset();
            
            return false;
        }
    }, true); // 캡처링 단계에서 이벤트 처리

    // 상담입력 모달에 클릭 이벤트 리스너도 추가
    document.getElementById('consultation-form')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('consultation-form')) {
            e.stopPropagation();
            
            document.getElementById('consultation-form').style.display = 'none';
            document.getElementById('new-consultation').reset();
        }
    });

    // 상담입력 버튼 이벤트 리스너
    const addConsultationBtn = document.getElementById('add-consultation-btn');
    if (addConsultationBtn) {
        addConsultationBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            
            try {
                // 설정 데이터 로드
                const settings = await loadSettings();
                
                // 담당의사 목록 설정
                const doctorSelect = document.getElementById('consultation-doctor');
                if (settings.doctor) {
                    doctorSelect.innerHTML = '<option value="">선택하세요</option>' +
                        settings.doctor.map(doctor => 
                            `<option value="${doctor.value}">${doctor.value}</option>`
                        ).join('');
                }
                
                // 상담직원 목록 설정
                const staffSelect = document.getElementById('consultation-staff');
                if (settings.staff) {
                    staffSelect.innerHTML = '<option value="">선택하세요</option>' +
                        settings.staff.map(staff => 
                            `<option value="${staff.value}">${staff.value}</option>`
                        ).join('');
                }

                // 현재 내원정보 폼의 값들을 가져옴
                const date = document.getElementById('date').value;
                const chartNumber = document.getElementById('chartNumber').value;
                const patientName = document.getElementById('patientName').value;
                const doctor = document.getElementById('doctor').value;

                // 상담입력 폼에 값 설정
                document.getElementById('consultation-date').value = date;
                document.getElementById('consultation-chartNumber').value = chartNumber;
                document.getElementById('consultation-patientName').value = patientName;
                document.getElementById('consultation-doctor').value = doctor;

                // 상담입력 모달 표시
                const consultationModal = document.getElementById('consultation-form');
                consultationModal.style.display = 'block';
                modalManager.pushModal(consultationModal);
                
            } catch (error) {
                console.error('상담입력 모달 열기 실패:', error);
                alert('상담입력 모달을 열지 못했습니다.');
            }
        });
    }

    // 수정 모달 취소 버튼 이벤트 리스너
    const cancelEditBtn = document.getElementById('cancel-edit-transaction');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            document.getElementById('edit-transaction-form').style.display = 'none';
            document.getElementById('edit-transaction').reset();
        });
    }

    // 수정 폼 제출 이벤트 리스너
    const editForm = document.getElementById('edit-transaction');
    if (editForm) {
        editForm.addEventListener('submit', handleEditTransactionSubmit);
    }

    // 내원정보등록 모달 초기화
    const transactionModal = document.getElementById('transaction-form');
    if (transactionModal) {
        // 모달이 표시될 때 modalManager에 등록
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    if (transactionModal.style.display === 'block') {
                        modalManager.pushModal(transactionModal);
                    }
                }
            });
        });
        observer.observe(transactionModal, { attributes: true });

        // 모달 외부 클릭시 닫기
        transactionModal.addEventListener('click', (e) => {
            if (e.target === transactionModal) {
                closeTransactionModal();
            }
        });
    }

    // 상담입력 모달 초기화
    const consultationModal = document.getElementById('consultation-form');
    if (consultationModal) {
        // 모달이 표시될 때 modalManager에 등록
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    if (consultationModal.style.display === 'block') {
                        modalManager.pushModal(consultationModal);
                    }
                }
            });
        });
        observer.observe(consultationModal, { attributes: true });

        // 모달 외부 클릭시 닫기
        consultationModal.addEventListener('click', (e) => {
            if (e.target === consultationModal) {
                closeConsultationModal();
            }
        });
    }

    // 기존의 ESC 키 이벤트 리스너 제거 (modalManager가 대신 처리)
    // ... existing code ...

    // 현금/계좌이체 카드 클릭 이벤트
    const cashReceiptModal = new CashReceiptModal();
    const cashTransferCard = document.querySelector('.stat-card.payment-detail:not(.card-stat)');
    if (cashTransferCard) {
        cashTransferCard.style.cursor = 'pointer';
        cashTransferCard.addEventListener('click', () => {
            const activeTab = document.querySelector('.stat-period.active').dataset.period;
            cashReceiptModal.show(activeTab);
        });
    }
});

// CSS 스타일을 위한 클래스 추가도 DOMContentLoaded 안로 이동
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        .sort-asc::after {
            content: ' ▲';
            font-size: 0.8em;
        }
        .sort-desc::after {
            content: ' ▼';
            font-size: 0.8em;
        }
        .transaction-table th:not(.actions) {
            cursor: pointer;
        }
        .transaction-table th:not(.actions):hover {
            background-color: #e9ecef;
        }
    `;
    document.head.appendChild(style);
});

// 수납방법 변경 시 카드사 필드 표시/숨김 처리 함수
async function toggleCardCompany(paymentMethod, prefix = '') {
    const cardCompanyGroup = document.getElementById(`${prefix}cardCompanyGroup`);
    const cardCompanySelect = document.getElementById(`${prefix}cardCompany`);
    const cashReceiptGroup = document.getElementById(`${prefix}cashReceiptGroup`);
    const cashReceiptCheckbox = document.getElementById(`${prefix}cashReceipt`);
    
    // 모든 필드 초기화
    if (cardCompanyGroup) cardCompanyGroup.style.display = 'none';
    if (cardCompanySelect) {
        cardCompanySelect.required = false;
        cardCompanySelect.value = '';
    }
    if (cashReceiptGroup) cashReceiptGroup.style.display = 'none';
    if (cashReceiptCheckbox) cashReceiptCheckbox.checked = false;
    
    // 수납방법에 따른 필드 표시/숨김 처리
    if (paymentMethod === '카드') {
        if (cardCompanyGroup) cardCompanyGroup.style.display = 'block';
        if (cardCompanySelect) {
            cardCompanySelect.required = true;
        }
    } else if (paymentMethod === '현금' || paymentMethod === '계좌이체') {
        if (cardCompanyGroup) cardCompanyGroup.style.display = 'none';
        if (cashReceiptGroup) cashReceiptGroup.style.display = 'block';
        if (cashReceiptCheckbox) cashReceiptCheckbox.checked = true;
    }
}

// DOMContentLoaded 이벤트에 수정 모달의 수납방법 변경 이벤트 리스너 추가
document.addEventListener('DOMContentLoaded', () => {
    // ... 기존 코드 ...

    // 수정 모달의 수납방법 변경 이벤트 리스너
    const editPaymentMethodSelect = document.getElementById('edit-paymentMethod');
    if (editPaymentMethodSelect) {
        editPaymentMethodSelect.addEventListener('change', (e) => {
            toggleCardCompany(e.target.value, 'edit-');
        });
    }

    // ... 기존 코드 ...
});

// handleEditTransactionSubmit 함수 수정
async function handleEditTransactionSubmit(e) {
    e.preventDefault();
    
    const transactionId = e.target.dataset.transactionId;
    const selectedDate = document.getElementById('statistics-date').value;

    // 기존 거래 정보 조회
    const oldTransaction = await fetch(`/api/transactions/${transactionId}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    }).then(res => res.json());

    const formData = {
        date: document.getElementById('edit-date').value,
        chartNumber: document.getElementById('edit-chartNumber').value,
        patientName: document.getElementById('edit-patientName').value,
        visitPath: document.getElementById('edit-visitPath').value,
        doctor: document.getElementById('edit-doctor').value,
        treatmentType: document.getElementById('edit-treatmentType').value,
        isNew: document.getElementById('edit-isNew').checked,
        isConsultation: document.getElementById('edit-isConsultation').checked,
        paymentMethod: document.getElementById('edit-paymentMethod').value,
        cardCompany: document.getElementById('edit-paymentMethod').value === '카드' ? 
            document.getElementById('edit-cardCompany').value : undefined,
        cashReceipt: (document.getElementById('edit-paymentMethod').value === '현금' || 
            document.getElementById('edit-paymentMethod').value === '계좌이체') ? 
            document.getElementById('edit-cashReceipt').checked : undefined,
        paymentAmount: document.getElementById('edit-paymentAmount').value,
        notes: document.getElementById('edit-notes').value
    };

    try {
        const response = await fetch(`/api/transactions/${transactionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            const updatedTransaction = await response.json();
            
            // 현금시재 목록 갱신
            const wasPaymentMethodCash = oldTransaction.paymentMethod === '현금';
            const isPaymentMethodCash = formData.paymentMethod === '현금';
            
            if (wasPaymentMethodCash || isPaymentMethodCash) {
                if (typeof window.displayCashRecords === 'function') {
                    await window.displayCashRecords();
                }
            }
            
            // 거래 정보 업데이트 이벤트 발생
            window.dispatchEvent(new CustomEvent('transactionUpdated', {
                detail: updatedTransaction
            }));

            document.getElementById('edit-transaction-form').style.display = 'none';
            e.target.reset();
            await loadTransactions(selectedDate);
            alert('내원 정보가 수정되었습니다.');
        } else {
            const errorData = await response.json();
            alert(errorData.message || '수정에 실패했습니다.');
        }
    } catch (error) {
        console.error('수정 중 에러:', error);
        alert('수정 중 오류가 발생했습니다.');
    }
}

// 상담 관련 변수
let consultations = [];
let payments = [];

// 상담입력 모달 클릭 이벤트
document.getElementById('consultation-form')?.addEventListener('click', (e) => {
    e.stopPropagation(); // 이벤트 전파 중단
});

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

// 상담 동의금액 합계 업데이트 함수 수정
function updateConsultationTotal() {
    // 동의된 상담내역만 필터링하여 합계 계산
    const agreedTotal = consultations
        .filter(consultation => consultation.agreed)
        .reduce((sum, consultation) => sum + consultation.amount, 0);
    
    document.getElementById('total-consultation-amount').textContent = 
        `${agreedTotal.toLocaleString()}원`;

    // 상태 업데이트 추가
    updateConsultationStatus();
}

// 상담 상태 업데이트 함수 분리
function updateConsultationStatus() {
    // 동의된 상담내역만 필터링하여 합계 계산
    const agreedTotal = consultations
        .filter(consultation => consultation.agreed)
        .reduce((sum, consultation) => sum + consultation.amount, 0);

    // 상담수납금액 가져오기
    const paymentList = document.getElementById('payment-list');
    const payments = Array.from(paymentList.querySelectorAll('tr')).map(row => ({
        amount: parseInt(row.querySelector('.amount').textContent.replace(/[^0-9-]/g, '')),
        isConsultation: row.querySelector('.toggle-btn').classList.contains('consultation')
    }));

    const consultationPaymentTotal = payments
        .filter(payment => payment.isConsultation)
        .reduce((sum, payment) => sum + payment.amount, 0);

    // 차액 계산
    const difference = agreedTotal - consultationPaymentTotal;

    // 상태 표시 업데이트
    const statusContainer = document.querySelector('.consultation-status');
    if (!statusContainer) {
        const newStatusContainer = document.createElement('div');
        newStatusContainer.className = 'consultation-status';
        document.querySelector('.consultation-section').appendChild(newStatusContainer);
    }

    const container = document.querySelector('.consultation-status');
    if (difference > 0) {
        container.className = 'consultation-status underpaid';
        container.innerHTML = `
            <div class="status-icon"></div>
            <span>상담내용 미수납</span>
            <span class="amount">-${difference.toLocaleString()}원</span>
        `;
    } else if (difference < 0) {
        container.className = 'consultation-status overpaid';
        container.innerHTML = `
            <div class="status-icon"></div>
            <span>상담내용 과수납</span>
            <span class="amount">+${Math.abs(difference).toLocaleString()}원</span>
        `;
    } else {
        container.className = 'consultation-status fully-paid';
        container.innerHTML = `
            <div class="status-icon"></div>
            <span>완납</span>
            <span class="amount">0원</span>
        `;
    }
}

// 상담 내역 삭제
window.removeConsultation = async function(consultationId) {
    try {
        const response = await fetch(`/api/consultations/${consultationId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('상담내역 삭제 실패');
        }

        // 삭제된 상담내역을 배열에서 제거
        consultations = consultations.filter(c => c._id !== consultationId);
        
        // 목록과 합계 업데이트
        updateConsultationList();
        updateConsultationTotal();
        
        alert('상담내역이 삭제되었습니다.');
    } catch (error) {
        console.error('상담내역 삭제 중 에러:', error);
        alert('상담내역 삭제에 실패했습니다.');
    }
};

// 취소 버튼 처리
document.getElementById('cancel-consultation-btn')?.addEventListener('click', (e) => {
    e.stopPropagation(); // 이벤트 전파 중단
    document.getElementById('consultation-form').style.display = 'none';
    document.getElementById('new-consultation').reset();
});

// 수납 내역 목록 업데이트 함수 수정
async function updatePaymentList(chartNumber, patientName) {
    try {
        const response = await fetch('/api/transactions/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ chartNumber, patientName })
        });

        if (!response.ok) {
            throw new Error('수납 내역 조회 실패');
        }

        const payments = await response.json();
        
        // 날짜 역순으로 정렬
        payments.sort((a, b) => new Date(b.date) - new Date(a.date));

        const listElement = document.getElementById('payment-list');
        if (!listElement) return;

        listElement.innerHTML = payments.map(payment => `
            <tr>
                <td>${new Date(payment.date).toLocaleDateString()}</td>
                <td class="amount">${payment.paymentAmount.toLocaleString()}원</td>
                <td>${payment.paymentMethod === '카드' && payment.cardCompany 
                    ? `카드(${payment.cardCompany})` 
                    : payment.paymentMethod}</td>
                <td>
                    <button type="button" 
                            class="toggle-btn ${payment.isConsultation ? 'consultation' : 'treatment'}"
                            onclick="togglePaymentType('${payment._id}')">
                        ${payment.isConsultation ? '상담수납' : '일반수납'}
                    </button>
                </td>
            </tr>
        `).join('');

        // 상담수납 금액만 합산하도록 수정
        const consultationTotal = payments
            .filter(payment => payment.isConsultation)
            .reduce((sum, payment) => sum + (Number(payment.paymentAmount) || 0), 0);

        const totalElement = document.getElementById('total-payment-amount');
        if (totalElement) {
            // 라벨도 "상담수납금액 합계"로 변화
            document.querySelector('.payment-section .total-amount span:first-child').textContent = 
                '상담수납금액 합계:';
            totalElement.textContent = `${consultationTotal.toLocaleString()}원`;
        }
    } catch (error) {
        console.error('수납 내역 조회 중 에러:', error);
    }
}

// 차트번호나 이름이 변경될 때 상담내역과 수납내역 업데이트
async function updatePatientHistory(chartNumber, patientName) {
    try {
        // 수납내역 업데이트
        await updatePaymentList(chartNumber, patientName);
        
        // 상담내역 조회
        const response = await fetch(`/api/consultations?chartNumber=${chartNumber}&patientName=${patientName}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('상담내역 조회 실패');
        }

        const consultationHistory = await response.json();
        
        // 전역 consultations 배열 업데이트
        consultations = consultationHistory;
        
        // 상담내역 목록과 합계 업데이트
        updateConsultationList();
        updateConsultationTotal();

    } catch (error) {
        console.error('환자 이력 업데이트 중 에러:', error);
    }
}

// 차트번호 입력 필드 이벤트 리스너 수정
document.addEventListener('DOMContentLoaded', () => {
    const chartNumberInput = document.getElementById('chartNumber');
    if (chartNumberInput) {
        chartNumberInput.addEventListener('change', async (e) => {
            const chartNumber = e.target.value;
            
            // 차트번호가 입력되고 환자 이름이 자동으로 설정된 후에 이력 업데이트
            setTimeout(async () => {
                const patientName = document.getElementById('patientName').value;
                if (chartNumber && patientName) {
                    await updatePatientHistory(chartNumber, patientName);
                }
            }, 500);
        });
    }

    // 환자이름 입력 필드 이벤트 리스너 수정
    const patientNameInput = document.getElementById('patientName');
    if (patientNameInput) {
        patientNameInput.addEventListener('change', async (e) => {
            const patientName = e.target.value;
            const chartNumber = document.getElementById('chartNumber').value;
            if (chartNumber && patientName) {
                await updatePatientHistory(chartNumber, patientName);
            }
        });
    }
});

// 수정 폼 이벤트 리스너 추가
document.addEventListener('DOMContentLoaded', () => {
    // ... 기존 코드 ...

    // 수정 폼 제출 이벤트 리스너
    const editForm = document.getElementById('edit-transaction');
    if (editForm) {
        editForm.addEventListener('submit', handleEditTransactionSubmit);
    }

    // ... 기존 코드 ...
});

// 동의여부 토글 함수 수정
window.toggleConsultationAgreed = async function(consultationId) {
    try {
        // 현재 상담 데이터 찾기
        const consultation = consultations.find(c => c._id === consultationId);
        if (!consultation) {
            throw new Error('상담 정보를 찾을 수 없습니다.');
        }

        const isCurrentlyAgreed = consultation.agreed;
        let confirmedDate = consultation.confirmedDate;
        
        // 미동의에서 동의로 변경하는 경우에만 확정날짜 모달 표시
        if (!isCurrentlyAgreed) {
            // 확정날짜 모달 표시
            const confirmedDateModal = document.getElementById('confirmed-date-modal');
            if (!confirmedDateModal) {
                throw new Error('확정날짜 모달을 찾을 수 없습니다.');
            }

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
        
    } catch (error) {
        console.error('동의여부 수정 중 에러:', error);
        alert(error.message);
    }
};

// 상담수납 토글 함수 추가
window.togglePaymentType = async function(transactionId) {
    try {
        const response = await fetch(`/api/transactions/${transactionId}/toggle-consultation`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('상담수납 상태 수정 실패');
        }

        // 현재 차트번호와 환자이름으로 수납내역 다시 조회
        const chartNumber = document.getElementById('chartNumber').value;
        const patientName = document.getElementById('patientName').value;
        await updatePaymentList(chartNumber, patientName);
        updateConsultationStatus();  // 상태 업데이트 추가
        
    } catch (error) {
        console.error('상담수납 상태 수정 중 에러:', error);
        alert('상담수납 상태 수정에 실패했습니다.');
    }
};

// 진료외수입 일간 합계 업데이트 함수
export async function updateDailyExtraIncomeTotal(selectedDate) {
    try {
        const response = await fetch('/api/extra-incomes', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const extraincomes = await response.json();

        // 선택된 날짜의 진료외수입만 필터링
        const targetDate = new Date(selectedDate);
        targetDate.setHours(0, 0, 0, 0);

        const dailyextraincomes = extraincomes.filter(income => {
            const incomeDate = new Date(income.date);
            incomeDate.setHours(0, 0, 0, 0);
            return incomeDate.getTime() === targetDate.getTime();
        });

        // 일간 진료외수입 총액 계산
        const dailyTotal = dailyextraincomes.reduce((sum, income) => sum + (Number(income.amount) || 0), 0);

        // 합계 표시 업데이트 (요소가 있을 때만 실행)
        const totalElement = document.getElementById('daily-extra-income-total');
        if (totalElement) {
            totalElement.textContent = `${dailyTotal.toLocaleString()}원`;
        }
    } catch (error) {
        console.error('진료외수입 합계 계산 중 에러:', error);
    }
}

// 지출 일간 합계 업데이트 함수
export async function updateDailyExpenseTotal(selectedDate) {
    try {
        const response = await fetch('/api/expenses', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const expenses = await response.json();

        // 선택된 날짜의 지출만 필터링
        const targetDate = new Date(selectedDate);
        targetDate.setHours(0, 0, 0, 0);
        
        const dailyExpenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            expenseDate.setHours(0, 0, 0, 0);
            return expenseDate.getTime() === targetDate.getTime();
        });

        // 일간 지출 총액 계산
        const dailyTotal = dailyExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
        
        // 합계 표시 업데이트 (요소가 있을 때만 실행)
        const totalElement = document.getElementById('daily-expense-total');
        if (totalElement) {
            totalElement.textContent = `${dailyTotal.toLocaleString()}원`;
        }
    } catch (error) {
        console.error('지출 합계 계산 중 에러:', error);
    }
}

// 초기 로드 시에도 합계 업데이트
document.addEventListener('DOMContentLoaded', async () => {
    const today = new Date().toISOString().split('T')[0];
    await updateDailyExtraIncomeTotal(today);
    await updateDailyExpenseTotal(today);
});

// 진료외수입 저장 후 처리 수
async function handleextraincomesubmit(e) {
    e.preventDefault();
    
    const formData = {
        date: document.getElementById('extra-income-date').value,
        type: document.getElementById('extra-income-type').value,
        amount: document.getElementById('extra-income-amount').value,
        notes: document.getElementById('extra-income-notes').value
    };

    try {
        const response = await fetch('/api/extra-incomes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            document.getElementById('extra-income-form').style.display = 'none';
            e.target.reset();
            const selectedDate = document.getElementById('statistics-date').value;
            await displayextraincomes(selectedDate);
            await updateDailyExtraIncomeTotal(selectedDate);  // 합계 업데이트
            await updateStatistics(transactions, selectedDate);  // 전체 통계 업데이트
            alert('진료외수입이 등록되었습니다.');
        } else {
            const data = await response.json();
            alert(data.message || '저장에 실패했습니다.');
        }
    } catch (error) {
        console.error('저장 중 에러:', error);
        alert('저장 중 오류가 발생했습니다.');
    }
}

// 지출내역 저장 후 처리 수정
async function handleExpenseSubmit(e) {
    e.preventDefault();
    
    const formData = {
        // ... 기존 formData 구성 ...
    };

    try {
        const response = await fetch('/api/expenses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            document.getElementById('expense-form').style.display = 'none';
            e.target.reset();
            const selectedDate = document.getElementById('statistics-date').value;
            await displayExpenses(selectedDate);
            await updateDailyExpenseTotal(selectedDate);  // 합계 업데이트
            await updateStatistics(transactions, selectedDate);  // 전체 통계 업데이트
            alert('지출내역이 등록되었습니다.');
        } else {
            const data = await response.json();
            alert(data.message || '저장에 실패했습니다.');
        }
    } catch (error) {
        console.error('저장 중 에러:', error);
        alert('저장 중 오류가 발생했습니다.');
    }
}

// 진료외수입 삭제 후 처리 수정
async function deleteExtraIncome(id) {
    if (!confirm('이 진료외수입을 삭제하시겠습니까?')) return;

    try {
        const response = await fetch(`/api/extra-incomes/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const selectedDate = document.getElementById('statistics-date').value;
            await displayextraincomes(selectedDate);
            await updateDailyExtraIncomeTotal(selectedDate);  // 합계 업데이트
            await updateStatistics(transactions, selectedDate);  // 전체 통계 업데이트
            alert('진료외수입이 삭제되었습니다.');
        } else {
            alert('진료외수입 삭제에 실패했습니다.');
        }
    } catch (error) {
        console.error('삭제 중 에러:', error);
        alert('삭제 중 오류가 발생했습니다.');
    }
}

// 지출내역 삭제 후 처리 수정
async function deleteExpense(id) {
    if (!confirm('이 지출내역을 삭제하시겠습니까?')) return;

    try {
        const response = await fetch(`/api/expenses/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const selectedDate = document.getElementById('statistics-date').value;
            await displayExpenses(selectedDate);
            await updateDailyExpenseTotal(selectedDate);  // 합계 업데이트
            await updateStatistics(transactions, selectedDate);  // 전체 통계 업데이트
            alert('지출내역이 삭제되었습니다.');
        } else {
            alert('지출내역 삭제에 실패했습니다.');
        }
    } catch (error) {
        console.error('삭제 중 에러:', error);
        alert('삭제 중 오류가 발생했습니다.');
    }
}

// 상담 통계 카드 클릭 이벤트 설정
document.addEventListener('DOMContentLoaded', () => {
    // 동의 카드 클릭 이벤트
    document.querySelector('.stat-card.consultation-agreed').addEventListener('click', async () => {
        const activeTab = document.querySelector('.stat-period.active').dataset.period;
        await showConsultationList(true, activeTab);
    });

    // 미동의 카드 클릭 이벤트
    document.querySelector('.stat-card.consultation-not-agreed').addEventListener('click', async () => {
        const activeTab = document.querySelector('.stat-period.active').dataset.period;
        await showConsultationList(false, activeTab);
    });

    // 모달 닫기 버튼
    document.getElementById('close-consultation-list').addEventListener('click', () => {
        const consultationListModal = document.getElementById('consultation-list-modal');
        consultationListModal.style.display = 'none';
        modalManager.removeModal(consultationListModal);
    });

    // 상담 수정 모달 닫기 버튼
    document.getElementById('cancel-edit-consultation').addEventListener('click', () => {
        const editConsultationModal = document.getElementById('edit-consultation-modal');
        editConsultationModal.style.display = 'none';
        modalManager.removeModal(editConsultationModal);
    });

    // 상담 리스트 모달 초기화
    const consultationListModal = document.getElementById('consultation-list-modal');
    if (consultationListModal) {
        // 모달이 표시될 때 modalManager에 등록
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    if (consultationListModal.style.display === 'block') {
                        modalManager.pushModal(consultationListModal);
                    }
                }
            });
        });
        observer.observe(consultationListModal, { attributes: true });
    }

    // 상담 수정 모달 초기화
    const editConsultationModal = document.getElementById('edit-consultation-modal');
    if (editConsultationModal) {
        // 모달이 표시될 때 modalManager에 등록
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    if (editConsultationModal.style.display === 'block') {
                        modalManager.pushModal(editConsultationModal);
                    }
                }
            });
        });
        observer.observe(editConsultationModal, { attributes: true });
    }

    // 현금/계좌이체 카드 클릭 이벤트
    const cashReceiptModal = new CashReceiptModal();
    const cashTransferCard = document.querySelector('.stat-card.payment-detail:not(.card-stat)');
    if (cashTransferCard) {
        cashTransferCard.style.cursor = 'pointer';
        cashTransferCard.addEventListener('click', () => {
            const activeTab = document.querySelector('.stat-period.active').dataset.period;
            cashReceiptModal.show(activeTab);
        });
    }
});

// 상담 리스트 표시 함수 수정
async function showConsultationList(isAgreed, period) {
    try {
        const selectedDate = document.getElementById('statistics-date').value;
        const consultationsResponse = await fetch('/api/consultations', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const consultations = await consultationsResponse.json();

        // 날짜 범위 설정
        const targetDate = new Date(selectedDate);
        let startDate, endDate;

        if (period === 'daily') {
            startDate = new Date(targetDate.setHours(0, 0,0,0));
            endDate = new Date(targetDate.setHours(23,59,59,999));
        } else {
            startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
            endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
        }

        // 데이터 필터링
        const filteredConsultations = consultations.filter(consultation => {
            if (isAgreed) {
                // 동의된 상담은 confirmedDate 기준으로 필터링
                if (!consultation.agreed || !consultation.confirmedDate) return false;
                const confirmDate = new Date(consultation.confirmedDate);
                return confirmDate >= startDate && confirmDate <= endDate;
            } else {
                // 미동의 상담은 기존처럼 상담날짜(date) 기준으로 필터링
                if (consultation.agreed) return false;
                const consultDate = new Date(consultation.date);
                return consultDate >= startDate && consultDate <= endDate;
            }
        });

        // 테이블 헤더 설정
        const headers = period === 'daily' ? 
            [
                { text: '차트번호', class: 'col-chart-number' },
                { text: '이름', class: 'col-name' },
                { text: '담당의사', class: 'col-doctor' },
                { text: '상담직원', class: 'col-staff' },
                { text: '상담금액', class: 'col-amount' },
                { text: '상담날짜', class: 'col-date' },
                { text: '확정날짜', class: 'col-confirmed-date' },
                { text: '관리', class: 'col-actions' }
            ] :
            [
                { text: '상담날짜', class: 'col-date' },
                { text: '확정날짜', class: 'col-confirmed-date' },
                { text: '차트번호', class: 'col-chart-number' },
                { text: '이름', class: 'col-name' },
                { text: '담당의사', class: 'col-doctor' },
                { text: '상담직원', class: 'col-staff' },
                { text: '상담금액', class: 'col-amount' },
                { text: '관리', class: 'col-actions' }
            ];

        const headerRow = document.getElementById('consultation-list-headers');
        headerRow.innerHTML = headers.map(header => `<th class="${header.class}">${header.text}</th>`).join('');

        // 데이터 표시
        const listContainer = document.getElementById('consultation-detail-list');
        listContainer.innerHTML = filteredConsultations.map(consultation => {
            const consultDate = new Date(consultation.date).toLocaleDateString();
            const confirmDate = consultation.confirmedDate ? new Date(consultation.confirmedDate).toLocaleDateString() : '-';
            
            const baseRow = period === 'daily' ? 
                `<td class="col-chart-number">${consultation.chartNumber}</td>
                 <td class="col-name">${consultation.patientName}</td>
                 <td class="col-doctor">${consultation.doctor}</td>
                 <td class="col-staff">${consultation.staff}</td>
                 <td class="col-amount">${consultation.amount.toLocaleString()}원</td>
                 <td class="col-date">${consultDate}</td>
                 <td class="col-confirmed-date">${confirmDate}</td>` :
                `<td class="col-date">${consultDate}</td>
                 <td class="col-confirmed-date">${confirmDate}</td>
                 <td class="col-chart-number">${consultation.chartNumber}</td>
                 <td class="col-name">${consultation.patientName}</td>
                 <td class="col-doctor">${consultation.doctor}</td>
                 <td class="col-staff">${consultation.staff}</td>
                 <td class="col-amount">${consultation.amount.toLocaleString()}원</td>`;

            const actionButtons = `
                <td class="col-actions">
                    <button onclick="editConsultation('${consultation._id}')" class="btn">수정</button>
                    ${isAdmin() ? `<button onclick="deleteConsultation('${consultation._id}')" class="btn">삭제</button>` : ''}
                </td>`;

            return `<tr>${baseRow}${actionButtons}</tr>`;
        }).join('');

        // 모달 제목 설정
        const title = `${isAgreed ? '동의' : '미동의'} 상담 내역 (${period === 'daily' ? '일간' : '월간'})`;
        document.getElementById('consultation-list-title').textContent = title;

        // 날짜 표시
        const dateText = period === 'daily' ? 
            new Date(selectedDate).toLocaleDateString() :
            `${new Date(startDate).toLocaleDateString()} ~ ${new Date(endDate).toLocaleDateString()}`;
        document.getElementById('consultation-list-date').textContent = dateText;

        // 모달 표시
        const consultationListModal = document.getElementById('consultation-list-modal');
        consultationListModal.style.display = 'block';
        modalManager.pushModal(consultationListModal);

        // 모달 표시 후 통계 업데이트 시
        const transactionsResponse = await fetch('/api/transactions', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
        }});
        const transactions = await transactionsResponse.json();
        await updateStatistics(transactions, selectedDate);  // transactions 변수를 직접 전달

    } catch (error) {
        console.error('상담 리스트 표시 중 에러:', error);
        alert('상담 리스트를 불러오는데 실패했습니다.');
    }
}

// 상담 수정 함수 수정
async function editConsultation(id) {
    try {
        // 상담 데이터 조회
        const response = await fetch(`/api/consultations/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('상담 정보를 가져오는데 실패했습니다.');
        }

        const consultation = await response.json();

        // 설정 데이터 로드
        const settings = await loadSettings();
        
        // select 옵션 업데이트
        const doctorSelect = document.getElementById('edit-consultation-doctor');
        const staffSelect = document.getElementById('edit-consultation-staff');
        
        if (settings.doctor) {
            doctorSelect.innerHTML = '<option value="">선택하세요</option>' +
                settings.doctor.map(doctor => 
                    `<option value="${doctor.value}" ${doctor.value === consultation.doctor ? 'selected' : ''}>
                    ${doctor.value}
                </option>`
                ).join('');
        }
        
        if (settings.staff) {
            staffSelect.innerHTML = '<option value="">선택하세요</option>' +
                settings.staff.map(staff => 
                    `<option value="${staff.value}" ${staff.value === consultation.staff ? 'selected' : ''}>
                    ${staff.value}
                </option>`
                ).join('');
        }

        // 폼에 데이터 채우기
        document.getElementById('edit-consultation-date').value = new Date(consultation.date).toISOString().split('T')[0];
        document.getElementById('edit-consultation-chartNumber').value = consultation.chartNumber;
        document.getElementById('edit-consultation-patientName').value = consultation.patientName;
        document.getElementById('edit-consultation-amount').value = consultation.amount;
        document.getElementById('edit-consultation-agreed').checked = consultation.agreed;
        document.getElementById('edit-consultation-notes').value = consultation.notes || '';

        // 폼에 상담 ID 저장
        const form = document.getElementById('edit-consultation-form');
        form.dataset.consultationId = id;

        // 수정 모달 표시
        const editConsultationModal = document.getElementById('edit-consultation-modal');
        editConsultationModal.style.display = 'block';
        modalManager.pushModal(editConsultationModal);

    } catch (error) {
        console.error('상담 정보 로딩 중 에러:', error);
        alert('상담 정보를 불러오는데 실패했습니다.');
    }
}

// 상담 수정 제출 처리 함수 수정
async function handleEditConsultationSubmit(e) {
    e.preventDefault();
    
    try {
        // 기존 상담 정보를 API에서 직접 가져옴
        const consultationResponse = await fetch(`/api/consultations/${e.target.dataset.consultationId}`, {
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
            if (!confirmedDateModal) {
                throw new Error('확정날짜 모달을 찾을 수 없습니다.');
            }

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

        const response = await fetch(`/api/consultations/${e.target.dataset.consultationId}`, {
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
        const editConsultationModal = document.getElementById('edit-consultation-modal');
        editConsultationModal.style.display = 'none';
        modalManager.removeModal(editConsultationModal);
        
        // 리스트 새로고침
        const activeTab = document.querySelector('.stat-period.active').dataset.period;
        const isAgreed = document.getElementById('consultation-list-title').textContent.includes('동의');
        await showConsultationList(isAgreed, activeTab);
        
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

// 상담 수정 모달 이벤트 리스너 추가
document.addEventListener('DOMContentLoaded', () => {
    const editConsultationForm = document.getElementById('edit-consultation-form');
    if (editConsultationForm) {
        editConsultationForm.addEventListener('submit', handleEditConsultationSubmit);
    }
});

// 상담 삭제 함수
async function deleteConsultation(id) {
    if (!confirm('이 상담 정보를 삭제하시겠습니까?')) return;

    try {
        const response = await fetch(`/api/consultations/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('상담 정보 삭제에 실패했습니다.');
        }

        // 리스트 새로고침
        const activeTab = document.querySelector('.stat-period.active').dataset.period;
        const isAgreed = document.getElementById('consultation-list-title').textContent.includes('동의');
        await showConsultationList(isAgreed, activeTab);
        
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

        alert('상담 정보가 삭제되었습니다.');

    } catch (error) {
        console.error('상담 정보 삭제 중 에러:', error);
        alert('상담 정보 삭제에 실패했습니다.');
    }
}

// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', () => {
    // 수정 폼 제출 이벤트
    const editConsultationForm = document.getElementById('edit-consultation-form');
    if (editConsultationForm) {
        editConsultationForm.addEventListener('submit', handleEditConsultationSubmit);
    }

    // 수정 취소 버튼
    const cancelEditConsultationBtn = document.getElementById('cancel-edit-consultation');
    if (cancelEditConsultationBtn) {
        cancelEditConsultationBtn.addEventListener('click', () => {
            document.getElementById('edit-consultation-modal').style.display = 'none';
        });
    }

    // 전역 함수로 등록
    window.editConsultation = editConsultation;
    window.deleteConsultation = deleteConsultation;
});

// 카드 입금 정보 동기화 함수
async function syncCardDeposit(transactionId) {
    try {
        const response = await fetch('/api/card-deposits/sync-transaction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ transactionId })
        });

        if (!response.ok) {
            throw new Error('카드 입금 정보 동기화 실패');
        }
    } catch (error) {
        console.error('카드 입금 정보 동기화 중 오류:', error);
    }
}

// 사용자 권한 확인 함수
function isAdmin() {
    const user = JSON.parse(localStorage.getItem('user'));
    return user && user.role === '관리자';
}

// 스텝 폼 관리를 위한 코드
let currentStep = 1;
const totalSteps = 3;

function initializeStepForm() {
    const prevBtn = document.getElementById('prevStep');
    const nextBtn = document.getElementById('nextStep');
    const submitBtn = document.getElementById('submitForm');

    function updateStepUI(step) {
        // 스텝 인디케이터 업데이트
        document.querySelectorAll('.step').forEach(s => {
            const stepNum = parseInt(s.dataset.step);
            s.classList.remove('active', 'completed');
            if (stepNum === step) {
                s.classList.add('active');
            } else if (stepNum < step) {
                s.classList.add('completed');
            }
        });

        // 스텝 컨텐츠 업데이트
        document.querySelectorAll('.step-content').forEach(content => {
            content.classList.remove('active');
            if (parseInt(content.dataset.step) === step) {
                content.classList.add('active');
            }
        });

        // 버튼 상태 업데이트
        prevBtn.disabled = step === 1;
        nextBtn.style.display = step === totalSteps ? 'none' : 'block';
        submitBtn.style.display = step === totalSteps ? 'block' : 'none';
    }

    function validateCurrentStep() {
        const currentContent = document.querySelector(`.step-content[data-step="${currentStep}"]`);
        const requiredFields = currentContent.querySelectorAll('[required]');
        
        for (let field of requiredFields) {
            if (!field.value) {
                return false;
            }
        }
        return true;
    }

    function moveToNextStep(isAutomatic = false) {  // isAutomatic 매개변수 추가
        if (validateCurrentStep() && currentStep < totalSteps) {
            updateStepSummary(currentStep);
            currentStep++;
            updateStepUI(currentStep);
        } else if (!validateCurrentStep() && !isAutomatic) {  // 자동진행이 아닐 때만 경고 표시
            alert('필수 항목을 모두 입력해주세요.');
        }
    }

    // 첫 단계에만 자동진행 기능 적용
    function addInputListeners() {
        // 첫 번째 스텝의 필수 입력 필드에만 이벤트 리스너 추가
        const firstStepContent = document.querySelector('.step-content[data-step="1"]');
        if (firstStepContent) {
            const requiredFields = firstStepContent.querySelectorAll('[required]');
            
            requiredFields.forEach(field => {
                if (field.id === 'chartNumber') {
                    field.addEventListener('change', async () => {
                        setTimeout(() => {
                            checkFirstStepCompletion();
                        }, 500);
                    });
                } else {
                    field.addEventListener('input', () => checkFirstStepCompletion());
                    field.addEventListener('change', () => checkFirstStepCompletion());
                }
            });
        }

        // 환자 이름 필드에 MutationObserver 추가
        const patientNameField = document.getElementById('patientName');
        if (patientNameField) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                        checkFirstStepCompletion();
                    }
                });
            });
            
            observer.observe(patientNameField, {
                attributes: true,
                attributeFilter: ['value']
            });
        }
    }

    // 첫 번째 스텝 완료 확인 함수
    function checkFirstStepCompletion() {
        if (currentStep !== 1) return;

        const firstStepContent = document.querySelector('.step-content[data-step="1"]');
        const requiredFields = firstStepContent.querySelectorAll('[required]');
        
        let allFilled = true;
        requiredFields.forEach(field => {
            if (!field.value) {
                allFilled = false;
            }
        });

        if (allFilled) {
            const chartNumber = document.getElementById('chartNumber').value;
            const patientName = document.getElementById('patientName').value;
            const visitPath = document.getElementById('visitPath').value;
            
            if (chartNumber && patientName && visitPath) {
                setTimeout(() => {
                    moveToNextStep(true);  // 자동진행임을 표시
                }, 500);
            }
        }
    }

    function updateStepSummary(completedStep) {
        switch(completedStep) {
            case 1:
                const chartNumber = document.getElementById('chartNumber').value;
                const patientName = document.getElementById('patientName').value;
                const patientSummary = document.querySelector('.patient-summary');
                patientSummary.innerHTML = `
                    <div><span class="label">차트번호:</span><span class="value">${chartNumber}</span></div>
                    <div><span class="label">이름:</span><span class="value">${patientName}</span></div>
                `;
                break;
            case 2:
                const doctor = document.getElementById('doctor').value;
                const treatmentType = document.getElementById('treatmentType').value;
                const treatmentSummary = document.querySelector('.treatment-summary');
                treatmentSummary.innerHTML = `
                    <div><span class="label">진료의:</span><span class="value">${doctor}</span></div>
                    <div><span class="label">진료내용:</span><span class="value">${treatmentType}</span></div>
                `;
                break;
        }
    }

    // 이벤트 리스너 설정
    nextBtn.addEventListener('click', moveToNextStep);
    
    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            updateStepUI(currentStep);
        }
    });

    // 모달이 열릴 때 초기화
    document.getElementById('add-transaction').addEventListener('click', () => {
        const selectedDate = document.getElementById('statistics-date').value;
        
        const date = getKoreanDate(selectedDate);
        const adjustedDate = getKoreanDateString(date);
        document.getElementById('date').value = adjustedDate;

        currentStep = 1;
        document.querySelectorAll('.summary-content').forEach(content => {
            content.innerHTML = '';
        });        
        updateStepUI(currentStep);
        addInputListeners(); // 첫 단계 자동진행을 위한 리스너 추가
    });

    // ESC 키 처리
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeTransactionModal();
        }
    });

    // 취소 버튼 클릭 처리
    document.getElementById('cancel-transaction')?.addEventListener('click', closeTransactionModal);

    // 닫기 버튼 클릭 처리
    document.getElementById('close-modal-btn')?.addEventListener('click', closeTransactionModal);

    // 모달 닫기 함수
    function closeTransactionModal() {
        const transactionModal = document.getElementById('transaction-form');
        if (transactionModal && transactionModal.style.display === 'block') {
            transactionModal.style.display = 'none';
            document.getElementById('new-transaction').reset();
            currentStep = 1;
            updateStepUI(currentStep);
        }
    }

    // 초기 이벤트 리스너 설정
    addInputListeners();
}

// DOMContentLoaded 이벤트에 initializeStepForm 추가
document.addEventListener('DOMContentLoaded', () => {
    initializeStepForm();
});

export { 
    loadTransactions, 
    displayTransactions, 
    handleTransactionSubmit, 
    editTransaction, 
    deleteTransaction,
    updateMonthlyStatistics  // 이 부분 추가
};

// 날짜 비교를 위한 함수 추가
function isSameDate(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

// 수정/삭제 권한 확인 함수
function hasEditDeletePermission(transactionDate) {
    if (isAdmin()) return true;
    const koreanNow = getKoreanDate();
    const transactionKoreanDate = getKoreanDate(transactionDate);
    return isSameDate(transactionKoreanDate, koreanNow);
}