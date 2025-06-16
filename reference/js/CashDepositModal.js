class CashDepositModal {
    constructor() {
        this.modal = document.getElementById('deposit-modal');
        this.selectedRecords = new Set();
        this.selectedGroups = new Set();
        this.records = [];
        
        if (!this.modal) {
            this.createModal();
        }
        this.setupEventListeners();
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'deposit-modal';
        this.modal.className = 'deposit-modal';
        this.modal.innerHTML = `
            <div class="deposit-modal-content">
                <div class="deposit-modal-header">
                    <h2>계좌입금 상세 내역</h2>
                    <span class="deposit-modal-close">&times;</span>
                </div>
                <div class="deposit-actions">
                    <button class="deposit-button primary complete-button">입금완료</button>
                </div>
                <div class="deposit-summary">
                    <div>선택된 항목: 0</div>
                    <div class="total">합계: ￦0</div>
                </div>
                <div class="deposit-list">
                    <table class="deposit-table">
                        <thead>
                            <tr>
                                <th class="checkbox-cell">
                                    <input type="checkbox" id="select-all">
                                </th>
                                <th class="date-cell">날짜</th>
                                <th class="amount-cell">금액</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- 계좌입금 내역이 여기에 동적으로 추가됩니다 -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.body.appendChild(this.modal);
    }

    setupEventListeners() {
        if (!this.modal) return;

        // 모달 닫기 버튼
        const closeBtn = this.modal.querySelector('.deposit-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // ESC 키로 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
        });

        // 입금완료 버튼
        const completeBtn = this.modal.querySelector('.complete-button');
        if (completeBtn) {
            completeBtn.addEventListener('click', () => this.completeSelected());
        }

        // 전체 선택 체크박스
        const selectAll = this.modal.querySelector('#select-all');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                const checkboxes = this.modal.querySelectorAll('.deposit-table tbody input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    if (!checkbox.disabled) {
                        checkbox.checked = e.target.checked;
                        const row = checkbox.closest('tr');
                        const recordId = row.dataset.id;
                        const groupId = row.dataset.groupId;
                        
                        if (groupId) {
                            if (e.target.checked) {
                                this.selectedGroups.add(groupId);
                            } else {
                                this.selectedGroups.delete(groupId);
                            }
                        } else if (recordId) {
                            if (e.target.checked) {
                                this.selectedRecords.add(recordId);
                            } else {
                                this.selectedRecords.delete(recordId);
                            }
                        }
                    }
                });
                this.updateSummary();
            });
        }
    }

    async show(date) {
        try {
            // 기존 모달 제거
            if (this.modal) {
                this.modal.remove();
            }
            
            // 새 모달 생성
            this.createModal();
            this.setupEventListeners();

            const token = localStorage.getItem('token');
            const response = await fetch('/api/cash-deposit/recent', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('데이터 로드 중 오류가 발생했습니다.');
            }

            const data = await response.json();
            this.records = data;
            this.renderRecords();
            this.modal.style.display = 'block';
        } catch (error) {
            console.error('계좌입금 데이터 로드 중 오류:', error);
            alert('데이터를 불러오는 중 오류가 발생했습니다.');
        }
    }

    close() {
        this.modal.style.display = 'none';
        this.selectedRecords.clear();
        this.selectedGroups.clear();
    }

    renderRecords() {
        const tbody = this.modal.querySelector('.deposit-table tbody');
        tbody.innerHTML = this.records.map(record => {
            if (record.isGroup) {
                return this.renderGroupRow(record);
            } else {
                return this.renderRecordRow(record);
            }
        }).join('');

        this.updateSummary();
        this.setupRowEventListeners();
    }

    renderRecordRow(record) {
        const isCompleted = record.isCompleted;
        const date = new Date(record.date);
        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        return `
            <tr class="${isCompleted ? 'completed-deposit' : ''}" data-id="${record._id}">
                <td class="checkbox-cell">
                    <input type="checkbox" ${isCompleted ? 'disabled' : ''} 
                           ${this.selectedRecords.has(record._id) ? 'checked' : ''}>
                </td>
                <td>${formattedDate}</td>
                <td class="amount-cell">${this.formatAmount(record.amount)}</td>
            </tr>
        `;
    }

    renderGroupRow(group) {
        const isCompleted = group.isCompleted;
        const date = new Date(group.date);
        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        return `
            <tr class="deposit-group ${isCompleted ? 'completed-deposit' : ''}" data-group-id="${group._id}">
                <td class="checkbox-cell">
                    <input type="checkbox" ${isCompleted ? 'disabled' : ''}
                           ${this.selectedGroups.has(group._id) ? 'checked' : ''}>
                </td>
                <td>${formattedDate}</td>
                <td class="amount-cell">${this.formatAmount(group.totalAmount)}</td>
            </tr>
        `;
    }

    setupRowEventListeners() {
        // 체크박스 이벤트
        this.modal.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const row = e.target.closest('tr');
                const recordId = row.dataset.id;
                const groupId = row.dataset.groupId;

                if (groupId) {
                    if (e.target.checked) {
                        this.selectedGroups.add(groupId);
                    } else {
                        this.selectedGroups.delete(groupId);
                    }
                } else if (recordId) {
                    if (e.target.checked) {
                        this.selectedRecords.add(recordId);
                    } else {
                        this.selectedRecords.delete(recordId);
                    }
                }

                this.updateSummary();
            });
        });
    }

    updateSummary() {
        const summary = this.modal.querySelector('.deposit-summary');
        const total = this.calculateSelectedTotal();
        
        summary.innerHTML = `
            <div>선택된 항목: ${this.selectedRecords.size + this.selectedGroups.size}개</div>
            <div class="total">합계: ${this.formatAmount(total)}</div>
        `;
    }

    calculateSelectedTotal() {
        let total = 0;

        // 개별 레코드 합계
        this.selectedRecords.forEach(id => {
            const record = this.records.find(r => r._id === id && !r.isGroup);
            if (record) total += record.amount;
        });

        // 그룹 합계
        this.selectedGroups.forEach(id => {
            const group = this.records.find(r => r._id === id && r.isGroup);
            if (group) total += group.totalAmount;
        });

        return total;
    }

    async completeSelected() {
        if (this.selectedRecords.size === 0 && this.selectedGroups.size === 0) {
            alert('완료 처리할 항목을 선택해주세요.');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/cash-deposit/complete', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recordIds: Array.from(this.selectedRecords),
                    groupIds: Array.from(this.selectedGroups)
                })
            });

            if (!response.ok) {
                throw new Error('입금 완료 처리 중 오류가 발생했습니다.');
            }

            // 데이터 새로고침
            this.selectedRecords.clear();
            this.selectedGroups.clear();
            await this.show();

            // 종합일계표 새로고침 트리거
            const event = new CustomEvent('depositCompleted');
            document.dispatchEvent(event);
        } catch (error) {
            console.error('입금 완료 처리 중 오류:', error);
            alert(error.message);
        }
    }

    formatAmount(amount) {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW'
        }).format(amount);
    }
}

export default CashDepositModal; 