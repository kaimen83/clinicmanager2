// 1st OP 모달 클래스 정의
import { modalManager } from '../modalManager.js';

export class FirstOpModal {
    constructor() {
        this.modal = null;
        this.implantRows = [];
        this.fixtureRows = [];
    }

    // 모달 표시
    async show(transactionData) {
        try {
            // 제조사 목록 가져오기 - URL 수정
            const manufacturersResponse = await fetch('/api/implantproducts/manufacturers', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!manufacturersResponse.ok) {
                throw new Error('제조사 목록을 가져오는데 실패했습니다.');
            }
            
            const { manufacturers } = await manufacturersResponse.json();

            // 이식재 목록 가져오기
            const fixturesResponse = await fetch('/api/implantproducts/fixtures', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!fixturesResponse.ok) {
                throw new Error('이식재 목록을 가져오는데 실패했습니다.');
            }

            const { fixtures = [] } = await fixturesResponse.json();

            // 모달 생성
            this.modal = document.createElement('div');
            this.modal.className = 'modal first-op-modal';
            this.modal.style.display = 'block';
            
            // 기본 모달 구조 생성
            this.modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>1st OP 정보</h3>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="first-op-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="op-date">날짜</label>
                                    <input type="date" id="op-date" name="date" required value="${transactionData.date || new Date().toISOString().split('T')[0]}">
                                </div>
                                <div class="form-group">
                                    <label for="op-chart-number">차트번호</label>
                                    <input type="text" id="op-chart-number" value="${transactionData.chartNumber}" readonly>
                                </div>
                                <div class="form-group">
                                    <label for="op-patient-name">환자명</label>
                                    <input type="text" id="op-patient-name" value="${transactionData.patientName}" readonly>
                                </div>
                                <div class="form-group">
                                    <label for="op-doctor">진료의사</label>
                                    <input type="text" id="op-doctor" value="${transactionData.doctor}" readonly>
                                </div>
                            </div>

                            <!-- 임플란트 섹션 -->
                            <div class="section-implant">
                                <h4>임플란트 사용량</h4>
                                <div id="implant-container">
                                    <!-- 동적으로 추가될 임플란트 행들 -->
                                </div>
                                <button type="button" class="add-row-btn" onclick="this.closest('.first-op-modal').querySelector('#implant-container').dispatchEvent(new CustomEvent('addRow'))">
                                    + 임플란트 추가
                                </button>
                            </div>

                            <!-- 이식재 섹션 -->
                            <div class="section-fixture">
                                <h4>이식재 사용량</h4>
                                <div id="fixture-container">
                                    <!-- 동적으로 추가될 이식재 행들 -->
                                </div>
                                <button type="button" class="add-row-btn" onclick="this.closest('.first-op-modal').querySelector('#fixture-container').dispatchEvent(new CustomEvent('addRow'))">
                                    + 이식재 추가
                                </button>
                            </div>

                            <div class="form-actions">
                                <button type="submit">저장</button>
                                <button type="button" class="cancel-btn">취소</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            // 모달을 body에 추가
            document.body.appendChild(this.modal);

            // 모달 매니저에 등록
            modalManager.pushModal(this);

            // 이벤트 리스너 등록
            this.modal.querySelector('.close-btn').addEventListener('click', () => this.close());
            this.modal.querySelector('.cancel-btn').addEventListener('click', () => this.close());

            // 임플란트 행 추가 이벤트 리스너
            this.modal.querySelector('#implant-container').addEventListener('addRow', () => {
                this.addImplantRow(manufacturers);
            });

            // 이식재 행 추가 이벤트 리스너
            this.modal.querySelector('#fixture-container').addEventListener('addRow', () => {
                this.addFixtureRow(fixtures);
            });

            // 폼 제출 이벤트 리스너 추가
            this.modal.querySelector('#first-op-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSubmit(e, transactionData);
            });

            // 초기 행 추가
            this.addImplantRow(manufacturers);
            this.addFixtureRow(fixtures);

        } catch (error) {
            console.error('1st OP 모달 생성 중 에러:', error);
            alert('1st OP 모달을 생성하는데 실패했습니다.');
        }
    }

    // 임플란트 행 추가
    addImplantRow(manufacturers = []) {
        const container = this.modal.querySelector('#implant-container');
        const rowId = `implant-row-${this.implantRows.length}`;
        
        const row = document.createElement('div');
        row.className = 'usage-row';
        row.id = rowId;
        row.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <select name="implant-manufacturer" onchange="this.closest('.usage-row').dispatchEvent(new CustomEvent('manufacturerChange', {detail: this.value}))">
                        <option value="">제조사 선택</option>
                        ${Array.isArray(manufacturers) ? manufacturers.map(m => `<option value="${m}">${m}</option>`).join('') : ''}
                    </select>
                </div>
                <div class="form-group">
                    <select name="implant-specification" disabled>
                        <option value="">규격 선택</option>
                    </select>
                </div>
                <div class="form-group">
                    <input type="number" name="implant-quantity" min="1" placeholder="수량">
                </div>
                <button type="button" class="remove-row-btn" onclick="this.closest('.usage-row').remove()">삭제</button>
            </div>
        `;

        // 제조사 변경 이벤트 리스너 추가
        row.addEventListener('manufacturerChange', async (event) => {
            const manufacturer = event.detail;
            const specificationSelect = row.querySelector('[name="implant-specification"]');
            
            if (!manufacturer) {
                specificationSelect.innerHTML = '<option value="">규격 선택</option>';
                specificationSelect.disabled = true;
                return;
            }

            try {
                const specifications = await this.loadSpecifications(manufacturer);

                specificationSelect.innerHTML = `
                    <option value="">규격 선택</option>
                    ${specifications.map(spec => `<option value="${spec}">${spec}</option>`).join('')}
                `;
                specificationSelect.disabled = false;
            } catch (error) {
                console.error('규격 목록 조회 중 에러:', error);
                alert('규격 목록을 불러오는데 실패했습니다.');
            }
        });
        
        container.appendChild(row);
        this.implantRows.push(rowId);
    }

    // 이식재 행 추가
    addFixtureRow(fixtures = []) {
        const container = this.modal.querySelector('#fixture-container');
        const rowId = `fixture-row-${this.fixtureRows.length}`;
        
        const row = document.createElement('div');
        row.className = 'usage-row';
        row.id = rowId;
        row.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <select name="fixture-type" onchange="this.closest('.usage-row').dispatchEvent(new CustomEvent('fixtureChange', {detail: this.value}))">
                        <option value="">이식재 선택</option>
                        ${Array.isArray(fixtures) ? fixtures.map(f => `<option value="${f}">${f}</option>`).join('') : ''}
                    </select>
                </div>
                <div class="form-group">
                    <select name="fixture-specification" disabled>
                        <option value="">규격 선택</option>
                    </select>
                </div>
                <div class="form-group">
                    <input type="number" name="fixture-quantity" min="1" placeholder="수량">
                </div>
                <button type="button" class="remove-row-btn" onclick="this.closest('.usage-row').remove()">삭제</button>
            </div>
        `;

        // 이식재 변경 이벤트 리스너 추가
        row.addEventListener('fixtureChange', async (event) => {
            const fixtureName = event.detail;
            const specificationSelect = row.querySelector('[name="fixture-specification"]');
            
            if (!fixtureName) {
                specificationSelect.innerHTML = '<option value="">규격 선택</option>';
                specificationSelect.disabled = true;
                return;
            }

            try {
                // 이식재 전체 목록 조회
                const response = await fetch('/api/implantproducts', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) {
                    throw new Error('이식재 정보를 불러오는데 실패했습니다.');
                }

                const products = await response.json();
                
                // 선택된 이식재와 동일한 이름을 가진 제품들 필터링 (카테고리가 '이식재'인 것들 중에서)
                const selectedFixtures = products.filter(p => 
                    p.category === '이식재' && 
                    p.name === fixtureName
                );

                // 규격이 있는 제품이 있는지 확인
                const hasSpecifications = selectedFixtures.some(p => p.specification);

                if (hasSpecifications) {
                    // 규격이 있는 경우, 규격 목록 표시
                    const specifications = selectedFixtures
                        .filter(p => p.specification)
                        .map(p => p.specification);

                    specificationSelect.innerHTML = `
                        <option value="">규격 선택</option>
                        ${specifications.map(spec => `<option value="${spec}">${spec}</option>`).join('')}
                    `;
                    specificationSelect.disabled = false;
                } else {
                    // 규격이 없는 경우, 선택상자 비활성화
                    specificationSelect.innerHTML = '<option value="">규격 없음</option>';
                    specificationSelect.disabled = true;
                }
            } catch (error) {
                console.error('이식재 정보 조회 중 에러:', error);
                alert('이식재 정보를 불러오는데 실패했습니다.');
                specificationSelect.innerHTML = '<option value="">규격 선택</option>';
                specificationSelect.disabled = true;
            }
        });
        
        container.appendChild(row);
        this.fixtureRows.push(rowId);
    }

    // 폼 제출 처리
    async handleSubmit(event, transactionData) {
        try {
            event.preventDefault();
            const form = event.target;

            // 기본 데이터 검증
            const date = form.querySelector('#op-date')?.value;
            const chartNumber = form.querySelector('#op-chart-number')?.value;
            const patientName = form.querySelector('#op-patient-name')?.value;
            const doctor = form.querySelector('#op-doctor')?.value;

            if (!date || !chartNumber || !patientName) {
                throw new Error('날짜, 차트번호, 환자명은 필수 입력 사항입니다.');
            }

            // 임플란트 데이터 수집 및 출고 처리
            let implants = [];
            const implantRows = form.querySelectorAll('#implant-container .usage-row');
            for (const row of implantRows) {
                const manufacturer = row.querySelector('[name="implant-manufacturer"]')?.value?.trim();
                const specification = row.querySelector('[name="implant-specification"]')?.value?.trim() || null;
                const quantityStr = row.querySelector('[name="implant-quantity"]')?.value;
                const quantity = parseInt(quantityStr);

                if (manufacturer && !isNaN(quantity) && quantity > 0) {
                    // 해당 제품 ID 조회
                    try {
                        const productResponse = await fetch('/api/implantproducts', {
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            }
                        });
                        const products = await productResponse.json();
                        const product = products.find(p => 
                            p.category === 'fixture' && 
                            p.name === manufacturer && 
                            (specification ? p.specification === specification : !p.specification)
                        );

                        if (!product) {
                            throw new Error(`임플란트 제품을 찾을 수 없습니다: ${manufacturer}${specification ? ` ${specification}` : ''}`);
                        }

                        // 출고 처리
                        const stockOutResponse = await fetch(`/api/implantproducts/${product._id}/stock-out`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            },
                            body: JSON.stringify({
                                quantity,
                                chartNumber,
                                patientName,
                                doctor,
                                outReason: '환자사용',
                                notes: '1st OP 사용',
                                date: date
                            })
                        });

                        if (!stockOutResponse.ok) {
                            const errorData = await stockOutResponse.json();
                            throw new Error(errorData.message || '출고 처리 실패');
                        }

                        implants.push({ manufacturer, specification, quantity });
                    } catch (error) {
                        throw new Error(`임플란트 출고 처리 중 오류: ${error.message}`);
                    }
                }
            }

            // 이식재 데이터 수집 및 출고 처리
            let fixtures = [];
            const fixtureRows = form.querySelectorAll('#fixture-container .usage-row');
            for (const row of fixtureRows) {
                const type = row.querySelector('[name="fixture-type"]')?.value?.trim();
                const specification = row.querySelector('[name="fixture-specification"]')?.value?.trim() || null;
                const quantityStr = row.querySelector('[name="fixture-quantity"]')?.value;
                const quantity = parseInt(quantityStr);

                if (type && !isNaN(quantity) && quantity > 0) {
                    // 해당 제품 ID 조회
                    try {
                        const productResponse = await fetch('/api/implantproducts', {
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            }
                        });
                        const products = await productResponse.json();
                        const product = products.find(p => 
                            p.category === '이식재' && 
                            p.name === type && 
                            (specification ? p.specification === specification : !p.specification)
                        );

                        if (!product) {
                            throw new Error(`이식재 제품을 찾을 수 없습니다: ${type}${specification ? ` ${specification}` : ''}`);
                        }

                        // 출고 처리
                        const stockOutResponse = await fetch(`/api/implantproducts/${product._id}/stock-out`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            },
                            body: JSON.stringify({
                                quantity,
                                chartNumber,
                                patientName,
                                doctor,
                                outReason: '환자사용',
                                notes: '1st OP 사용',
                                date: date
                            })
                        });

                        if (!stockOutResponse.ok) {
                            const errorData = await stockOutResponse.json();
                            throw new Error(errorData.message || '출고 처리 실패');
                        }

                        fixtures.push({ type, specification, quantity });
                    } catch (error) {
                        throw new Error(`이식재 출고 처리 중 오류: ${error.message}`);
                    }
                }
            }

            // 최소 하나의 데이터가 있는지 확인
            if (implants.length === 0 && fixtures.length === 0) {
                throw new Error('임플란트 또는 이식재 정보 중 최소 하나는 입력해야 합니다.');
            }

            // 요청 데이터 구성
            const firstOpData = {
                date,
                chartNumber,
                patientName,
                doctor,
                implants,
                fixtures
            };

            // API 요청
            const response = await fetch('/api/first-op', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(firstOpData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || '1st OP 정보 저장에 실패했습니다.');
            }

            // 1st OP 모달만 닫기
            this.modal.remove();
            alert('1st OP 정보가 저장되었습니다.');

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

    async loadSpecifications(manufacturer) {
        try {
            // 규격 목록 가져오기 - URL 수정
            const response = await fetch(`/api/implantproducts/specifications/${manufacturer}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('규격 목록을 가져오는데 실패했습니다.');
            }

            const specifications = await response.json();
            return specifications;
        } catch (error) {
            console.error('규격 목록 로드 중 에러:', error);
            throw error;
        }
    }
} 