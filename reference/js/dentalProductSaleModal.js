// 구강용품 판매 모달 클래스 정의
import { modalManager } from '../modalManager.js';

export class DentalProductSaleModal {
    constructor() {
        this.modal = null;
        this.selectedProducts = new Map(); // 선택된 제품 목록
        this.products = []; // 전체 구강용품 목록
        this.filteredProducts = []; // 검색 필터링된 제품 목록
        this.currentPage = 1;
        this.itemsPerPage = 6;
        this.searchQuery = '';
    }

    // 모달 표시
    async show(transactionData) {
        try {
            // 구강용품 목록 가져오기
            const response = await fetch('/api/dental-products', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            this.products = await response.json();
            this.filteredProducts = [...this.products];
            
            // 모달 생성
            this.modal = document.createElement('div');
            this.modal.className = 'modal dental-product-sale-modal';
            this.modal.style.display = 'block';
            
            // 기본 모달 구조 생성
            this.modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>구강용품 판매</h3>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="modal-tabs">
                        <button class="tab-button active" data-tab="sale">판매 등록</button>
                        <button class="tab-button" data-tab="history">판매 내역</button>
                    </div>
                    <div class="modal-body">
                        <!-- 판매 등록 탭 -->
                        <div class="tab-content active" data-tab="sale">
                            <form id="dental-product-sale-form">
                                <div class="basic-info">
                                    <div class="form-group">
                                        <label for="sale-date">날짜</label>
                                        <input type="date" id="sale-date" name="date" required value="${transactionData.date || new Date().toISOString().split('T')[0]}">
                                    </div>
                                    <div class="form-group">
                                        <label for="sale-chart-number">차트번호</label>
                                        <input type="text" id="sale-chart-number" value="${transactionData.chartNumber}" readonly>
                                    </div>
                                    <div class="form-group">
                                        <label for="sale-patient-name">환자명</label>
                                        <input type="text" id="sale-patient-name" value="${transactionData.patientName}" readonly>
                                    </div>
                                    <div class="form-group">
                                        <label for="sale-doctor">진료의사</label>
                                        <input type="text" id="sale-doctor" value="${transactionData.doctor}" readonly>
                                    </div>
                                </div>

                                <div class="products-section">
                                    <div class="products-header">
                                        <h4>구강용품 선택</h4>
                                        <div class="search-box">
                                            <input type="text" 
                                                   class="search-input" 
                                                   placeholder="구강용품 검색..."
                                                   value="${this.searchQuery}">
                                        </div>
                                    </div>
                                    <div class="products-grid">
                                        ${this.renderProductCards()}
                                    </div>
                                    ${this.filteredProducts.length > this.itemsPerPage ? 
                                        '<button type="button" class="load-more">더보기</button>' : ''}
                                </div>

                                <div class="selected-products">
                                    <h4>선택된 구강용품</h4>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>품목명</th>
                                                <th>제조사</th>
                                                <th>규격</th>
                                                <th>수량</th>
                                                <th>판매단가</th>
                                                <th>합계</th>
                                                <th>관리</th>
                                            </tr>
                                        </thead>
                                        <tbody id="selected-products-list">
                                        </tbody>
                                    </table>
                                    <div class="total-amount">
                                        총 금액: <span id="total-sale-amount">0</span>원
                                    </div>
                                </div>

                                <div class="form-actions">
                                    <button type="submit">저장</button>
                                    <button type="button" class="cancel-btn">취소</button>
                                </div>
                            </form>
                        </div>

                        <!-- 판매 내역 탭 -->
                        <div class="tab-content" data-tab="history">
                            <div class="sales-history">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>날짜</th>
                                            <th>구강용품</th>
                                            <th>수량</th>
                                            <th>판매금액</th>
                                            <th>관리</th>
                                        </tr>
                                    </thead>
                                    <tbody id="sales-history-list">
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // 모달을 body에 추가
            document.body.appendChild(this.modal);

            // 모달 매니저에 등록
            modalManager.pushModal(this);

            // 이벤트 리스너 등록
            this.bindEvents();

            // 판매 내역 로드
            this.loadSalesHistory();

        } catch (error) {
            console.error('구강용품 판매 모달 생성 중 에러:', error);
            alert('구강용품 판매 모달을 생성하는데 실패했습니다.');
        }
    }

    // 이벤트 리스너 등록
    bindEvents() {
        // 닫기 버튼
        this.modal.querySelector('.close-btn').addEventListener('click', () => this.close());
        this.modal.querySelector('.cancel-btn').addEventListener('click', () => this.close());

        // 탭 전환
        this.modal.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // 구강용품 카드 클릭
        this.modal.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', () => this.toggleProduct(card.dataset.id));
        });

        // 검색 입력 이벤트
        this.modal.querySelector('.search-input').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.trim().toLowerCase();
            this.currentPage = 1;
            this.filterProducts();
            this.updateProductsGrid();
        });

        // 더보기 버튼 클릭
        const loadMoreBtn = this.modal.querySelector('.load-more');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.currentPage++;
                this.updateProductsGrid();
            });
        }

        // 폼 제출
        this.modal.querySelector('#dental-product-sale-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSubmit(e);
        });
    }

    // 제품 필터링
    filterProducts() {
        if (!this.searchQuery) {
            this.filteredProducts = [...this.products];
        } else {
            this.filteredProducts = this.products.filter(product => 
                product.name.toLowerCase().includes(this.searchQuery) ||
                product.manufacturer.toLowerCase().includes(this.searchQuery)
            );
        }
    }

    // 제품 카드 렌더링
    renderProductCards() {
        const startIndex = 0;
        const endIndex = Math.min(this.itemsPerPage, this.filteredProducts.length);
        
        return this.filteredProducts
            .slice(startIndex, endIndex)
            .map(product => `
                <div class="product-card" data-id="${product._id}" data-stock="${product.stock || 0}">
                    <div class="product-name">${product.name}</div>
                    <div class="product-info">
                        ${product.manufacturer} / ${product.specification || '규격없음'}
                        <br>판매가: ${product.sellingPrice.toLocaleString()}원
                        <br><span class="stock-info">재고: ${product.stock || 0}개</span>
                    </div>
                </div>
            `).join('');
    }

    // 제품 그리드 업데이트
    updateProductsGrid() {
        const grid = this.modal.querySelector('.products-grid');
        const startIndex = 0;
        const endIndex = Math.min(this.currentPage * this.itemsPerPage, this.filteredProducts.length);
        
        grid.innerHTML = this.filteredProducts
            .slice(startIndex, endIndex)
            .map(product => `
                <div class="product-card ${this.selectedProducts.has(product._id) ? 'selected' : ''}" 
                     data-id="${product._id}" 
                     data-stock="${product.stock || 0}">
                    <div class="product-name">${product.name}</div>
                    <div class="product-info">
                        ${product.manufacturer} / ${product.specification || '규격없음'}
                        <br>판매가: ${product.sellingPrice.toLocaleString()}원
                        <br><span class="stock-info">재고: ${product.stock || 0}개</span>
                    </div>
                </div>
            `).join('');

        // 더보기 버튼 업데이트
        const loadMoreBtn = this.modal.querySelector('.load-more');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = endIndex < this.filteredProducts.length ? 'block' : 'none';
        }

        // 이벤트 리스너 다시 바인딩
        grid.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', () => this.toggleProduct(card.dataset.id));
        });
    }

    // 구강용품 선택/해제
    toggleProduct(productId) {
        const product = this.products.find(p => p._id === productId);
        const card = this.modal.querySelector(`.product-card[data-id="${productId}"]`);
        
        if (this.selectedProducts.has(productId)) {
            this.selectedProducts.delete(productId);
            card.classList.remove('selected');
        } else {
            this.selectedProducts.set(productId, {
                ...product,
                quantity: 1,
                salePrice: product.sellingPrice
            });
            card.classList.add('selected');
        }

        this.updateSelectedProductsList();
    }

    // 선택된 제품 목록 업데이트
    updateSelectedProductsList() {
        const tbody = this.modal.querySelector('#selected-products-list');
        tbody.innerHTML = Array.from(this.selectedProducts.values()).map(product => `
            <tr data-id="${product._id}">
                <td>${product.name}</td>
                <td>${product.manufacturer}</td>
                <td>${product.specification || '규격없음'}</td>
                <td>
                    <input type="number" 
                           class="quantity-input" 
                           value="${product.quantity}" 
                           min="1" 
                           onchange="this.closest('.dental-product-sale-modal').querySelector('#dental-product-sale-form').dispatchEvent(new CustomEvent('updateCalculation'))">
                </td>
                <td>
                    <input type="number" 
                           class="price-input" 
                           value="${product.salePrice}" 
                           min="0" 
                           onchange="this.closest('.dental-product-sale-modal').querySelector('#dental-product-sale-form').dispatchEvent(new CustomEvent('updateCalculation'))">
                </td>
                <td class="subtotal">${(product.quantity * product.salePrice).toLocaleString()}원</td>
                <td>
                    <button type="button" class="delete-btn" onclick="this.closest('tr').dispatchEvent(new CustomEvent('removeProduct'))">삭제</button>
                </td>
            </tr>
        `).join('');

        // 수량/가격 변경 이벤트
        tbody.querySelectorAll('tr').forEach(row => {
            const productId = row.dataset.id;
            
            // 수량 변경
            row.querySelector('.quantity-input').addEventListener('change', (e) => {
                const product = this.selectedProducts.get(productId);
                product.quantity = parseInt(e.target.value) || 1;
                this.updateCalculation();
            });

            // 가격 변경
            row.querySelector('.price-input').addEventListener('change', (e) => {
                const product = this.selectedProducts.get(productId);
                product.salePrice = parseInt(e.target.value) || product.sellingPrice;
                this.updateCalculation();
            });

            // 삭제
            row.addEventListener('removeProduct', () => {
                this.selectedProducts.delete(productId);
                this.modal.querySelector(`.product-card[data-id="${productId}"]`).classList.remove('selected');
                this.updateSelectedProductsList();
            });
        });

        this.updateCalculation();
    }

    // 총액 계산
    updateCalculation() {
        let total = 0;
        this.selectedProducts.forEach(product => {
            total += product.quantity * product.salePrice;
            
            // 소계 업데이트
            const row = this.modal.querySelector(`tr[data-id="${product._id}"]`);
            if (row) {
                row.querySelector('.subtotal').textContent = `${(product.quantity * product.salePrice).toLocaleString()}원`;
            }
        });

        this.modal.querySelector('#total-sale-amount').textContent = total.toLocaleString();
    }

    // 탭 전환
    switchTab(tabId) {
        this.modal.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        this.modal.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.tab === tabId);
        });

        if (tabId === 'history') {
            this.loadSalesHistory();
        }
    }

    // 판매 내역 로드
    async loadSalesHistory() {
        try {
            const chartNumber = this.modal.querySelector('#sale-chart-number').value;
            const response = await fetch(`/api/dental-product-sales?chartNumber=${chartNumber}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('서버 응답이 실패했습니다.');
            }

            const history = await response.json();
            if (!Array.isArray(history)) {
                throw new Error('서버 응답이 올바른 형식이 아닙니다.');
            }
            
            const tbody = this.modal.querySelector('#sales-history-list');
            tbody.innerHTML = history
                .filter(sale => sale.chartNumber === chartNumber) // 현재 환자의 데이터만 필터링
                .map(sale => {
                    const saleDate = new Date(sale.date);
                    const formattedDate = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}-${String(saleDate.getDate()).padStart(2, '0')}`;
                    
                    // 제품 정보를 더 깔끔하게 표시
                    const productInfo = sale.products.map(p => 
                        `${p.name} (${p.quantity}개)`
                    ).join(', ');

                    return `
                        <tr>
                            <td>${formattedDate}</td>
                            <td class="products-column" title="${productInfo}">${productInfo}</td>
                            <td>${sale.products.reduce((sum, p) => sum + p.quantity, 0)}개</td>
                            <td>${sale.totalAmount.toLocaleString()}원</td>
                            <td>
                                <button type="button" class="delete-btn action-btn">삭제</button>
                            </td>
                        </tr>
                    `;
                })
                .join('');

            // 판매 내역이 없는 경우 메시지 표시
            if (tbody.innerHTML === '') {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 20px; color: #666;">
                            판매 내역이 없습니다.
                        </td>
                    </tr>
                `;
            }

            // 삭제 이벤트 리스너
            tbody.querySelectorAll('.delete-btn').forEach((btn, index) => {
                const sale = history[index];
                btn.onclick = () => this.deleteSale(sale._id);
            });

        } catch (error) {
            console.error('판매 내역 로드 중 에러:', error);
            alert('판매 내역을 불러오는데 실패했습니다: ' + error.message);
        }
    }

    // 판매 내역 삭제
    async deleteSale(saleId) {
        if (!confirm('이 판매 내역을 삭제하시겠습니까?')) return;

        try {
            const response = await fetch(`/api/dental-product-sales/${saleId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('판매 내역 삭제에 실패했습니다.');
            }

            await this.loadSalesHistory();
            alert('판매 내역이 삭제되었습니다.');

        } catch (error) {
            console.error('판매 내역 삭제 중 에러:', error);
            alert(error.message);
        }
    }

    // 폼 제출 처리
    async handleSubmit(event) {
        try {
            event.preventDefault();
            const form = event.target;

            // 기본 데이터 검증
            const date = form.querySelector('#sale-date').value;
            const chartNumber = form.querySelector('#sale-chart-number').value;
            const patientName = form.querySelector('#sale-patient-name').value;
            const doctor = form.querySelector('#sale-doctor').value;

            if (!date || !chartNumber || !patientName) {
                throw new Error('날짜, 차트번호, 환자명은 필수 입력 사항입니다.');
            }

            if (this.selectedProducts.size === 0) {
                throw new Error('구강용품을 선택해주세요.');
            }

            // 현재 로그인한 사용자의 ID 가져오기
            const userId = localStorage.getItem('userId');
            if (!userId) {
                throw new Error('로그인이 필요합니다.');
            }

            // 요청 데이터 구성
            const saleData = {
                date,
                chartNumber,
                patientName,
                doctor,
                userId,
                products: Array.from(this.selectedProducts.values()).map(product => ({
                    productId: product._id,
                    name: product.name,
                    manufacturer: product.manufacturer,
                    quantity: parseInt(product.quantity) || 1,
                    salePrice: parseInt(product.salePrice) || product.sellingPrice
                }))
            };

            // API 요청
            const response = await fetch('/api/dental-product-sales', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(saleData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '구강용품 판매 정보 저장에 실패했습니다.');
            }

            alert('구강용품 판매 정보가 저장되었습니다.');
            this.close();

        } catch (error) {
            console.error('저장 중 오류 발생:', error);
            alert(error.message);
        }
    }

    // 모달 닫기
    close() {
        if (this.modal) {
            modalManager.removeModal(this);
            this.modal.remove();
            this.modal = null;
        }
    }

    async saveSale() {
        try {
            if (!this.selectedProducts.length) {
                alert('선택된 구강용품이 없습니다.');
                return;
            }

            const saleData = {
                products: this.selectedProducts.map(p => ({
                    productId: p._id,
                    quantity: p.quantity,
                    price: p.sellingPrice
                })),
                userId: currentUser._id,
                date: new Date()
            };

            // 판매 데이터 저장
            const saleResponse = await fetch('/api/dental-product-sales', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(saleData)
            });

            if (!saleResponse.ok) {
                throw new Error('판매 등록에 실패했습니다.');
            }

            // 각 제품에 대해 재고 출고 처리
            for (const product of this.selectedProducts) {
                const stockOutResponse = await fetch(`/api/dental-products/${product._id}/stock-out`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        quantity: product.quantity,
                        reason: '판매',
                        notes: '환자 판매'
                    })
                });

                if (!stockOutResponse.ok) {
                    console.error(`${product.name} 재고 출고 처리 실패`);
                }
            }

            this.selectedProducts = [];
            this.renderSelectedProducts();
            this.loadSalesHistory();
            alert('판매가 완료되었습니다.');

        } catch (error) {
            console.error('판매 저장 중 에러:', error);
            alert(error.message);
        }
    }
} 