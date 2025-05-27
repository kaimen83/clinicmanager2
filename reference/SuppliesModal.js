export class SuppliesModal {
    constructor() {
        this.initialize();
    }

    async initialize() {
        await this.loadTemplate();
        
        // 요소 참조
        this.modal = document.getElementById('supplies-modal');
        this.closeBtn = document.getElementById('close-supplies-modal');
        this.form = document.getElementById('supplies-form');
        this.suppliesList = document.getElementById('supplies-list');
        this.vendorSelect = document.getElementById('supply-vendor');
        this.dateInput = document.getElementById('supply-date');
        
        // 날짜 필터 요소 참조 추가
        this.startDateInput = document.getElementById('supplies-modal-start-date');
        this.endDateInput = document.getElementById('supplies-modal-end-date');
        
        this.supplies = [];
        this.vendors = [];
        this.startDate = null;
        this.endDate = null;
        
        this.handleEscKey = this.handleEscKey.bind(this);
        
        this.initializeEventListeners();
        this.initializeDateFilter();
    }

    initializeDateFilter() {
        // 오늘 날짜를 기본값으로 설정
        const today = new Date();
        const oneMonthAgo = new Date(today);
        oneMonthAgo.setMonth(today.getMonth() - 1);  // 1개월 전으로 설정
        
        this.startDateInput.value = oneMonthAgo.toISOString().split('T')[0];
        this.endDateInput.value = today.toISOString().split('T')[0];
        
        this.startDate = oneMonthAgo;
        this.endDate = today;
    }

    async loadTemplate() {
        try {
            const response = await fetch('/components/templates/suppliesModal.html');
            const html = await response.text();
            
            // 템플릿을 body 끝에 추가
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = html;
            document.body.appendChild(tempContainer.firstElementChild);
        } catch (error) {
            console.error('Failed to load supplies modal template:', error);
        }
    }

    initializeEventListeners() {
        // 닫기 버튼 이벤트
        this.closeBtn.addEventListener('click', () => {
            this.hide();
        });
        
        // 모달 외부 클릭시 닫기
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });

        // 폼 제출 이벤트
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // 금액 입력 필드에 천단위 구분자 적용
        const amountInput = document.getElementById('supply-amount');
        amountInput.addEventListener('input', (e) => {
            let value = e.target.value;
            // 마이너스 부호는 맨 앞에만 허용하고, 나머지는 숫자만 허용
            value = value.replace(/[^\d-]|(?!^)-/g, '');
            // 숫자가 있을 경우에만 천단위 구분자 적용
            if (value) {
                const isNegative = value.startsWith('-');
                const numStr = value.replace(/[^\d]/g, '');
                if (numStr) {
                    const num = parseInt(numStr, 10);
                    e.target.value = (isNegative ? '-' : '') + num.toLocaleString();
                } else {
                    e.target.value = isNegative ? '-' : '';
                }
            } else {
                e.target.value = '';
            }
        });

        // 날짜 필터 이벤트 리스너 추가
        this.startDateInput.addEventListener('change', (e) => {
            this.startDate = new Date(e.target.value);
            this.loadSupplies();
        });

        this.endDateInput.addEventListener('change', (e) => {
            this.endDate = new Date(e.target.value);
            this.loadSupplies();
        });

        // 삭제 버튼 이벤트 위임
        this.suppliesList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-btn')) {
                const supplyId = e.target.dataset.id;
                if (confirm('정말 삭제하시겠습니까?')) {
                    await this.deleteSupply(supplyId);
                }
            }
        });
    }

    // ESC 키 이벤트 핸들러
    handleEscKey(e) {
        if (e.key === 'Escape' && this.modal.style.display === 'block') {
            this.hide();
        }
    }

    getAuthToken() {
        return localStorage.getItem('token');
    }

    async loadVendors() {
        try {
            const token = this.getAuthToken();
            const response = await fetch('/api/vendors', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('거래처 목록을 불러오는데 실패했습니다.');
            }
            
            this.vendors = await response.json();
            this.renderVendorOptions();
        } catch (error) {
            console.error('Error:', error);
        }
    }

    renderVendorOptions() {
        this.vendorSelect.innerHTML = `
            <option value="">거래처 선택</option>
            ${this.vendors.map(vendor => `
                <option value="${vendor.name}">${vendor.name}</option>
            `).join('')}
        `;
    }

    async loadSupplies() {
        try {
            const token = this.getAuthToken();
            let url = '/api/supplies';
            
            // 날짜 필터가 설정된 경우 쿼리 파라미터 추가
            if (this.startDate && this.endDate) {
                const startDateStr = this.startDate.toISOString().split('T')[0];
                const endDateStr = this.endDate.toISOString().split('T')[0];
                url = `/api/supplies/date-range?startDate=${startDateStr}&endDate=${endDateStr}`;
            }
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('데이터를 불러오는데 실패했습니다.');
            }
            
            this.supplies = await response.json();
            this.renderSuppliesList();
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async deleteSupply(supplyId) {
        try {
            const token = this.getAuthToken();
            const response = await fetch(`/api/supplies/${supplyId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('삭제에 실패했습니다.');
            }

            // 삭제 성공 시 목록에서 제거
            this.supplies = this.supplies.filter(supply => supply._id !== supplyId);
            this.renderSuppliesList();
            
        } catch (error) {
            console.error('Error:', error);
            alert('삭제에 실패했습니다.');
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(this.form);
        const isPaidCheckbox = document.getElementById('supply-isPaid');
        const amountStr = formData.get('amount');
        const isNegative = amountStr.startsWith('-');
        const amount = Number(amountStr.replace(/[^\d]/g, ''));
        
        const supplyData = {
            date: formData.get('date'),
            vendor: formData.get('vendor'),
            amount: isNegative ? -amount : amount,
            note: formData.get('note'),
            isPaid: isPaidCheckbox.checked
        };

        if (!supplyData.date || !supplyData.vendor || !supplyData.amount) {
            alert('날짜, 거래처, 금액은 필수 입력 항목입니다.');
            return;
        }

        try {
            const token = this.getAuthToken();
            const response = await fetch('/api/supplies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(supplyData)
            });

            if (!response.ok) {
                throw new Error('데이터 저장에 실패했습니다.');
            }

            const newSupply = await response.json();
            this.supplies.push(newSupply);
            this.renderSuppliesList();
            this.form.reset();
            
        } catch (error) {
            console.error('Error:', error);
            alert('데이터 저장에 실패했습니다.');
        }
    }

    renderSuppliesList() {
        // 날짜별 정렬
        this.supplies.sort((a, b) => new Date(b.date) - new Date(a.date));

        this.suppliesList.innerHTML = `
            <div class="supply-header">
                <div class="header-date">날짜</div>
                <div class="header-vendor">거래처</div>
                <div class="header-amount">금액</div>
                <div class="header-note">비고</div>
                <div class="header-paid">결제여부</div>
                <div class="header-actions"></div>
            </div>
            ${this.supplies.map(supply => {
                const isPaid = supply.isPaid === true;
                return `
                    <div class="supply-item">
                        <div class="supply-date">${new Date(supply.date).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                        }).replace(/\. /g, '.')}</div>
                        <div class="supply-vendor">${supply.vendor}</div>
                        <div class="supply-amount">${supply.amount.toLocaleString()}원</div>
                        <div class="supply-note">${supply.note || ''}</div>
                        <div class="supply-paid">
                            <input type="checkbox" 
                                   ${isPaid ? 'checked' : ''} 
                                   disabled 
                                   title="${isPaid ? '결제완료' : '미결제'}"
                                   style="opacity: ${isPaid ? '1' : '0.5'}">
                        </div>
                        <div class="supply-actions">
                            <button type="button" class="delete-btn" data-id="${supply._id}">삭제</button>
                        </div>
                    </div>
                `;
            }).join('')}
        `;
    }

    show() {
        // flatpickr에서 선택된 날짜 가져오기
        const selectedDate = document.getElementById('statistics-date').value.split(' ')[0];
        
        // 모달 표시
        this.modal.style.display = 'block';
        // body 스크롤 상태 저장 및 스크롤 방지
        this.bodyScrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${this.bodyScrollY}px`;
        document.body.style.width = '100%';
        
        // ESC 키 이벤트 리스너 추가
        document.addEventListener('keydown', this.handleEscKey.bind(this));
        
        // 날짜 입력 필드 초기화
        if (!this.dateInput._flatpickr) {
            flatpickr(this.dateInput, {
                dateFormat: "Y-m-d",
                defaultDate: selectedDate,
                locale: "ko"
            });
        } else {
            this.dateInput._flatpickr.setDate(selectedDate);
        }
        
        // 날짜 필터 초기화 및 데이터 로드
        this.initializeDateFilter();
        this.loadVendors();
        this.loadSupplies();
    }

    hide() {
        this.modal.style.display = 'none';
        this.form.reset();
        
        // body 스크롤 상태 복원
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, this.bodyScrollY);
        
        // ESC 키 이벤트 리스너 제거
        document.removeEventListener('keydown', this.handleEscKey.bind(this));
    }
} 