class DentalProductsModal {
    constructor() {
        this.modal = document.getElementById('dentalProductsModal');
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
        const modalBody = this.modal.querySelector('.dental-products-modal-body');
        modalBody.innerHTML = `
            <div class="dental-products-tabs">
                <button class="dental-products-tab active" data-tab="inventory">재고관리</button>
                <button class="dental-products-tab" data-tab="statistics">판매통계</button>
            </div>

            <!-- 재고관리 탭 -->
            <div class="dental-products-tab-content active" data-tab="inventory">
                <div class="dental-products-inventory-controls">
                    <div class="dental-products-search-section">
                        <input type="text" class="dental-products-search-input" placeholder="품목명 또는 제조사 검색">
                        <div class="toggle-switch-wrapper">
                            <label class="toggle-switch">
                                <input type="checkbox" id="lowStockFilter">
                                <span class="toggle-slider"></span>
                            </label>
                            <span class="toggle-label">재고 부족 상품</span>
                        </div>
                    </div>
                </div>
                <table class="dental-products-inventory-table">
                    <thead>
                        <tr>
                            <th>품목명</th>
                            <th>규격</th>
                            <th>제조사</th>
                            <th>현재재고</th>
                            <th>매입가</th>
                            <th>판매가</th>
                            <th>재고가액</th>
                            <th>관리</th>
                        </tr>
                    </thead>
                    <tbody id="inventoryTableBody">
                    </tbody>
                </table>
            </div>

            <!-- 판매통계 탭 -->
            <div class="dental-products-tab-content" data-tab="statistics">
                <div class="dental-products-statistics-controls">
                    <div class="dental-products-view-selector">
                        <button class="dental-products-view-btn active" data-view="date">날짜별 보기</button>
                        <button class="dental-products-view-btn" data-view="product">품목별 보기</button>
                    </div>
                    <div class="dental-products-period-selector">
                        <span>기간 선택:</span>
                        <input type="date" id="startDate" class="date-input">
                        <span>~</span>
                        <input type="date" id="endDate" class="date-input">
                    </div>
                </div>
                <div class="dental-products-statistics-summary">
                    <div class="dental-products-stat-card">
                        <h4>총 판매금액</h4>
                        <div class="dental-products-stat-value" id="totalSales">0원</div>
                    </div>
                    <div class="dental-products-stat-card">
                        <h4>총 판매수량</h4>
                        <div class="dental-products-stat-value" id="totalQuantity">0개</div>
                    </div>
                    <div class="dental-products-stat-card">
                        <h4>순이익</h4>
                        <div class="dental-products-stat-value" id="totalProfit">0원</div>
                    </div>
                    <div class="dental-products-stat-card">
                        <h4>입고액</h4>
                        <div class="dental-products-stat-value" id="totalStockIn">0원</div>
                    </div>
                </div>
                <div class="dental-products-statistics-tables">
                    <table id="dateViewTable" class="dental-products-statistics-table">
                        <thead>
                            <tr>
                                <th>날짜</th>
                                <th>유형</th>
                                <th>환자명</th>
                                <th>품목</th>
                                <th>수량</th>
                                <th>금액</th>
                                <th>비고</th>
                                <th>관리</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                    <table id="productViewTable" class="dental-products-statistics-table" style="display: none;">
                        <thead>
                            <tr>
                                <th>품목명</th>
                                <th>규격</th>
                                <th>판매수량</th>
                                <th>판매금액</th>
                                <th>순이익</th>
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
        stockInModal.className = 'dental-products-stock-modal';
        stockInModal.id = 'stockInModal';
        stockInModal.innerHTML = `
            <div class="dental-products-stock-modal-content">
                <div class="dental-products-stock-modal-header">
                    <h3>입고 등록</h3>
                    <button class="dental-products-stock-modal-close">&times;</button>
                </div>
                <form id="stockInForm">
                    <div class="dental-products-stock-form-group">
                        <label>수량</label>
                        <input type="number" name="quantity" min="1" required>
                    </div>
                    <div class="dental-products-stock-form-group">
                        <label>매입가(선택)</label>
                        <input type="number" name="purchasePrice" min="0">
                    </div>
                    <div class="dental-products-stock-form-group">
                        <label>비고</label>
                        <textarea name="notes"></textarea>
                    </div>
                    <div class="dental-products-stock-form-actions">
                        <button type="submit" class="dental-products-stock-submit-btn">저장</button>
                        <button type="button" class="dental-products-stock-cancel-btn">취소</button>
                    </div>
                </form>
            </div>
        `;

        // 출고 모달 추가
        const stockOutModal = document.createElement('div');
        stockOutModal.className = 'dental-products-stock-modal';
        stockOutModal.id = 'stockOutModal';
        stockOutModal.innerHTML = `
            <div class="dental-products-stock-modal-content">
                <div class="dental-products-stock-modal-header">
                    <h3>출고 등록</h3>
                    <button class="dental-products-stock-modal-close">&times;</button>
                </div>
                <form id="stockOutForm">
                    <div class="dental-products-stock-form-group">
                        <label>수량</label>
                        <input type="number" name="quantity" min="1" required>
                    </div>
                    <div class="dental-products-stock-form-group">
                        <label>출고사유</label>
                        <select name="reason" required>
                            <option value="판매">판매</option>
                            <option value="폐기">폐기</option>
                            <option value="기타">기타</option>
                        </select>
                    </div>
                    <div class="dental-products-stock-form-group">
                        <label>비고</label>
                        <textarea name="notes"></textarea>
                    </div>
                    <div class="dental-products-stock-form-actions">
                        <button type="submit" class="dental-products-stock-submit-btn">저장</button>
                        <button type="button" class="dental-products-stock-cancel-btn">취소</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(stockInModal);
        document.body.appendChild(stockOutModal);

        // 입고 모달 닫기 버튼 이벤트
        stockInModal.querySelector('.dental-products-stock-modal-close').onclick = () => {
            if (this.modalManager) {
                this.modalManager.removeModal(stockInModal);
            }
            stockInModal.style.display = 'none';
            stockInModal.querySelector('form').reset();
        };
        
        stockInModal.querySelector('.dental-products-stock-cancel-btn').onclick = () => {
            if (this.modalManager) {
                this.modalManager.removeModal(stockInModal);
            }
            stockInModal.style.display = 'none';
            stockInModal.querySelector('form').reset();
        };

        // 출고 모달 닫기 버튼 이벤트
        stockOutModal.querySelector('.dental-products-stock-modal-close').onclick = () => {
            if (this.modalManager) {
                this.modalManager.removeModal(stockOutModal);
            }
            stockOutModal.style.display = 'none';
            stockOutModal.querySelector('form').reset();
        };
        
        stockOutModal.querySelector('.dental-products-stock-cancel-btn').onclick = () => {
            if (this.modalManager) {
                this.modalManager.removeModal(stockOutModal);
            }
            stockOutModal.style.display = 'none';
            stockOutModal.querySelector('form').reset();
        };

        // 입고 모달 이벤트
        const stockInForm = document.getElementById('stockInForm');
        
        stockInForm.onsubmit = (e) => this.handleStockIn(e);

        // 출고 모달 이벤트
        const stockOutForm = document.getElementById('stockOutForm');
        
        stockOutForm.onsubmit = (e) => this.handleStockOut(e);
    }

    bindEvents() {
        // 모달 닫기 버튼
        const closeBtn = this.modal.querySelector('.dental-products-modal-close');
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
        const tabs = this.modal.querySelectorAll('.dental-products-tab');
        tabs.forEach(tab => {
            tab.onclick = (e) => this.switchTab(e.target.dataset.tab);
        });

        // 검색 기능
        const searchInput = this.modal.querySelector('.dental-products-search-input');
        searchInput.oninput = (e) => this.handleSearch(e.target.value);

        // 재고 필터
        const lowStockFilter = this.modal.querySelector('#lowStockFilter');
        lowStockFilter.onchange = () => this.filterLowStock();

        // 날짜 선택 이벤트
        const dateInputs = this.modal.querySelectorAll('.date-input');
        dateInputs.forEach(input => {
            input.onchange = () => {
                const startDate = this.modal.querySelector('#startDate').value;
                const endDate = this.modal.querySelector('#endDate').value;
                
                if (startDate && endDate) {
                    if (new Date(startDate) > new Date(endDate)) {
                        alert('시작일은 종료일보다 이전이어야 합니다.');
                        input.value = ''; // 잘못된 입력 초기화
                        return;
                    }
                    const view = this.modal.querySelector('.dental-products-view-btn.active').dataset.view;
                    this.loadStatisticsData(startDate, endDate, view);
                }
            };
        });

        // 뷰 전환 버튼
        const viewBtns = this.modal.querySelectorAll('.dental-products-view-btn');
        viewBtns.forEach(btn => {
            btn.onclick = (e) => this.changeView(e.target.dataset.view);
        });
    }

    async loadInventoryData() {
        try {
            const response = await fetch('/api/dental-products', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('재고 데이터를 불러오는데 실패했습니다.');
            
            const products = await response.json();
            this.renderInventoryTable(products);
        } catch (error) {
            console.error('재고 데이터 로드 중 에러:', error);
            alert(error.message);
        }
    }

    renderInventoryTable(products) {
        const tbody = this.modal.querySelector('#inventoryTableBody');
        tbody.innerHTML = products.map(product => {
            const isLowStock = (product.stock || 0) <= 5;
            const stockValue = product.purchasePrice ? (product.stock || 0) * product.purchasePrice : null;
            
            return `
                <tr ${isLowStock ? 'class="low-stock-row"' : ''}>
                    <td>${product.name}</td>
                    <td>${product.specification || '-'}</td>                    
                    <td>${product.manufacturer || '-'}</td>
                    <td class="${isLowStock ? 'low-stock-cell' : ''}">${product.stock || 0}
                        ${isLowStock ? '<span class="low-stock-badge">부족</span>' : ''}
                    </td>
                    <td>${product.purchasePrice ? product.purchasePrice.toLocaleString() : '-'}원</td>
                    <td>${product.sellingPrice ? product.sellingPrice.toLocaleString() : '-'}원</td>
                    <td>${stockValue ? stockValue.toLocaleString() : '-'}원</td>
                    <td>
                        <button class="dental-products-stock-btn" onclick="dentalProductsModal.showStockInModal('${product._id}')">입고</button>
                        <button class="dental-products-stock-btn" onclick="dentalProductsModal.showStockOutModal('${product._id}')">출고</button>
                    </td>
                </tr>
            `;
        }).join('');

        // 기존 요약 정보 제거
        const existingSummary = this.modal.querySelector('.dental-products-inventory-summary');
        if (existingSummary) {
            existingSummary.remove();
        }

        // 요약 정보 계산
        const totalProducts = products.length;
        const totalStockValue = products.reduce((sum, product) => {
            const stockValue = product.purchasePrice ? (product.stock || 0) * product.purchasePrice : 0;
            return sum + stockValue;
        }, 0);

        // 요약 정보 행 추가
        tbody.insertAdjacentHTML('afterend', `
            <tfoot class="dental-products-inventory-summary">
                <tr>
                    <td colspan="6" class="summary-label">총 품목 수: <span class="summary-value">${totalProducts}개</span></td>
                    <td colspan="2" class="summary-label">총 재고가액: <span class="summary-value">${totalStockValue.toLocaleString()}원</span></td>
                </tr>
            </tfoot>
        `);
    }

    async loadStatisticsData(startDate, endDate, view = 'date') {
        try {
            if (!startDate || !endDate) {
                const dateInputs = this.modal.querySelectorAll('.date-input');
                startDate = dateInputs[0].value;
                endDate = dateInputs[1].value;
            }

            // 상품 기본 정보 먼저 로드
            const productsResponse = await fetch('/api/dental-products', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!productsResponse.ok) {
                throw new Error('상품 정보를 불러오는데 실패했습니다.');
            }
            
            const products = await productsResponse.json();
            const productMap = new Map(products.map(p => [p._id, p]));

            // 통계 데이터 로드
            const params = new URLSearchParams({
                startDate: startDate,
                endDate: endDate,
                view: view
            });

            const url = `/api/dental-products/statistics?${params.toString()}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`통계 데이터를 불러오는데 실패했습니다. (${response.status}: ${errorText})`);
            }
            
            const statistics = await response.json();
            
            // 제품별 통계에 활동 데이터 저장
            if (statistics.productStats) {
                statistics.productStats.forEach(stat => {
                    const activityKey = `product_${stat._id}`;
                    if (stat.activities && stat.activities.length > 0) {
                        this.productActivities.set(activityKey, stat.activities);
                    }
                    // 상품 기본 정보 추가
                    const product = productMap.get(stat._id);
                    if (product) {
                        stat.sellingPrice = product.sellingPrice;
                        stat.purchasePrice = product.purchasePrice;
                    }
                });
            }
            
            this.renderStatistics(statistics, view);
        } catch (error) {
            console.error('통계 데이터 로드 중 에러:', error);
            alert(error.message);
        }
    }

    renderStatistics(data, view) {
        if (!data) {
            console.error('통계 데이터가 없습니다.');
            return;
        }

        // 입고액 계산
        const totalStockIn = data.activities
            ? data.activities
                .filter(activity => activity.type === 'IN')
                .reduce((sum, activity) => sum + activity.totalAmount, 0)
            : 0;

        // 요약 정보 업데이트
        this.modal.querySelector('#totalSales').textContent = data.totalSales.toLocaleString() + '원';
        this.modal.querySelector('#totalQuantity').textContent = data.totalQuantity.toLocaleString() + '개';
        this.modal.querySelector('#totalProfit').textContent = data.totalProfit.toLocaleString() + '원';
        this.modal.querySelector('#totalStockIn').textContent = totalStockIn.toLocaleString() + '원';

        const dateViewTable = this.modal.querySelector('#dateViewTable tbody');
        const productViewTable = this.modal.querySelector('#productViewTable tbody');

        // 날짜별 보기 테이블 렌더링
        if (data.activities) {
            dateViewTable.innerHTML = data.activities.map(activity => {
                const date = new Date(activity.date).toLocaleDateString();
                const typeText = {
                    'SALE': '판매',
                    'IN': '입고',
                    'OUT': '출고'
                }[activity.type];
                const typeClass = {
                    'SALE': 'sale-type',
                    'IN': 'in-type',
                    'OUT': 'out-type'
                }[activity.type];

                return `
                    <tr>
                        <td>${date}</td>
                        <td>
                            <span class="activity-type ${typeClass}">${typeText}</span>
                        </td>
                        <td>${activity.patientName || '-'}</td>
                        <td>${activity.products.map(p => p.name).join(', ')}</td>
                        <td>${activity.products.reduce((sum, p) => sum + p.quantity, 0)}개</td>
                        <td>${activity.totalAmount.toLocaleString()}원</td>
                        <td>${activity.notes || '-'}</td>
                        <td>
                            <button class="delete-btn" onclick="dentalProductsModal.handleActivityDelete('${activity._id}', '${activity.type}')" title="삭제">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                                </svg>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // 품목별 보기 테이블 렌더링
        if (data.productStats) {
            console.log('전체 통계 데이터:', data.productStats);  // 전체 데이터 구조 확인

            const sortedStats = [...data.productStats].sort((a, b) => {
                const nameCompare = (a.name || '').localeCompare(b.name || '');
                if (nameCompare === 0) {
                    return (a.specification || '').localeCompare(b.specification || '');
                }
                return nameCompare;
            });

            productViewTable.innerHTML = sortedStats.map(stat => {
                // 전체 stat 객체 로깅
                console.log('개별 상품 데이터:', stat);

                // 판매가와 매입가 가져오기 (stat 객체에서 직접)
                const sellingPrice = stat.sellingPrice || 0;
                const purchasePrice = stat.purchasePrice || 0;
                
                // 순이익 계산: 판매수량 x (판매가 - 매입가)
                const profit = stat.totalQuantity * (sellingPrice - purchasePrice);
                
                console.log('순이익 계산 상세:', {
                    totalQuantity: stat.totalQuantity,
                    sellingPrice: sellingPrice,
                    purchasePrice: purchasePrice,
                    profit: profit
                });

                const activityKey = `product_${stat._id}`;
                
                return `
                    <tr>
                        <td>${stat.name || '-'}</td>
                        <td>${stat.specification || '-'}</td>
                        <td>${stat.totalQuantity || 0}개</td>
                        <td>${(stat.totalAmount || 0).toLocaleString()}원</td>
                        <td>${profit.toLocaleString()}원</td>
                        <td>
                            <button class="details-text-btn" onclick="dentalProductsModal.showSaleDetails('${activityKey}')">상세보기</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    setDefaultDates() {
        // 오늘 날짜를 기본값으로 설정
        const today = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1); // 1달 전

        const startInput = this.modal.querySelector('#startDate');
        const endInput = this.modal.querySelector('#endDate');
        
        startInput.value = startDate.toISOString().split('T')[0];
        endInput.value = today.toISOString().split('T')[0];
    }

    switchTab(tab) {
        this.currentTab = tab;
        
        // 탭 버튼 활성화 상태 변경
        this.modal.querySelectorAll('.dental-products-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });

        // 탭 컨텐츠 표시/숨김
        this.modal.querySelectorAll('.dental-products-tab-content').forEach(c => {
            c.classList.toggle('active', c.dataset.tab === tab);
        });

        // 탭에 따른 데이터 로드
        if (tab === 'inventory') {
            this.loadInventoryData();
        } else if (tab === 'statistics') {
            const startDate = this.modal.querySelector('#startDate').value;
            const endDate = this.modal.querySelector('#endDate').value;
            const view = this.modal.querySelector('.dental-products-view-btn.active').dataset.view;
            this.loadStatisticsData(startDate, endDate, view);
        }
    }

    handleSearch(query) {
        this.applyFilters();
    }

    filterLowStock() {
        this.applyFilters();
    }

    applyFilters() {
        const searchQuery = this.modal.querySelector('.dental-products-search-input').value.toLowerCase();
        const isLowStockChecked = this.modal.querySelector('#lowStockFilter').checked;
        const rows = this.modal.querySelectorAll('#inventoryTableBody tr');
        
        let visibleProducts = 0;
        let totalStockValue = 0;

        rows.forEach(row => {
            const name = row.children[0].textContent;
            const specification = row.children[1].textContent.toLowerCase();
            const manufacturer = row.children[2].textContent.toLowerCase();
            const stock = parseInt(row.children[3].textContent);
            const purchasePrice = parseInt(row.children[4].textContent.replace(/[^0-9]/g, '')) || 0;

            const text = `${name} ${specification} ${manufacturer}`.toLowerCase();
            const matchesSearch = text.includes(searchQuery);
            const matchesLowStock = !isLowStockChecked || stock <= 5;

            const isVisible = matchesSearch && matchesLowStock;
            row.style.display = isVisible ? '' : 'none';

            // 보이는 행에 대해서만 합계 계산
            if (isVisible) {
                visibleProducts++;
                totalStockValue += stock * purchasePrice;
            }
        });

        // 요약 정보 업데이트
        const summaryHTML = `
            <tfoot class="dental-products-inventory-summary">
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

    changeView(view) {
        // 뷰 버튼 활성화 상태 변경
        this.modal.querySelectorAll('.dental-products-view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // 테이블 표시/숨김
        this.modal.querySelector('#dateViewTable').style.display = view === 'date' ? 'table' : 'none';
        this.modal.querySelector('#productViewTable').style.display = view === 'product' ? 'table' : 'none';

        // 데이터 로드
        const startDate = this.modal.querySelector('#startDate').value;
        const endDate = this.modal.querySelector('#endDate').value;
        this.loadStatisticsData(startDate, endDate, view);
    }

    show() {
        // 로그인 상태 체크
        if (!localStorage.getItem('token')) {
            window.location.href = '/login';
            return;
        }

        // 최초 show 시점에 초기화
        if (!this.initialized) {
            this.init();
            this.initialized = true;
        }

        this.modal.style.display = 'block';
        this.loadInventoryData();
    }

    hide() {
        this.modal.style.display = 'none';
        // productActivities는 유지하도록 clear() 제거
    }

    showStockInModal(productId) {
        this.selectedProduct = productId;
        const modal = document.getElementById('stockInModal');
        modal.style.display = 'block';
        if (this.modalManager) {
            this.modalManager.pushModal(modal);
        }
    }

    showStockOutModal(productId) {
        this.selectedProduct = productId;
        const modal = document.getElementById('stockOutModal');
        modal.style.display = 'block';
        if (this.modalManager) {
            this.modalManager.pushModal(modal);
        }
    }

    async handleStockIn(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const modal = document.getElementById('stockInModal');

        try {
            const response = await fetch(`/api/dental-products/${this.selectedProduct}/stock-in`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    quantity: parseInt(formData.get('quantity')),
                    purchasePrice: formData.get('purchasePrice') ? parseInt(formData.get('purchasePrice')) : null,
                    notes: formData.get('notes')
                })
            });

            if (!response.ok) throw new Error('입고 처리에 실패했습니다.');

            if (this.modalManager) {
                this.modalManager.removeModal(modal);
            }
            modal.style.display = 'none';
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
        const modal = document.getElementById('stockOutModal');

        try {
            const response = await fetch(`/api/dental-products/${this.selectedProduct}/stock-out`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    quantity: parseInt(formData.get('quantity')),
                    reason: formData.get('reason'),
                    notes: formData.get('notes')
                })
            });

            if (!response.ok) throw new Error('출고 처리에 실패했습니다.');

            if (this.modalManager) {
                this.modalManager.removeModal(modal);
            }
            modal.style.display = 'none';
            form.reset();
            this.loadInventoryData();
            alert('출고가 완료되었습니다.');

        } catch (error) {
            console.error('출고 처리 중 에러:', error);
            alert(error.message);
        }
    }

    showSaleDetails(activityKey) {
        const activities = this.productActivities.get(activityKey);
        if (!activities || activities.length === 0) {
            // 데이터가 없으면 다시 로드
            const startDate = this.modal.querySelector('#startDate').value;
            const endDate = this.modal.querySelector('#endDate').value;
            const view = this.modal.querySelector('.dental-products-view-btn.active').dataset.view;
            
            this.loadStatisticsData(startDate, endDate, view).then(() => {
                const reloadedActivities = this.productActivities.get(activityKey);
                if (reloadedActivities && reloadedActivities.length > 0) {
                    this.renderSaleDetailsModal(reloadedActivities, activityKey);
                } else {
                    console.error('활동 데이터를 찾을 수 없습니다.');
                    alert('상세 내역을 불러올 수 없습니다.');
                }
            });
            return;
        }

        this.renderSaleDetailsModal(activities, activityKey);
    }

    renderSaleDetailsModal(activities, activityKey) {
        // 기존 상세내역 모달이 있다면 제거
        const existingModal = document.querySelector('.sale-details-modal');
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
                        <th>단가</th>
                        <th>금액</th>
                        <th>구매자</th>
                        <th>비고</th>
                        <th>관리</th>
                    </tr>
                </thead>
                <tbody>
                    ${activities.map(activity => {
                        const date = new Date(activity.date).toLocaleDateString();
                        const typeText = {
                            'SALE': '판매',
                            'IN': '입고',
                            'OUT': '출고'
                        }[activity.type];
                        const typeClass = {
                            'SALE': 'sale-type',
                            'IN': 'in-type',
                            'OUT': 'out-type'
                        }[activity.type];

                        return `
                            <tr>
                                <td>${date}</td>
                                <td>
                                    <span class="activity-type ${typeClass}">${typeText}</span>
                                </td>
                                <td>${activity.quantity}개</td>
                                <td>${activity.price.toLocaleString()}원</td>
                                <td>${activity.amount.toLocaleString()}원</td>
                                <td>${activity.type === 'SALE' ? (activity.patientName || '-') : '-'}</td>
                                <td>${activity.notes || '-'}</td>
                                <td>
                                    <button class="delete-btn" onclick="dentalProductsModal.handleActivityDelete('${activity._id}', '${activity.type}')" title="삭제">
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
        detailsModal.className = 'sale-details-modal';
        detailsModal.innerHTML = `
            <div class="modal-content">
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

    async handleActivityDelete(activityId, activityType) {
        try {
            // 삭제 확인
            if (!confirm('정말 삭제하시겠습니까?')) {
                return;
            }

            const url = `/api/dental-products/activities/${activityId}`;
            
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error('활동 내역 삭제에 실패했습니다.');
            }

            const result = await response.json();

            // 재고 데이터도 새로고침 (입/출고 삭제의 경우)
            if (activityType === 'IN' || activityType === 'OUT') {
                await this.loadInventoryData();
            }

            // 상세보기 모달이 열려있다면 닫기
            const detailsModal = document.querySelector('.sale-details-modal');
            if (detailsModal) {
                if (this.modalManager) {
                    this.modalManager.removeModal(detailsModal);
                }
                detailsModal.remove();
            }

            // 통계 데이터 새로고침
            const startDate = this.modal.querySelector('#startDate').value;
            const endDate = this.modal.querySelector('#endDate').value;
            const view = this.currentView || 'date';
            await this.loadStatisticsData(startDate, endDate, view);

            alert(result.message || '삭제가 완료되었습니다.');
        } catch (error) {
            console.error('활동 내역 삭제 중 에러:', error);
            alert(error.message || '활동 내역 삭제 중 오류가 발생했습니다.');
        }
    }
}

// 전역 인스턴스 생성
window.dentalProductsModal = new DentalProductsModal();

// 버튼 클릭 이벤트 리스너 등록
const dentalProductsBtn = document.getElementById('dental-products-btn');
if (dentalProductsBtn) {
    dentalProductsBtn.addEventListener('click', () => {
        window.dentalProductsModal.show();
    });
}