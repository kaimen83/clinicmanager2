class ImplantInventoryModal {
    constructor() {
        this.modal = document.getElementById('implantInventoryModal');
        this.currentTab = 'inventory';
        this.selectedProduct = null;
        this.initialized = false;
        this.productActivities = new Map();
        this.modalManager = null;
    }

    init() {
        if (!this.modal) return;
        this.setupModalHTML();
        this.setupStockModals();
        this.bindEvents();
        this.loadInventoryData();
        this.setDefaultDates();
        
        import('/js/modalManager.js').then(module => {
            this.modalManager = module.modalManager;
        });
    }

    setupModalHTML() {
        const modalBody = this.modal.querySelector('.implant-inventory-modal-body');
        modalBody.innerHTML = `
            <div class="implant-inventory-tabs">
                <button class="implant-inventory-tab active" data-tab="inventory">재고관리</button>
                <button class="implant-inventory-tab" data-tab="statistics">사용통계</button>
            </div>

            <!-- 재고관리 탭 -->
            <div class="implant-inventory-tab-content active" data-tab="inventory">
                <div class="implant-inventory-controls">
                    <div class="implant-inventory-search-section">
                        <input type="text" class="implant-inventory-search-input" placeholder="품목명 검색">
                        <select class="implant-category-filter">
                            <option value="">전체 카테고리</option>
                            <option value="fixture">Fixture</option>
                            <option value="이식재">이식재</option>
                            <option value="소모품">소모품</option>
                            <option value="기타">기타</option>
                        </select>
                        <select class="implant-name-filter">
                            <option value="">전체 품목</option>
                        </select>
                        <select class="implant-usage-filter">
                            <option value="">전체 사용처</option>
                            <option value="원내">원내</option>
                            <option value="기공소">기공소</option>
                        </select>
                        <div class="toggle-switch-wrapper">
                            <label class="toggle-switch">
                                <input type="checkbox" id="lowStockFilter">
                                <span class="toggle-slider"></span>
                            </label>
                            <span class="toggle-label">재고 부족 상품</span>
                        </div>
                    </div>
                </div>
                <table class="implant-inventory-table">
                    <thead>
                        <tr>
                            <th>카테고리</th>
                            <th>품목명</th>
                            <th>규격</th>
                            <th>사용처</th>
                            <th>현재재고</th>
                            <th>가격</th>
                            <th>재고가액</th>
                            <th>관리</th>
                        </tr>
                    </thead>
                    <tbody id="inventoryTableBody">
                    </tbody>
                </table>
            </div>

            <!-- 사용통계 탭 -->
            <div class="implant-inventory-tab-content" data-tab="statistics">
                <div class="implant-inventory-statistics-controls">
                    <div class="implant-inventory-view-selector">
                        <button class="implant-inventory-view-btn active" data-view="date">날짜별 보기</button>
                        <button class="implant-inventory-view-btn" data-view="product">품목별 보기</button>
                    </div>
                    <div class="implant-inventory-filters">
                        <select class="stat-category-filter">
                            <option value="">전체 카테고리</option>
                            <option value="fixture">Fixture</option>
                            <option value="이식재">이식재</option>
                            <option value="소모품">소모품</option>
                            <option value="기타">기타</option>
                        </select>
                        <select class="stat-name-filter">
                            <option value="">전체 품목</option>
                        </select>
                        <select class="stat-usage-filter">
                            <option value="">전체 사용처</option>
                            <option value="원내">원내</option>
                            <option value="기공소">기공소</option>
                        </select>
                    </div>
                    <div class="implant-inventory-period-selector">
                        <span>기간 선택:</span>
                        <input type="date" id="startDate" class="date-input">
                        <span>~</span>
                        <input type="date" id="endDate" class="date-input">
                    </div>
                </div>
                <div class="implant-inventory-statistics-summary">
                    <div class="implant-inventory-stat-card">
                        <h4>총 사용수량</h4>
                        <div class="implant-inventory-stat-value" id="totalUsage">0개</div>
                    </div>
                    <div class="implant-inventory-stat-card">
                        <h4>총 사용금액</h4>
                        <div class="implant-inventory-stat-value" id="totalAmount">0원</div>
                    </div>
                    <div class="implant-inventory-stat-card">
                        <h4>입고금액</h4>
                        <div class="implant-inventory-stat-value" id="totalStockIn">0원</div>
                    </div>
                    <div class="implant-inventory-stat-card">
                        <h4>폐기수량</h4>
                        <div class="implant-inventory-stat-value" id="totalDisposal">0개</div>
                    </div>
                </div>
                <div class="implant-inventory-statistics-tables">
                    <table id="dateViewTable" class="implant-inventory-statistics-table">
                        <thead>
                            <tr>
                                <th>날짜</th>
                                <th>유형</th>
                                <th>카테고리</th>
                                <th>품목명</th>
                                <th>규격</th>
                                <th>수량</th>
                                <th>환자명</th>
                                <th>담당의</th>
                                <th>사유</th>
                                <th>관리</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                    <table id="productViewTable" class="implant-inventory-statistics-table" style="display: none;">
                        <thead>
                            <tr>
                                <th>카테고리</th>
                                <th>품목명</th>
                                <th>규격</th>
                                <th>사용처</th>
                                <th>총 사용량</th>
                                <th>총 금액</th>
                                <th>상세내역</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        `;
    }

    setupStockModals() {
        // 입고 모달 추가
        const stockInModal = document.createElement('div');
        stockInModal.className = 'implant-stock-modal';
        stockInModal.id = 'stockInModal';
        stockInModal.innerHTML = `
            <div class="implant-stock-modal-content">
                <div class="implant-stock-modal-header">
                    <h3>입고 등록</h3>
                    <button class="implant-stock-modal-close">&times;</button>
                </div>
                <form id="stockInForm">
                    <div class="implant-stock-form-group">
                        <label>날짜*</label>
                        <input type="date" name="date" required>
                    </div>
                    <div class="implant-stock-form-group">
                        <label>수량</label>
                        <input type="number" name="quantity" min="1" required>
                    </div>
                    <div class="implant-stock-form-group">
                        <label>비고</label>
                        <textarea name="notes"></textarea>
                    </div>
                    <div class="implant-stock-form-actions">
                        <button type="submit" class="implant-stock-submit-btn">저장</button>
                        <button type="button" class="implant-stock-cancel-btn">취소</button>
                    </div>
                </form>
            </div>
        `;

        // 출고 모달 추가
        const stockOutModal = document.createElement('div');
        stockOutModal.className = 'implant-stock-modal';
        stockOutModal.id = 'stockOutModal';
        stockOutModal.innerHTML = `
            <div class="implant-stock-modal-content">
                <div class="implant-stock-modal-header">
                    <h3>출고 등록</h3>
                    <button class="implant-stock-modal-close">&times;</button>
                </div>
                <form id="stockOutForm">
                    <div class="implant-stock-form-group">
                        <label>날짜*</label>
                        <input type="date" name="date" required>
                    </div>
                    <div class="implant-stock-form-group">
                        <label>수량*</label>
                        <input type="number" name="quantity" min="1" required>
                    </div>
                    <div class="implant-stock-form-group patient-info">
                        <label>차트번호</label>
                        <input type="text" name="chartNumber" id="chartNumberInput">
                    </div>
                    <div class="implant-stock-form-group patient-info">
                        <label>환자명</label>
                        <input type="text" name="patientName" id="patientNameInput" readonly>
                    </div>
                    <div class="implant-stock-form-group patient-info">
                        <label>담당의</label>
                        <select name="doctor">
                            <option value="">선택하세요</option>
                        </select>
                    </div>
                    <div class="implant-stock-form-group">
                        <label>출고사유*</label>
                        <select name="outReason" required>
                            <option value="">선택하세요</option>
                            <option value="환자사용">환자사용</option>
                            <option value="폐기">폐기</option>
                            <option value="기타">기타</option>
                        </select>
                    </div>
                    <div class="implant-stock-form-group">
                        <label>비고</label>
                        <textarea name="notes"></textarea>
                    </div>
                    <div class="implant-stock-form-actions">
                        <button type="submit" class="implant-stock-submit-btn">저장</button>
                        <button type="button" class="implant-stock-cancel-btn">취소</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(stockInModal);
        document.body.appendChild(stockOutModal);

        // 입고 모달 이벤트
        this.setupModalEvents(stockInModal);
        
        // 출고 모달 이벤트
        this.setupModalEvents(stockOutModal);

        // 출고 사유 변경 이벤트 추가
        const outReasonSelect = stockOutModal.querySelector('select[name="outReason"]');
        outReasonSelect.addEventListener('change', (e) => {
            const isPatientUse = e.target.value === '환자사용';
            const patientInfoFields = stockOutModal.querySelectorAll('.patient-info input, .patient-info select');
            const labels = stockOutModal.querySelectorAll('.patient-info label');
            
            patientInfoFields.forEach(field => {
                field.required = isPatientUse;
                if (!isPatientUse) {
                    field.value = '';
                }
            });
            
            labels.forEach(label => {
                label.innerHTML = label.innerHTML.replace('*', '') + (isPatientUse ? '*' : '');
            });
        });

        // 폼 제출 이벤트
        document.getElementById('stockInForm').onsubmit = (e) => this.handleStockIn(e);
        document.getElementById('stockOutForm').onsubmit = (e) => this.handleStockOut(e);
    }

    setupModalEvents(modal) {
        const closeBtn = modal.querySelector('.implant-stock-modal-close');
        const cancelBtn = modal.querySelector('.implant-stock-cancel-btn');
        
        const closeModal = () => {
            if (this.modalManager) {
                this.modalManager.removeModal(modal);
            }
            modal.style.display = 'none';
            modal.querySelector('form').reset();
        };

        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;
    }

    bindEvents() {
        // 모달 닫기 버튼
        const closeBtn = this.modal.querySelector('.implant-inventory-modal-close');
        closeBtn.onclick = () => this.hide();

        // ESC 키로 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'block') {
                this.hide();
            }
        });

        // 모달 외부 클릭으로 닫기
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });

        // 탭 전환
        const tabs = this.modal.querySelectorAll('.implant-inventory-tab');
        tabs.forEach(tab => {
            tab.onclick = (e) => this.switchTab(e.target.dataset.tab);
        });

        // 검색 및 필터 이벤트
        this.bindSearchAndFilterEvents();

        // 통계 뷰 전환 버튼
        const viewBtns = this.modal.querySelectorAll('.implant-inventory-view-btn');
        viewBtns.forEach(btn => {
            btn.onclick = (e) => this.changeView(e.target.dataset.view);
        });

        // 날짜 선택 이벤트
        this.bindDateEvents();
    }

    bindSearchAndFilterEvents() {
        // 검색 기능
        const searchInput = this.modal.querySelector('.implant-inventory-search-input');
        searchInput.oninput = (e) => this.handleSearch(e.target.value);

        // 카테고리 필터
        const categoryFilter = this.modal.querySelector('.implant-category-filter');
        categoryFilter.onchange = () => {
            // 카테고리가 변경되면 품목명 필터 옵션 업데이트
            this.loadInventoryData().then(() => this.applyFilters());
        };

        // 품목명 필터
        const nameFilter = this.modal.querySelector('.implant-name-filter');
        nameFilter.onchange = () => this.applyFilters();

        // 사용처 필터
        const usageFilter = this.modal.querySelector('.implant-usage-filter');
        usageFilter.onchange = () => this.applyFilters();

        // 재고 부족 필터
        const lowStockFilter = this.modal.querySelector('#lowStockFilter');
        lowStockFilter.onchange = () => this.applyFilters();

        // 통계 탭 필터
        const statCategoryFilter = this.modal.querySelector('.stat-category-filter');
        statCategoryFilter.onchange = () => {
            // 카테고리가 변경되면 품목명 필터 옵션 업데이트
            this.loadStatisticsData();
        };

        // 통계 탭 품목명 필터
        const statNameFilter = this.modal.querySelector('.stat-name-filter');
        statNameFilter.onchange = () => this.loadStatisticsData();

        // 통계 탭 사용처 필터
        const statUsageFilter = this.modal.querySelector('.stat-usage-filter');
        statUsageFilter.onchange = () => this.loadStatisticsData();
    }

    bindDateEvents() {
        const dateInputs = this.modal.querySelectorAll('.date-input');
        dateInputs.forEach(input => {
            input.onchange = () => {
                const startDate = this.modal.querySelector('#startDate').value;
                const endDate = this.modal.querySelector('#endDate').value;
                
                if (startDate && endDate) {
                    if (new Date(startDate) > new Date(endDate)) {
                        alert('시작일은 종료일보다 이전이어야 합니다.');
                        input.value = '';
                        return;
                    }
                    this.loadStatisticsData();
                }
            };
        });
    }

    async loadInventoryData() {
        try {
            const response = await fetch('/api/implantproducts', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('재고 데이터를 불러오는데 실패했습니다.');
            }

            const data = await response.json();
            
            // 품목명 필터 옵션 업데이트
            this.updateNameFilterOptions(data);
            
            this.renderInventoryTable(data);
        } catch (error) {
            console.error('재고 데이터 로드 중 에러:', error);
            alert(error.message);
        }
    }

    updateNameFilterOptions(products) {
        const nameFilter = this.modal.querySelector('.implant-name-filter');
        const currentCategory = this.modal.querySelector('.implant-category-filter').value;
        
        // 현재 선택된 품목명 값 저장
        const currentSelectedName = nameFilter.value;
        
        // 중복 제거된 품목명 목록 생성
        const names = [...new Set(products
            .filter(p => !currentCategory || p.category === currentCategory)
            .map(p => p.name))]
            .sort((a, b) => a.localeCompare(b));
        
        // 옵션 생성
        nameFilter.innerHTML = `
            <option value="">전체 품목</option>
            ${names.map(name => `<option value="${name}">${name}</option>`).join('')}
        `;
        
        // 이전 선택값 복원
        if (currentSelectedName && names.includes(currentSelectedName)) {
            nameFilter.value = currentSelectedName;
        }
    }

    renderInventoryTable(products) {
        const tbody = this.modal.querySelector('#inventoryTableBody');
        tbody.innerHTML = products.map(product => {
            const isLowStock = product.stock <= 4;
            const stockValue = product.stock * product.price;
            
            return `
                <tr ${isLowStock ? 'class="low-stock-row"' : ''}>
                    <td>${product.category}</td>
                    <td>${product.name}</td>
                    <td>${product.specification}</td>
                    <td>${product.usage}</td>
                    <td class="${isLowStock ? 'low-stock-cell' : ''}">${product.stock}
                        ${isLowStock ? '<span class="low-stock-badge">부족</span>' : ''}
                    </td>
                    <td>${product.price.toLocaleString()}원</td>
                    <td>${stockValue.toLocaleString()}원</td>
                    <td>
                        <button class="implant-stock-btn" onclick="implantInventoryModal.showStockInModal('${product._id}')">입고</button>
                        <button class="implant-stock-btn" onclick="implantInventoryModal.showStockOutModal('${product._id}')">출고</button>
                    </td>
                </tr>
            `;
        }).join('');

        // 요약 정보 계산 및 표시
        const totalProducts = products.length;
        const totalStockValue = products.reduce((sum, product) => sum + (product.stock * product.price), 0);

        const summaryHTML = `
            <tfoot class="implant-inventory-summary">
                <tr>
                    <td colspan="6" class="summary-label">총 품목 수: <span class="summary-value">${totalProducts}개</span></td>
                    <td colspan="2" class="summary-label">총 재고가액: <span class="summary-value">${totalStockValue.toLocaleString()}원</span></td>
                </tr>
            </tfoot>
        `;

        const existingSummary = tbody.parentElement.querySelector('tfoot');
        if (existingSummary) {
            existingSummary.remove();
        }
        tbody.parentElement.insertAdjacentHTML('beforeend', summaryHTML);
    }

    async loadStatisticsData() {
        try {
            const startDate = this.modal.querySelector('#startDate').value;
            const endDate = this.modal.querySelector('#endDate').value;
            const categoryFilter = this.modal.querySelector('.stat-category-filter').value;
            const nameFilter = this.modal.querySelector('.stat-name-filter').value;
            const usageFilter = this.modal.querySelector('.stat-usage-filter').value;
            const view = this.modal.querySelector('.implant-inventory-view-btn.active').dataset.view;

            const params = new URLSearchParams({
                startDate,
                endDate,
                category: categoryFilter,
                productName: nameFilter,
                usage: usageFilter,
                view
            });

            const response = await fetch(`/api/implantproducts/statistics?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '통계 데이터를 불러오는데 실패했습니다.');
            }
            
            // 디버깅을 위한 로그 추가
            console.log('서버 응답 데이터:', data);
            console.log('activities:', data.activities);
            
            // 품목명 필터 옵션 업데이트
            this.updateStatNameFilterOptions(data);
            
            // 제품별 통계에 활동 데이터 저장
            if (data.productStats) {
                data.productStats.forEach(stat => {
                    const activityKey = `product_${stat._id}`;
                    if (stat.activities && stat.activities.length > 0) {
                        this.productActivities.set(activityKey, stat.activities);
                    }
                });
            }
            
            this.renderStatistics(data, view);
        } catch (error) {
            console.error('통계 데이터 로드 중 에러:', error);
            alert(error.message);
        }
    }

    updateStatNameFilterOptions(data) {
        const nameFilter = this.modal.querySelector('.stat-name-filter');
        const currentCategory = this.modal.querySelector('.stat-category-filter').value;
        
        // 현재 선택된 품목명 값 저장
        const currentSelectedName = nameFilter.value;
        
        // 중복 제거된 품목명 목록 생성 (activities와 productStats 모두에서)
        let names = [];
        
        // activities에서 품목명 추출
        if (data.activities && data.activities.length > 0) {
            const activityNames = data.activities
                .filter(activity => !currentCategory || activity.category === currentCategory)
                .map(activity => activity.productName);
            names.push(...activityNames);
        }
        
        // productStats에서 품목명 추출
        if (data.productStats && data.productStats.length > 0) {
            const productNames = data.productStats
                .filter(p => !currentCategory || p.category === currentCategory)
                .map(p => p.name);
            names.push(...productNames);
        }
        
        // 중복 제거 및 정렬
        names = [...new Set(names)].sort((a, b) => a.localeCompare(b));
        
        // 옵션 생성
        nameFilter.innerHTML = `
            <option value="">전체 품목</option>
            ${names.map(name => `<option value="${name}">${name}</option>`).join('')}
        `;
        
        // 이전 선택값 복원
        if (currentSelectedName && names.includes(currentSelectedName)) {
            nameFilter.value = currentSelectedName;
        }
    }

    renderStatistics(data, view) {
        // 요약 정보 업데이트
        this.modal.querySelector('#totalUsage').textContent = data.totalUsage.toLocaleString() + '개';
        this.modal.querySelector('#totalAmount').textContent = data.totalAmount.toLocaleString() + '원';
        this.modal.querySelector('#totalStockIn').textContent = data.totalStockInAmount.toLocaleString() + '원';
        this.modal.querySelector('#totalDisposal').textContent = data.totalDisposal.toLocaleString() + '개';

        if (view === 'date') {
            this.renderDateView(data.activities);
        } else {
            this.renderProductView(data.productStats);
        }
    }

    renderDateView(activities) {
        const tbody = this.modal.querySelector('#dateViewTable tbody');
        const categoryFilter = this.modal.querySelector('.stat-category-filter').value;
        const nameFilter = this.modal.querySelector('.stat-name-filter').value;
        const usageFilter = this.modal.querySelector('.stat-usage-filter').value;

        // 필터링된 활동 데이터
        const filteredActivities = activities.filter(activity => {
            const matchesCategory = !categoryFilter || activity.category === categoryFilter;
            const matchesName = !nameFilter || activity.productName === nameFilter;
            const matchesUsage = !usageFilter || activity.usage === usageFilter;
            return matchesCategory && matchesName && matchesUsage;
        });

        tbody.innerHTML = filteredActivities.map(activity => {
            const date = new Date(activity.date).toLocaleDateString();
            const typeText = activity.type === 'IN' ? '입고' : '출고';
            const typeClass = activity.type === 'IN' ? 'in-type' : 'out-type';
            const hasNotes = activity.notes && activity.notes.trim().length > 0;
            const tooltipClass = hasNotes ? 'has-tooltip' : '';

            return `
                <tr class="${tooltipClass}" ${hasNotes ? `data-notes="${activity.notes.replace(/"/g, '&quot;')}"` : ''}>
                    <td>${date}</td>
                    <td><span class="activity-type ${typeClass}">${typeText}</span></td>
                    <td>${activity.category}</td>
                    <td>${activity.productName}</td>
                    <td>${activity.specification || '-'}</td>
                    <td>${activity.quantity}개</td>
                    <td>${activity.patientName || '-'}</td>
                    <td>${activity.doctor || '-'}</td>
                    <td>${activity.outReason || '-'}</td>
                    <td>
                        <button class="delete-btn" onclick="implantInventoryModal.handleActivityDelete('${activity._id}')" title="삭제">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                            </svg>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // 기존 툴팁 이벤트 리스너 제거
        const existingTooltip = document.querySelector('.notes-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }

        // 툴팁 요소 생성
        const tooltip = document.createElement('div');
        tooltip.className = 'notes-tooltip';
        document.body.appendChild(tooltip);

        // 툴팁 이벤트 리스너 추가
        const rows = tbody.querySelectorAll('tr.has-tooltip');
        rows.forEach(row => {
            row.addEventListener('mousemove', (e) => {
                const notes = row.dataset.notes;
                if (notes) {
                    tooltip.textContent = notes;
                    tooltip.classList.add('show');
                    
                    // 마우스 커서 위치 기준으로 툴팁 위치 계산
                    const tooltipRect = tooltip.getBoundingClientRect();
                    let left = e.clientX + 10; // 커서 오른쪽에 10px 간격
                    let top = e.clientY + 10; // 커서 아래에 10px 간격
                    
                    // 화면 오른쪽 경계 체크
                    if (left + tooltipRect.width > window.innerWidth - 10) {
                        left = e.clientX - tooltipRect.width - 10; // 커서 왼쪽에 표시
                    }
                    
                    // 화면 하단 경계 체크
                    if (top + tooltipRect.height > window.innerHeight - 10) {
                        top = e.clientY - tooltipRect.height - 10; // 커서 위에 표시
                    }
                    
                    tooltip.style.left = `${left}px`;
                    tooltip.style.top = `${top}px`;
                }
            });

            row.addEventListener('mouseout', () => {
                tooltip.classList.remove('show');
            });
        });
    }

    renderProductView(productStats) {
        // 정렬 로직 추가
        const sortedStats = [...productStats].sort((a, b) => {
            // 카테고리 비교
            const categoryCompare = (a.category || '').localeCompare(b.category || '');
            if (categoryCompare !== 0) return categoryCompare;
            
            // 카테고리가 같으면 품목명 비교
            const nameCompare = (a.name || '').localeCompare(b.name || '');
            if (nameCompare !== 0) return nameCompare;
            
            // 품목명이 같으면 규격 비교
            return (a.specification || '').localeCompare(b.specification || '');
        });

        const tbody = this.modal.querySelector('#productViewTable tbody');
        tbody.innerHTML = sortedStats.map(stat => {
            return `
                <tr>
                    <td>${stat.category}</td>
                    <td>${stat.name}</td>
                    <td>${stat.specification}</td>
                    <td>${stat.usage}</td>
                    <td>${stat.totalUsage}개</td>
                    <td>${stat.totalAmount.toLocaleString()}원</td>
                    <td>
                        <button class="details-btn" onclick="implantInventoryModal.showProductDetails('${stat._id}')">상세보기</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    showProductDetails(productId) {
        console.log('showProductDetails 호출됨:', productId);
        const activityKey = `product_${productId}`;
        const activities = this.productActivities.get(activityKey);
        
        console.log('activities:', activities);
        
        if (!activities || activities.length === 0) {
            console.log('활동 데이터 없음, 데이터 다시 로드 시도');
            // 데이터가 없으면 다시 로드
            const startDate = this.modal.querySelector('#startDate').value;
            const endDate = this.modal.querySelector('#endDate').value;
            const view = this.modal.querySelector('.implant-inventory-view-btn.active').dataset.view;
            
            this.loadStatisticsData(startDate, endDate, view).then(() => {
                const reloadedActivities = this.productActivities.get(activityKey);
                console.log('재로드된 activities:', reloadedActivities);
                if (reloadedActivities && reloadedActivities.length > 0) {
                    this.renderProductDetailsModal(reloadedActivities, activityKey);
                } else {
                    console.error('활동 데이터를 찾을 수 없습니다.');
                    alert('상세 내역을 불러올 수 없습니다.');
                }
            });
            return;
        }

        this.renderProductDetailsModal(activities, activityKey);
    }

    renderProductDetailsModal(activities, activityKey) {
        console.log('renderProductDetailsModal 호출됨:', activities);
        
        // 기존 상세내역 모달이 있다면 제거
        const existingModal = document.querySelector('.product-details-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // 제품 ID 추출
        const productId = activityKey.replace('product_', '');

        const detailsHTML = `
            <table class="details-table">
                <thead>
                    <tr>
                        <th>날짜</th>
                        <th>유형</th>
                        <th>수량</th>
                        <th>환자명</th>
                        <th>담당의</th>
                        <th>사유</th>
                        <th>비고</th>
                        <th>관리</th>
                    </tr>
                </thead>
                <tbody>
                    ${activities.map(activity => {
                        const date = new Date(activity.date).toLocaleDateString();
                        const typeText = activity.type === 'IN' ? '입고' : '출고';
                        const typeClass = activity.type === 'IN' ? 'in-type' : 'out-type';

                        return `
                            <tr>
                                <td>${date}</td>
                                <td>
                                    <span class="activity-type ${typeClass}">${typeText}</span>
                                </td>
                                <td>${activity.quantity}개</td>
                                <td>${activity.patientName || '-'}</td>
                                <td>${activity.doctor || '-'}</td>
                                <td>${activity.outReason || '-'}</td>
                                <td>${activity.notes || '-'}</td>
                                <td>
                                    <button class="delete-btn" onclick="implantInventoryModal.handleActivityDelete('${activity._id}')" title="삭제">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        // 상세 내역 모달 표시
        const detailsModal = document.createElement('div');
        detailsModal.className = 'product-details-modal modal-overlay';
        detailsModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10002;
        `;
        detailsModal.innerHTML = `
            <div class="modal-content" style="
                background: white;
                padding: 20px;
                border-radius: 8px;
                width: 80%;
                max-height: 80vh;
                overflow-y: auto;
            ">
                <div class="modal-header">
                    <h3>상세 내역</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    ${detailsHTML}
                </div>
            </div>
        `;

        document.body.appendChild(detailsModal);
        
        if (this.modalManager) {
            this.modalManager.pushModal(detailsModal);
        }
        
        // 모달 닫기 이벤트
        detailsModal.querySelector('.close-btn').onclick = () => {
            if (this.modalManager) {
                this.modalManager.removeModal(detailsModal);
            }
            detailsModal.remove();
        };

        // 모달 외부 클릭 시 닫기
        detailsModal.onclick = (e) => {
            if (e.target === detailsModal) {
                if (this.modalManager) {
                    this.modalManager.removeModal(detailsModal);
                }
                detailsModal.remove();
            }
        };
    }

    async handleStockIn(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        try {
            const response = await fetch(`/api/implantproducts/${this.selectedProduct}/stock-in`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    date: formData.get('date'),
                    quantity: parseInt(formData.get('quantity')),
                    notes: formData.get('notes')
                })
            });

            // 응답 확인을 위한 로그 추가
            console.log('서버 응답 상태:', response.status);
            const responseData = await response.json();
            console.log('서버 응답 데이터:', responseData);

            if (!response.ok) {
                throw new Error(responseData.message || '입고 처리에 실패했습니다.');
            }

            document.getElementById('stockInModal').style.display = 'none';
            form.reset();
            this.loadInventoryData();
            alert('입고가 완료되었습니다.');

        } catch (error) {
            console.error('입고 처리 중 에러:', error);
            alert(error.message);
        }
    }

    async handleStockOut(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const outReason = formData.get('outReason');

        try {
            const requestBody = {
                date: formData.get('date'),
                quantity: parseInt(formData.get('quantity')),
                outReason: outReason,
                notes: formData.get('notes')
            };

            // 환자사용인 경우에만 환자 관련 정보 추가
            if (outReason === '환자사용') {
                requestBody.chartNumber = formData.get('chartNumber');
                requestBody.patientName = formData.get('patientName');
                requestBody.doctor = formData.get('doctor');
            }

            const response = await fetch(`/api/implantproducts/${this.selectedProduct}/stock-out`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(requestBody)
            });

            // 응답 확인을 위한 로그 추가
            console.log('서버 응답 상태:', response.status);
            const responseData = await response.json();
            console.log('서버 응답 데이터:', responseData);

            if (!response.ok) {
                throw new Error(responseData.message || '출고 처리에 실패했습니다.');
            }

            document.getElementById('stockOutModal').style.display = 'none';
            form.reset();
            this.loadInventoryData();
            alert('출고가 완료되었습니다.');

        } catch (error) {
            console.error('출고 처리 중 에러:', error);
            alert(error.message);
        }
    }

    async handleActivityDelete(activityId) {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        try {
            // URL 수정
            const response = await fetch(`/api/implantproducts/activities/${activityId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('활동 내역 삭제에 실패했습니다.');

            this.loadInventoryData();
            this.loadStatisticsData();
            alert('삭제가 완료되었습니다.');

        } catch (error) {
            console.error('활동 내역 삭제 중 에러:', error);
            alert(error.message);
        }
    }

    handleSearch(query) {
        this.applyFilters();
    }

    applyFilters() {
        const searchQuery = this.modal.querySelector('.implant-inventory-search-input').value.toLowerCase();
        const categoryFilter = this.modal.querySelector('.implant-category-filter').value;
        const nameFilter = this.modal.querySelector('.implant-name-filter').value;
        const usageFilter = this.modal.querySelector('.implant-usage-filter').value;
        const showLowStock = this.modal.querySelector('#lowStockFilter').checked;

        const rows = this.modal.querySelectorAll('#inventoryTableBody tr');
        let visibleProducts = 0;
        let totalStockValue = 0;
        
        rows.forEach(row => {
            const category = row.children[0].textContent;
            const name = row.children[1].textContent;
            const specification = row.children[2].textContent.toLowerCase();
            const usage = row.children[3].textContent;
            const stock = parseInt(row.children[4].textContent);
            const price = parseInt(row.children[5].textContent.replace(/[^0-9]/g, ''));

            const matchesSearch = name.toLowerCase().includes(searchQuery) || specification.includes(searchQuery);
            const matchesCategory = !categoryFilter || category === categoryFilter;
            const matchesName = !nameFilter || name === nameFilter;
            const matchesUsage = !usageFilter || usage === usageFilter;
            const matchesLowStock = !showLowStock || stock <= 5;

            const isVisible = matchesSearch && matchesCategory && matchesName && matchesUsage && matchesLowStock;
            row.style.display = isVisible ? '' : 'none';

            // 보이는 행에 대해서만 합계 계산
            if (isVisible) {
                visibleProducts++;
                totalStockValue += stock * price;
            }
        });

        // 요약 정보 업데이트
        const summaryHTML = `
            <tfoot class="implant-inventory-summary">
                <tr>
                    <td colspan="6" class="summary-label">총 품목 수: <span class="summary-value">${visibleProducts}개</span></td>
                    <td colspan="2" class="summary-label">총 재고가액: <span class="summary-value">${totalStockValue.toLocaleString()}원</span></td>
                </tr>
            </tfoot>
        `;

        const tbody = this.modal.querySelector('#inventoryTableBody');
        const existingSummary = tbody.parentElement.querySelector('tfoot');
        if (existingSummary) {
            existingSummary.remove();
        }
        tbody.parentElement.insertAdjacentHTML('beforeend', summaryHTML);
    }

    setDefaultDates() {
        // 한국 시간으로 설정
        const today = new Date();
        const koreaToday = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const startDate = new Date(koreaToday);
        startDate.setMonth(startDate.getMonth() - 1);

        const startInput = this.modal.querySelector('#startDate');
        const endInput = this.modal.querySelector('#endDate');
        
        startInput.value = startDate.toISOString().split('T')[0];
        endInput.value = koreaToday.toISOString().split('T')[0];
    }

    switchTab(tab) {
        this.currentTab = tab;
        
        this.modal.querySelectorAll('.implant-inventory-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });

        this.modal.querySelectorAll('.implant-inventory-tab-content').forEach(c => {
            c.classList.toggle('active', c.dataset.tab === tab);
        });

        if (tab === 'inventory') {
            this.loadInventoryData();
        } else if (tab === 'statistics') {
            this.loadStatisticsData();
        }
    }

    changeView(view) {
        this.modal.querySelectorAll('.implant-inventory-view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        this.modal.querySelector('#dateViewTable').style.display = view === 'date' ? 'table' : 'none';
        this.modal.querySelector('#productViewTable').style.display = view === 'product' ? 'table' : 'none';

        this.loadStatisticsData();
    }

    showStockInModal(productId) {
        this.selectedProduct = productId;
        const modal = document.getElementById('stockInModal');
        modal.style.display = 'block';
        
        // 한국 시간으로 현재 날짜 설정
        const today = new Date();
        const koreaToday = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        modal.querySelector('input[name="date"]').value = koreaToday.toISOString().split('T')[0];
        
        if (this.modalManager) {
            this.modalManager.pushModal(modal);
        }
    }

    showStockOutModal(productId) {
        this.selectedProduct = productId;
        const modal = document.getElementById('stockOutModal');
        modal.style.display = 'block';
        
        // 폼 초기화
        modal.querySelector('form').reset();
        
        // 한국 시간으로 현재 날짜 설정
        const today = new Date();
        const koreaToday = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        modal.querySelector('input[name="date"]').value = koreaToday.toISOString().split('T')[0];
        
        // 담당의 목록 로드
        this.loadDoctorList();
        
        // 차트번호 입력 이벤트 바인딩
        const chartNumberInput = modal.querySelector('#chartNumberInput');
        if (chartNumberInput) {
            // 기존 이벤트 리스너 제거
            const newChartNumberInput = chartNumberInput.cloneNode(true);
            chartNumberInput.parentNode.replaceChild(newChartNumberInput, chartNumberInput);
            
            // 새로운 이벤트 리스너 추가
            newChartNumberInput.addEventListener('change', this.handleChartNumberInput.bind(this));
        }
        
        if (this.modalManager) {
            this.modalManager.pushModal(modal);
        }
    }

    show() {
        if (!localStorage.getItem('token')) {
            window.location.href = '/login';
            return;
        }

        if (!this.initialized) {
            this.init();
            this.initialized = true;
        }

        this.modal.style.display = 'block';
        this.loadInventoryData();
    }

    hide() {
        this.modal.style.display = 'none';
    }

    async handleChartNumberInput(e) {
        const chartNumber = e.target.value.trim();
        const patientNameInput = document.getElementById('patientNameInput');

        if (!chartNumber) {
            patientNameInput.value = '';
            return;
        }

        try {
            const response = await fetch(`/api/patients/${chartNumber}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const patient = await response.json();
                patientNameInput.value = patient.name || '';
            } else if (response.status === 404) {
                // 환자를 찾을 수 없는 경우
                patientNameInput.value = '';
                alert(`차트번호 ${chartNumber}로 등록된 환자가 없습니다.`);
                e.target.value = '';
            }
        } catch (error) {
            console.error('환자 정보 조회 중 에러:', error);
            patientNameInput.value = '';
            alert('환자 정보 조회 중 오류가 발생했습니다.');
        }
    }

    async loadDoctorList() {
        try {
            const response = await fetch('/api/settings', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('담당의 목록을 불러오는데 실패했습니다.');
            }

            const settings = await response.json();
            const doctors = settings.doctor || [];
            
            const doctorSelect = document.querySelector('#stockOutModal select[name="doctor"]');
            if (doctorSelect) {
                doctorSelect.innerHTML = `
                    <option value="">선택하세요</option>
                    ${doctors
                        .filter(doctor => doctor.isActive)
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                        .map(doctor => `<option value="${doctor.value}">${doctor.value}</option>`)
                        .join('')}
                `;
            }
        } catch (error) {
            console.error('담당의 목록 로드 중 에러:', error);
            alert('담당의 목록을 불러오는데 실패했습니다.');
        }
    }

    // Debounce 유틸리티 함수
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// 전역 인스턴스 생성
window.implantInventoryModal = new ImplantInventoryModal();

// DOM이 로드된 후 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
    const implantInventoryBtn = document.getElementById('implant-inventory-btn');
    if (implantInventoryBtn) {
        implantInventoryBtn.addEventListener('click', () => {
            window.implantInventoryModal.show();
        });
    }
}); 