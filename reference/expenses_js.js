import { loadSettings } from './settings.js';

// 사용자 권한 확인 함수
function isAdmin() {
    const user = JSON.parse(localStorage.getItem('user'));
    return user && user.role === '관리자';
}

// 지출 내역 표시 함수
async function displayExpenses(selectedDate = null) {
    try {
        const response = await fetch('/api/expenses', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const expenses = await response.json();

        // 선택된 날짜의 지출만 필터링
        const targetDate = selectedDate ? new Date(selectedDate) : new Date();
        targetDate.setHours(0, 0, 0, 0);
        
        const filteredExpenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            expenseDate.setHours(0, 0, 0, 0);
            return expenseDate.getTime() === targetDate.getTime();
        });

        const listElement = document.getElementById('expense-list');
        listElement.innerHTML = filteredExpenses.map(expense => `
            <tr>
                <td>${expense.details}</td>
                <td class="amount">${Number(expense.amount).toLocaleString()}원</td>
                <td>${expense.method}</td>
                <td>${expense.hasReceipt ? '있음' : '없음'}</td>
                <td>${expense.notes || ''}</td>
                <td class="actions">
                    ${hasEditDeletePermission(expense.date) ? `
                        <button onclick="editExpense('${expense._id}')" class="edit-btn">수정</button>
                        <button onclick="deleteExpense('${expense._id}')" class="transaction-delete-btn">삭제</button>
                    ` : ''}
                </td>
            </tr>
        `).join('');

        // 지출 통계 업데이트 추가
        await updateExpenseStatistics(selectedDate);
    } catch (error) {
        console.error('지출 내역 로드 실패:', error);
    }
}

// 지출 등록 처리 함수
async function handleExpenseSubmit(e) {
    e.preventDefault();
    
    const formData = {
        date: document.getElementById('expense-date').value,
        details: document.getElementById('expense-details').value,
        amount: Number(document.getElementById('expense-amount').value.replace(/[^\d]/g, '')),
        method: document.getElementById('expense-method').value,
        hasReceipt: document.getElementById('expense-receipt')?.checked || false,
        vendor: document.getElementById('expense-vendor').value,
        account: document.getElementById('expense-account').value,
        notes: document.getElementById('expense-notes')?.value || ''
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

        if (!response.ok) {
            const errorData = await response.json();
            console.error('서버 응답 에러:', errorData);
            throw new Error(errorData.message || '지출 등록에 실패했습니다.');
        }

        document.getElementById('expense-form').style.display = 'none';
        document.getElementById('new-expense').reset();
        const selectedDate = document.getElementById('statistics-date').value;
        await displayExpenses(selectedDate);
        
        // 현금 지출인 경우 현금시재 목록도 갱신
        if (formData.method === '현금') {
            try {
                if (typeof window.displayCashRecords === 'function') {
                    await window.displayCashRecords();
                }
            } catch (error) {
                console.error('현금시재 목록 갱신 실패:', error);
            }
        }
        
        alert('지출이 등록되었습니다.');
    } catch (error) {
        console.error('지출 등록 중 에러:', error);
        alert('지출 등록 중 오류가 발생했습니다.');
    }
}

// 지출 삭제 함수
async function deleteExpense(id) {
    try {
        // 먼저 지출 정보를 가져옴
        const getResponse = await fetch(`/api/expenses/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!getResponse.ok) {
            throw new Error('지출 정보를 가져오는데 실패했습니다.');
        }

        const expense = await getResponse.json();
        
        // 권한 체크
        if (!hasEditDeletePermission(expense.date)) {
            alert('지난 날짜의 지출 내역은 삭제할 수 없습니다.');
            return;
        }

        if (!confirm('이 지출 내역을 삭제하시겠습니까?')) return;

        const wasCash = expense.method === '현금';

        // 삭제 실행
        const response = await fetch(`/api/expenses/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('삭제에 실패했습니다.');
        }

        // 화면 갱신
        const selectedDate = document.getElementById('statistics-date').value;
        await displayExpenses(selectedDate);

        // 현금 지출이었다면 시재 목록도 갱신
        if (wasCash) {
            await refreshCashRecords();
        }

        alert('지출 내역이 삭제되었습니다.');
    } catch (error) {
        console.error('지출 삭제 중 오류:', error);
        alert(error.message);
    }
}

// 지출 통계 업데이트 함수
async function updateExpenseStatistics(selectedDate = null) {
    try {
        const response = await fetch('/api/expenses', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const expenses = await response.json();

        // 선택된 날짜 또는 오늘 날짜 사용
        const targetDate = selectedDate ? new Date(selectedDate) : new Date();
        targetDate.setHours(0, 0, 0, 0);
        
        // 일간 지출 계산
        const dailyExpenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            expenseDate.setHours(0, 0, 0, 0);
            return expenseDate.getTime() === targetDate.getTime();
        });
        const dailyTotal = dailyExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);

        // 월간 지출 계산
        const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1, 9);
        const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth()+1, 0, 9);
        const monthlyExpenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= monthStart && expenseDate <= monthEnd;
        });
        const monthlyTotal = monthlyExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);

        // 통계 표시 업데이트
        document.getElementById('total-expense').textContent = `${dailyTotal.toLocaleString()}원`;
        document.getElementById('monthly-total-expense').textContent = `${monthlyTotal.toLocaleString()}원`;

    } catch (error) {
        console.error('지출 통계 업데이트 중 에러:', error);
    }
}

// 지출등록 모달 열기 함수
export function openExpenseModal() {
    const modal = document.getElementById('expense-form');
    if (modal) {
        modal.style.display = 'block';
        // 현재 날짜를 기본값으로 설정
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('expense-date').value = today;
        // 거래처와 지출계정 옵션 업데이트
        updateExpenseSelections();
    }
}

// 거래처와 지출계정 옵션 업데이트 함수
export async function updateExpenseSelections(prefix = '') {
    try {
        // settings와 vendors 데이터 모두 가져오기
        const settings = await loadSettings();
        
        // 거래처 선택 옵션 업데이트
        const vendorSelect = document.getElementById(`${prefix}expense-vendor`);
        if (vendorSelect && settings.vendors) {
            vendorSelect.innerHTML = '<option value="">선택하세요</option>' +
                settings.vendors.map(vendor => 
                    `<option value="${vendor.name}">${vendor.name}</option>`
                ).join('');
        }

        // 지출계정 선택 옵션 업데이트
        const accountSelect = document.getElementById(`${prefix}expense-account`);
        if (accountSelect && settings.expenseAccount) {
            accountSelect.innerHTML = '<option value="">선택하세요</option>' +
                settings.expenseAccount.map(setting => 
                    `<option value="${setting.value}">${setting.value}</option>`
                ).join('');
        }
    } catch (error) {
        console.error('지출 관련 설정 로드 중 에러:', error);
    }
}

// 지출 수정 함수
async function editExpense(id) {
    try {
        const response = await fetch(`/api/expenses/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('지출 정보를 가져오는데 실패했습니다.');
        }

        const expense = await response.json();
        
        // 권한 체크
        if (!hasEditDeletePermission(expense.date)) {
            alert('지난 날짜의 지출 내역은 수정할 수 없습니다.');
            return;
        }

        // 수정 모달의 입력 필드에 기존 데이터 설정
        document.getElementById('edit-expense-date').value = expense.date.split('T')[0];
        document.getElementById('edit-expense-details').value = expense.details;
        document.getElementById('edit-expense-amount').value = expense.amount;
        document.getElementById('edit-expense-method').value = expense.method;
        document.getElementById('edit-expense-receipt').checked = expense.hasReceipt;
        
        // 거래처와 지출계정 옵션 업데이트 후 값 설정
        await updateExpenseSelections('edit-');
        
        // 기존 값 설정 (옵션 업데이트 후에 실행)
        document.getElementById('edit-expense-vendor').value = expense.vendor || '';
        document.getElementById('edit-expense-account').value = expense.account || '';
        document.getElementById('edit-expense-notes').value = expense.notes || '';

        // 수정할 지출의 ID를 저장
        document.getElementById('edit-expense-form').dataset.expenseId = id;

        // 수정 모달 표시
        document.getElementById('edit-expense-modal').style.display = 'block';
    } catch (error) {
        console.error('지출 수정 정보 로드 중 에러:', error);
        alert('지출 정보를 불러오는데 실패했습니다.');
    }
}

// 시재 목록 갱신 함수
async function refreshCashRecords() {
    try {
        // cash.js의 displayCashRecords 함수 호출
        if (typeof window.displayCashRecords === 'function') {
            await window.displayCashRecords();
        }
    } catch (error) {
        console.error('시재 목록 갱신 중 오류:', error);
    }
}

// 지출 수정 제출 함수
async function handleEditExpenseSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const expenseId = form.dataset.expenseId;

    const formData = {
        date: document.getElementById('edit-expense-date').value,
        details: document.getElementById('edit-expense-details').value,
        amount: Number(document.getElementById('edit-expense-amount').value.replace(/[^\d]/g, '')),
        method: document.getElementById('edit-expense-method').value,
        hasReceipt: document.getElementById('edit-expense-receipt').checked,
        vendor: document.getElementById('edit-expense-vendor').value,
        account: document.getElementById('edit-expense-account').value,
        notes: document.getElementById('edit-expense-notes').value
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

        if (!response.ok) {
            throw new Error('지출 수정에 실패했습니다.');
        }

        // 수정된 지출 정보 가져오기
        const updatedExpense = await response.json();

        // 화면 갱신
        document.getElementById('edit-expense-modal').style.display = 'none';
        const selectedDate = document.getElementById('statistics-date').value;
        await displayExpenses(selectedDate);

        // 현금 관련 지출이면 시재 목록도 갱신
        if (formData.method === '현금' || updatedExpense.method === '현금') {
            await refreshCashRecords();
        }

        alert('지출이 수정되었습니다.');
    } catch (error) {
        console.error('지출 수정 중 오류:', error);
        alert(error.message);
    }
}

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', function() {
    const editExpenseForm = document.getElementById('edit-expense-form');
    if (editExpenseForm) {
        editExpenseForm.addEventListener('submit', handleEditExpenseSubmit);
    }

    // 금액 입력 필드에 천단위 구분자 적용
    const amountInput = document.getElementById('expense-amount');
    if (amountInput) {
        amountInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^\d]/g, '');
            let numberValue = Number(value);
            let formattedValue = value ? numberValue.toLocaleString() : '';
            e.target.value = formattedValue;
        });
    }

    const editAmountInput = document.getElementById('edit-expense-amount');
    if (editAmountInput) {
        editAmountInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^\d]/g, '');
            let numberValue = Number(value);
            let formattedValue = value ? numberValue.toLocaleString() : '';
            e.target.value = formattedValue;
        });
    }

    // 지출등록 버튼 클릭 시 모달 열기
    const addExpenseBtn = document.getElementById('add-expense-btn');
    if (addExpenseBtn) {
        addExpenseBtn.addEventListener('click', () => {
            openExpenseModal();
        });
    }

    // 지출등록 모달 닫기 버튼
    const closeExpenseBtn = document.querySelector('#expense-form .close-btn');
    if (closeExpenseBtn) {
        closeExpenseBtn.addEventListener('click', () => {
            document.getElementById('expense-form').style.display = 'none';
        });
    }

    // 지출등록 폼 제출
    const expenseForm = document.getElementById('new-expense');
    if (expenseForm) {
        expenseForm.addEventListener('submit', handleExpenseSubmit);
    }

    // 지출 수정 모달 닫기 버튼
    const cancelEditExpenseBtn = document.getElementById('cancel-edit-expense-btn');
    if (cancelEditExpenseBtn) {
        cancelEditExpenseBtn.addEventListener('click', () => {
            document.getElementById('edit-expense-modal').style.display = 'none';
        });
    }

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const editExpenseModal = document.getElementById('edit-expense-modal');
            if (editExpenseModal && editExpenseModal.style.display === 'block') {
                editExpenseModal.style.display = 'none';
            }
        }
    });
});

// 전역 함수로 등록
window.editExpense = async function(id) {
    try {
        const response = await fetch(`/api/expenses/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('지출 정보를 가져오는데 실패했습니다.');
        }

        const expense = await response.json();
        
        // 권한 체크
        if (!hasEditDeletePermission(expense.date)) {
            alert('지난 날짜의 지출 내역은 수정할 수 없습니다.');
            return;
        }

        // 수정 모달의 입력 필드에 기존 데이터 설정
        document.getElementById('edit-expense-date').value = new Date(expense.date).toISOString().split('T')[0];
        document.getElementById('edit-expense-details').value = expense.details;
        document.getElementById('edit-expense-amount').value = expense.amount;
        document.getElementById('edit-expense-method').value = expense.method;
        document.getElementById('edit-expense-receipt').checked = expense.hasReceipt;
        
        // 거래처와 지출계정 옵션 업데이트 후 값 설정
        await updateExpenseSelections('edit-');
        
        // 기존 값 설정 (옵션 업데이트 후에 실행)
        document.getElementById('edit-expense-vendor').value = expense.vendor || '';
        document.getElementById('edit-expense-account').value = expense.account || '';
        document.getElementById('edit-expense-notes').value = expense.notes || '';

        // 수정할 지출의 ID를 저장
        document.getElementById('edit-expense-form').dataset.expenseId = id;

        // 수정 모달 표시
        document.getElementById('edit-expense-modal').style.display = 'block';
    } catch (error) {
        console.error('지출 수정 정보 로드 중 에러:', error);
        alert('지출 정보를 불러오는데 실패했습니다.');
    }
};

// 전역으로 필요한 함수들 노출
window.openExpenseModal = openExpenseModal;
window.updateExpenseSelections = updateExpenseSelections;

// 일일 지출 총액 업데이트 함수
async function updateDailyExpenseTotal(selectedDate) {
    try {
        const response = await fetch('/api/expenses', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const expenses = await response.json();

        // 선택된 날짜의 지출만 필터링
        const targetDate = selectedDate ? new Date(selectedDate) : new Date();
        targetDate.setHours(0, 0, 0, 0);
        
        const filteredExpenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            expenseDate.setHours(0, 0, 0, 0);
            return expenseDate.getTime() === targetDate.getTime();
        });

        // 일일 총액 계산
        const dailyTotal = filteredExpenses.reduce((total, expense) => total + Number(expense.amount), 0);

        // 통계 섹션 업데이트
        const dailyExpenseElement = document.getElementById('daily-expense-total');
        if (dailyExpenseElement) {
            dailyExpenseElement.textContent = dailyTotal.toLocaleString() + '원';
        }

        return dailyTotal;
    } catch (error) {
        console.error('일일 지출 총액 계산 중 오류:', error);
        throw error;
    }
}

// 한국 시간 기준 날짜 가져오기
function getKoreanDate(dateString = null) {
    const date = dateString ? new Date(dateString) : new Date();
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    return new Date(utc + (9 * 60 * 60 * 1000));
}

// 날짜 비교를 위한 함수 추가
function isSameDate(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

// 수정/삭제 권한 확인 함수
function hasEditDeletePermission(expenseDate) {
    if (isAdmin()) return true;
    const koreanNow = getKoreanDate();
    const expenseKoreanDate = getKoreanDate(expenseDate);
    return isSameDate(expenseKoreanDate, koreanNow);
}

// 함수들 export
export {
    displayExpenses,
    handleExpenseSubmit,
    deleteExpense,
    updateDailyExpenseTotal
}; 