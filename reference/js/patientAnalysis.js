class PatientAnalysis {
    constructor() {
        this.selectedPeriods = new Set(['prev', 'prev-year']);
        this.initialized = false;
        this.periodType = 'month';
        this.useGroups = false;
        this.periodLabels = {
            month: {
                'prev': '직전 월',
                'prev-year': '전년 동월',
                'prev-2year': '2년전 동월',
                'prev-3year': '3년전 동월'
            },
            quarter: {
                'prev': '직전 분기',
                'prev-year': '전년 동분기',
                'prev-2year': '2년전 동분기',
                'prev-3year': '3년전 동분기'
            },
            year: {
                'prev': '직전 연도',
                'prev-year': '2년전',
                'prev-2year': '3년전'
            }
        };
    }

    async initialize() {
        if (this.initialized) return;
        try {
            // 연도 선택 옵션 초기화
            this.initializeYearOptions();
            
            // 기본값 설정
            const now = new Date();
            const baseMonth = document.getElementById('patient-base-month');
            baseMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            
            document.getElementById('patient-quarter-year').value = now.getFullYear();
            document.getElementById('patient-quarter').value = Math.floor(now.getMonth() / 3) + 1;
            document.getElementById('patient-base-year').value = now.getFullYear();

            // 테이블 구조 초기화
            this.initializeTableStructure();

            // 기준단위 초기화
            const periodTypeSelect = document.getElementById('patient-period-type-select');
            if (periodTypeSelect) {
                periodTypeSelect.value = this.periodType;
            }

            // 대분류 그룹 관리 버튼 추가
            this.addGroupManagementButton();
            
            // 대분류/개별 보기 토글 버튼 추가
            this.addViewToggleButton();

            this.setupEventListeners();
            this.updatePeriodSelector();
            this.updateComparisonButtons();
            await this.loadData();
            this.initialized = true;
        } catch (error) {
            console.error('환자분석 초기화 중 에러:', error);
        }
    }

    initializeYearOptions() {
        const currentYear = new Date().getFullYear();
        const years = Array.from({length: 5}, (_, i) => currentYear - i);
        
        const yearSelects = ['patient-quarter-year', 'patient-base-year'];
        yearSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            select.innerHTML = years.map(year => 
                `<option value="${year}">${year}년</option>`
            ).join('');
        });
    }

    setupEventListeners() {
        // 기간 단위 변경 이벤트
        const periodTypeSelect = document.getElementById('patient-period-type-select');
        if (periodTypeSelect) {
            periodTypeSelect.addEventListener('change', (e) => {
                this.periodType = e.target.value;
                this.selectedPeriods.clear();
                this.updatePeriodSelector();
                this.updateComparisonButtons();
                this.loadData();
            });
        }

        // 기간 선택 이벤트
        ['patient-base-month', 'patient-quarter-year', 'patient-quarter', 'patient-base-year'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.loadData());
            }
        });
    }

    updatePeriodSelector() {
        const selectors = {
            month: document.getElementById('patient-base-month'),
            quarter: document.getElementById('patient-quarter-select'),
            year: document.getElementById('patient-base-year')
        };

        Object.entries(selectors).forEach(([type, element]) => {
            element.style.display = type === this.periodType ? '' : 'none';
        });
    }

    getCurrentPeriod() {
        switch (this.periodType) {
            case 'month': {
                const [year, month] = document.getElementById('patient-base-month').value.split('-').map(Number);
                return { year, month };
            }
            case 'quarter': {
                const year = Number(document.getElementById('patient-quarter-year').value);
                const quarter = Number(document.getElementById('patient-quarter').value);
                return { year, quarter };
            }
            case 'year': {
                const year = Number(document.getElementById('patient-base-year').value);
                return { year };
            }
        }
    }

    async loadData() {
        try {
            const period = this.getCurrentPeriod();
            
            const response = await fetch('/api/patient-analysis/analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    periodType: this.periodType,
                    ...period,
                    comparePeriods: Array.from(this.selectedPeriods),
                    useGroups: this.useGroups
                })
            });

            if (!response.ok) throw new Error('데이터 로드 실패');
            const data = await response.json();
            this.updateTable(data);
        } catch (error) {
            console.error('데이터 로드 중 에러:', error);
        }
    }

    createTableHeaders() {
        const baseHeaders = `
            <tr>
                <th class="path-header" rowspan="2" style="min-width: 100px; max-width: 200px;">내원경로</th>
                <th class="current-header" colspan="5">현재</th>
                ${Array.from(this.selectedPeriods).map(period => `
                    <th class="comparison-header" colspan="5">${this.periodLabels[this.periodType][period]}</th>
                `).join('')}
            </tr>
            <tr>
                <th class="current-header">총환자수</th>
                <th class="current-header">신환</th>
                <th class="current-header">재진</th>
                <th class="current-header">결제금액</th>
                <th class="current-header">상담금액</th>
                ${Array.from(this.selectedPeriods).map(() => `
                    <th class="comparison-header">총환자수</th>
                    <th class="comparison-header">신환</th>
                    <th class="comparison-header">재진</th>
                    <th class="comparison-header">결제금액</th>
                    <th class="comparison-header">상담금액</th>
                `).join('')}
            </tr>
        `;
        return baseHeaders;
    }

    updateTable(data) {
        const tbody = document.getElementById('patient-analysis-data');
        const thead = document.getElementById('patient-analysis-header');
        if (!tbody || !thead) return;

        // 테이블 헤더 업데이트
        thead.innerHTML = this.createTableHeaders();

        let rows = '';

        // 합계 계산을 위한 변수들
        const totals = {
            current: {
                totalPatientCount: 0,
                newPatientCount: 0,
                revisitCount: 0,
                paymentAmount: 0,
                totalConsultationAmount: 0
            }
        };

        // 비교 기간별 합계 초기화
        Array.from(this.selectedPeriods).forEach(period => {
            totals[period] = {
                totalPatientCount: 0,
                newPatientCount: 0,
                revisitCount: 0,
                paymentAmount: 0,
                totalConsultationAmount: 0
            };
        });

        if (data.isGrouped) {
            // 대분류 보기일 때의 합계 계산
            data.current.forEach(item => {
                if (item.isGroup) {
                    // 대분류 그룹 데이터
                    totals.current.totalPatientCount += item.totalPatientCount;
                    totals.current.newPatientCount += item.newPatientCount;
                    totals.current.revisitCount += item.revisitCount;
                    totals.current.paymentAmount += item.paymentAmount;
                    totals.current.totalConsultationAmount += item.totalConsultationAmount;
                } else {
                    // 그룹에 속하지 않은 개별 데이터
                    totals.current.totalPatientCount += item.totalPatientCount;
                    totals.current.newPatientCount += item.newPatientCount;
                    totals.current.revisitCount += item.revisitCount;
                    totals.current.paymentAmount += item.paymentAmount;
                    totals.current.totalConsultationAmount += item.totalConsultationAmount;
                }
            });

            // 비교 기간 데이터 합계 계산
            Array.from(this.selectedPeriods).forEach(period => {
                if (data.comparisons[period]) {
                    data.comparisons[period].forEach(item => {
                        if (item.isGroup) {
                            // 대분류 그룹 데이터
                            totals[period].totalPatientCount += item.totalPatientCount;
                            totals[period].newPatientCount += item.newPatientCount;
                            totals[period].revisitCount += item.revisitCount;
                            totals[period].paymentAmount += item.paymentAmount;
                            totals[period].totalConsultationAmount += item.totalConsultationAmount;
                        } else {
                            // 그룹에 속하지 않은 개별 데이터
                            totals[period].totalPatientCount += item.totalPatientCount;
                            totals[period].newPatientCount += item.newPatientCount;
                            totals[period].revisitCount += item.revisitCount;
                            totals[period].paymentAmount += item.paymentAmount;
                            totals[period].totalConsultationAmount += item.totalConsultationAmount;
                        }
                    });
                }
            });
        } else {
            // 개별 보기일 때의 합계 계산
            data.current.forEach(item => {
                totals.current.totalPatientCount += item.totalPatientCount;
                totals.current.newPatientCount += item.newPatientCount;
                totals.current.revisitCount += item.revisitCount;
                totals.current.paymentAmount += item.paymentAmount;
                totals.current.totalConsultationAmount += item.totalConsultationAmount;
            });

            // 비교 기간 데이터 합계 계산
            Array.from(this.selectedPeriods).forEach(period => {
                if (data.comparisons[period]) {
                    data.comparisons[period].forEach(item => {
                        totals[period].totalPatientCount += item.totalPatientCount;
                        totals[period].newPatientCount += item.newPatientCount;
                        totals[period].revisitCount += item.revisitCount;
                        totals[period].paymentAmount += item.paymentAmount;
                        totals[period].totalConsultationAmount += item.totalConsultationAmount;
                    });
                }
            });
        }

        // 디버깅을 위한 로그 추가
        console.log('Data:', data);
        console.log('Totals:', totals);
        
        if (data.isGrouped) {
            rows = data.current.map(item => {
                if (item.isGroup) {
                    // 대분류 그룹 데이터 렌더링
                    const row = [`
                        <td class="path-cell" style="min-width: 100px; max-width: 200px;">
                            <div class="group-header">
                                <span class="group-name">
                                    <i class="fas fa-folder"></i>
                                    ${item.visitPath || '미분류'}
                                </span>
                                <button class="toggle-details-btn" data-group-id="${item.groupId}">
                                    <i class="fas fa-chevron-down"></i>
                                </button>
                            </div>
                        </td>
                    `];

                    // 현재 데이터 추가
                    row.push(
                        `<td class="number-cell">${item.totalPatientCount.toLocaleString()}</td>`,
                        `<td class="number-cell">${item.newPatientCount.toLocaleString()}</td>`,
                        `<td class="number-cell">${item.revisitCount.toLocaleString()}</td>`,
                        `<td class="number-cell">${item.paymentAmount.toLocaleString()}</td>`,
                        `<td class="number-cell">${item.totalConsultationAmount.toLocaleString()}</td>`
                    );

                    // 비교 데이터 추가
                    Array.from(this.selectedPeriods).forEach(period => {
                        console.log('=== 그룹 데이터 비교 ===');
                        console.log('Period:', period);
                        console.log('Group ID:', item.groupId);
                        console.log('Group Path:', item.visitPath);
                        console.log('Is Group:', item.isGroup);
                        console.log('Comparison Data:', data.comparisons[period]);
                        
                        const comparison = data.comparisons[period]?.find(comp => {
                            console.log('Checking comparison:', comp);
                            console.log('Comp isGroup:', comp.isGroup);
                            console.log('Comp groupId:', comp.groupId);
                            return comp.isGroup && comp.groupId === item.groupId;
                        });
                        
                        console.log('Found Comparison:', comparison);
                        
                        if (comparison) {
                            row.push(
                                this.generateComparisonCell(item.totalPatientCount, comparison.totalPatientCount),
                                this.generateComparisonCell(item.newPatientCount, comparison.newPatientCount),
                                this.generateComparisonCell(item.revisitCount, comparison.revisitCount),
                                this.generateComparisonCell(item.paymentAmount, comparison.paymentAmount),
                                this.generateComparisonCell(item.totalConsultationAmount, comparison.totalConsultationAmount)
                            );
                        } else {
                            row.push(
                                '<td class="number-cell no-data">-</td>'.repeat(5)
                            );
                        }
                    });

                    // 상세 데이터 행 추가
                    const detailsRow = `
                        <tr class="group-details" data-group-id="${item.groupId}" style="display: none;">
                            <td colspan="${5 + (this.selectedPeriods.size * 5)}">
                                <table class="patient-analysis-table">
                                    <tbody>
                                        ${item.details.map(detail => {
                                            const detailRow = [`
                                                <td class="path-cell">
                                                    <div class="individual-path">
                                                        <i class="fas fa-tag"></i>
                                                        ${detail.visitPath || '미분류'}
                                                    </div>
                                                </td>
                                            `];

                                            // 현재 데이터 추가
                                            detailRow.push(
                                                `<td class="number-cell">${detail.totalPatientCount.toLocaleString()}</td>`,
                                                `<td class="number-cell">${detail.newPatientCount.toLocaleString()}</td>`,
                                                `<td class="number-cell">${detail.revisitCount.toLocaleString()}</td>`,
                                                `<td class="number-cell">${detail.paymentAmount.toLocaleString()}</td>`,
                                                `<td class="number-cell">${detail.totalConsultationAmount.toLocaleString()}</td>`
                                            );

                                            // 비교 데이터 추가
                                            Array.from(this.selectedPeriods).forEach(period => {
                                                console.log('\n=== 그룹 상세 데이터 비교 시작 ===');
                                                console.log('Period:', period);
                                                console.log('Detail Path:', detail.visitPath);
                                                console.log('Detail Data:', detail);
                                                console.log('All Comparison Data:', data.comparisons[period]);
                                                
                                                // 대분류 그룹에서 세부 데이터 찾기
                                                const comparison = data.comparisons[period]?.find(comp => {
                                                    if (comp.isGroup) {
                                                        // 대분류인 경우 details 배열에서 찾기
                                                        return comp.details?.some(d => (d.visitPath?.trim() || '미분류') === (detail.visitPath?.trim() || '미분류'));
                                                    } else {
                                                        // 개별 데이터인 경우 직접 비교
                                                        return (comp.visitPath?.trim() || '미분류') === (detail.visitPath?.trim() || '미분류');
                                                    }
                                                });

                                                // 실제 비교할 데이터 찾기
                                                let comparisonData = comparison;
                                                if (comparison?.isGroup) {
                                                    // 대분류인 경우 details에서 해당 데이터 찾기
                                                    comparisonData = comparison.details.find(d => 
                                                        (d.visitPath?.trim() || '미분류') === (detail.visitPath?.trim() || '미분류')
                                                    );
                                                }

                                                console.log('\nFinal Comparison Result:', comparisonData);
                                                console.log('=== 그룹 상세 데이터 비교 종료 ===\n');

                                                if (comparisonData) {
                                                    detailRow.push(
                                                        this.generateComparisonCell(detail.totalPatientCount, comparisonData.totalPatientCount),
                                                        this.generateComparisonCell(detail.newPatientCount, comparisonData.newPatientCount),
                                                        this.generateComparisonCell(detail.revisitCount, comparisonData.revisitCount),
                                                        this.generateComparisonCell(detail.paymentAmount, comparisonData.paymentAmount),
                                                        this.generateComparisonCell(detail.totalConsultationAmount, comparisonData.totalConsultationAmount)
                                                    );
                                                } else {
                                                    detailRow.push(
                                                        '<td class="number-cell no-data">-</td>'.repeat(5)
                                                    );
                                                }
                                            });

                                            return `<tr class="individual-row">${detailRow.join('')}</tr>`;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    `;

                    return `<tr class="group-row">${row.join('')}</tr>${detailsRow}`;
                } else {
                    // 개별 데이터 렌더링
                    const row = [`
                        <td class="path-cell" style="min-width: 100px; max-width: 200px;">
                            <div class="individual-path">
                                <i class="fas fa-tag"></i>
                                ${item.visitPath || '미분류'}
                            </div>
                        </td>
                    `];

                    // 현재 데이터 추가
                    row.push(
                        `<td class="number-cell">${item.totalPatientCount.toLocaleString()}</td>`,
                        `<td class="number-cell">${item.newPatientCount.toLocaleString()}</td>`,
                        `<td class="number-cell">${item.revisitCount.toLocaleString()}</td>`,
                        `<td class="number-cell">${item.paymentAmount.toLocaleString()}</td>`,
                        `<td class="number-cell">${item.totalConsultationAmount.toLocaleString()}</td>`
                    );

                    // 비교 데이터 추가
                    Array.from(this.selectedPeriods).forEach(period => {
                        const comparison = data.comparisons[period]?.find(comp => 
                            comp.visitPath === item.visitPath
                        );
                        
                        if (comparison) {
                            row.push(
                                this.generateComparisonCell(item.totalPatientCount, comparison.totalPatientCount),
                                this.generateComparisonCell(item.newPatientCount, comparison.newPatientCount),
                                this.generateComparisonCell(item.revisitCount, comparison.revisitCount),
                                this.generateComparisonCell(item.paymentAmount, comparison.paymentAmount),
                                this.generateComparisonCell(item.totalConsultationAmount, comparison.totalConsultationAmount)
                            );
                        } else {
                            row.push(
                                '<td class="number-cell no-data">-</td>'.repeat(5)
                            );
                        }
                    });

                    return `<tr class="individual-row">${row.join('')}</tr>`;
                }
            }).join('');
        } else {
            rows = data.current.map(current => {
                const row = [`<td class="path-cell">${current.visitPath || '미분류'}</td>`];
                
                // 현재 데이터 추가
                row.push(
                    `<td class="number-cell">${current.totalPatientCount.toLocaleString()}</td>`,
                    `<td class="number-cell">${current.newPatientCount.toLocaleString()}</td>`,
                    `<td class="number-cell">${current.revisitCount.toLocaleString()}</td>`,
                    `<td class="number-cell">${current.paymentAmount.toLocaleString()}</td>`,
                    `<td class="number-cell">${current.totalConsultationAmount.toLocaleString()}</td>`
                );

                // 비교 데이터 추가
                Array.from(this.selectedPeriods).forEach(period => {
                    const comparison = data.comparisons[period]?.find(comp => 
                        (comp.visitPath || '미분류') === (current.visitPath || '미분류')
                    );
                    if (comparison) {
                        row.push(
                            this.generateComparisonCell(current.totalPatientCount, comparison.totalPatientCount),
                            this.generateComparisonCell(current.newPatientCount, comparison.newPatientCount),
                            this.generateComparisonCell(current.revisitCount, comparison.revisitCount),
                            this.generateComparisonCell(current.paymentAmount, comparison.paymentAmount),
                            this.generateComparisonCell(current.totalConsultationAmount, comparison.totalConsultationAmount)
                        );
                    } else {
                        row.push(
                            '<td class="number-cell no-data">-</td>',
                            '<td class="number-cell no-data">-</td>',
                            '<td class="number-cell no-data">-</td>',
                            '<td class="number-cell no-data">-</td>',
                            '<td class="number-cell no-data">-</td>'
                        );
                    }
                });

                return `<tr>${row.join('')}</tr>`;
            }).join('');
        }

        // 합계 행 추가
        const totalRow = [`<tr class="total-row"><td class="path-cell"><strong>합계</strong></td>`];
        
        // 현재 데이터 합계
        totalRow.push(
            `<td class="number-cell"><strong>${totals.current.totalPatientCount.toLocaleString()}</strong></td>`,
            `<td class="number-cell"><strong>${totals.current.newPatientCount.toLocaleString()}</strong></td>`,
            `<td class="number-cell"><strong>${totals.current.revisitCount.toLocaleString()}</strong></td>`,
            `<td class="number-cell"><strong>${totals.current.paymentAmount.toLocaleString()}</strong></td>`,
            `<td class="number-cell"><strong>${totals.current.totalConsultationAmount.toLocaleString()}</strong></td>`
        );

        // 비교 데이터 합계
        Array.from(this.selectedPeriods).forEach(period => {
            totalRow.push(
                `<td class="number-cell"><strong>${totals[period].totalPatientCount.toLocaleString()}</strong></td>`,
                `<td class="number-cell"><strong>${totals[period].newPatientCount.toLocaleString()}</strong></td>`,
                `<td class="number-cell"><strong>${totals[period].revisitCount.toLocaleString()}</strong></td>`,
                `<td class="number-cell"><strong>${totals[period].paymentAmount.toLocaleString()}</strong></td>`,
                `<td class="number-cell"><strong>${totals[period].totalConsultationAmount.toLocaleString()}</strong></td>`
            );
        });

        totalRow.push('</tr>');

        tbody.innerHTML = rows || '<tr><td colspan="25" class="no-data">데이터가 없습니다.</td></tr>';
        tbody.insertAdjacentHTML('beforeend', totalRow.join(''));

        // 그룹 상세 토글 버튼 이벤트 리스너
        if (data.isGrouped) {
            tbody.querySelectorAll('.toggle-details-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const groupId = btn.dataset.groupId;
                    const detailsRow = tbody.querySelector(`.group-details[data-group-id="${groupId}"]`);
                    const icon = btn.querySelector('i');
                    
                    if (detailsRow.style.display === 'none') {
                        detailsRow.style.display = 'table-row';
                        icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
                    } else {
                        detailsRow.style.display = 'none';
                        icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
                    }
                });
            });
        }
    }

    generateComparisonCell(current, comparison) {
        if (!comparison) return '<td class="number-cell no-data">-</td>';

        const change = ((current - comparison) / comparison * 100).toFixed(1);
        const changeClass = change > 0 ? 'increase' : change < 0 ? 'decrease' : '';
        const arrow = change > 0 ? '▲' : change < 0 ? '▼' : '';

        return `
            <td class="number-cell ${changeClass}">
                ${comparison.toLocaleString()}
                <span class="change-rate">
                    ${arrow} ${Math.abs(change)}%
                </span>
            </td>
        `;
    }

    updateComparisonButtons() {
        const buttonContainer = document.getElementById('patient-comparison-buttons');
        if (!buttonContainer) return;

        // 기준단위별 비교기간 버튼 설정
        const comparisonButtons = {
            month: [
                { period: 'prev', label: '직전 월' },
                { period: 'prev-year', label: '전년' },
                { period: 'prev-2year', label: '2년전' },
                { period: 'prev-3year', label: '3년전' }
            ],
            quarter: [
                { period: 'prev', label: '직전 분기' },
                { period: 'prev-year', label: '전년' },
                { period: 'prev-2year', label: '2년전' },
                { period: 'prev-3year', label: '3년전' }
            ],
            year: [
                { period: 'prev', label: '직전 연도' },
                { period: 'prev-year', label: '2년전' },
                { period: 'prev-2year', label: '3년전' }
            ]
        };

        // 선택된 기준단위에 맞는 버튼 생성
        const buttons = comparisonButtons[this.periodType].map(({ period, label }) => `
            <button class="filter-btn ${this.selectedPeriods.has(period) ? 'active' : ''}" 
                    data-period="${period}">${label}</button>
        `).join('');
        
        buttonContainer.innerHTML = buttons;

        // 이벤트 리스너 설정
        document.querySelectorAll('#patient-comparison-buttons .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const period = btn.dataset.period;
                if (btn.classList.contains('active')) {
                    btn.classList.remove('active');
                    this.selectedPeriods.delete(period);
                } else {
                    btn.classList.add('active');
                    this.selectedPeriods.add(period);
                }
                this.loadData();
            });
        });
    }

    addGroupManagementButton() {
        const headerGrid = document.querySelector('.patient-analysis-header-grid');
        const buttonHtml = `
        <div class="filter-divider"></div>
            <button id="manage-patient-groups-btn" class="filter-btn">
                <i class="fas fa-layer-group"></i> 대분류 관리
            </button>
        `;
        headerGrid.insertAdjacentHTML('beforeend', buttonHtml);

        document.getElementById('manage-patient-groups-btn').addEventListener('click', () => {
            this.showGroupManagementModal();
        });
    }

    addViewToggleButton() {
        const headerGrid = document.querySelector('.patient-analysis-header-grid');
        const buttonHtml = `
            <button id="patient-view-toggle-btn" class="filter-btn">
                <i class="fas fa-list"></i> 개별보기
            </button>
        `;
        headerGrid.insertAdjacentHTML('beforeend', buttonHtml);

        const toggleBtn = document.getElementById('patient-view-toggle-btn');
        toggleBtn.addEventListener('click', () => {
            this.useGroups = !this.useGroups;
            toggleBtn.innerHTML = this.useGroups ? 
                '<i class="fas fa-layer-group"></i> 대분류보기' : 
                '<i class="fas fa-list"></i> 개별보기';
            this.loadData();
        });
    }

    // 테이블 구조 초기화 함수
    initializeTableStructure() {
        const tableWrapper = document.querySelector('.patient-analysis-table-wrapper');
        if (!tableWrapper) return;

        const table = document.createElement('table');
        table.className = 'patient-analysis-table';
        
        const thead = document.createElement('thead');
        thead.id = 'patient-analysis-header';
        
        const tbody = document.createElement('tbody');
        tbody.id = 'patient-analysis-data';
        
        table.appendChild(thead);
        table.appendChild(tbody);
        tableWrapper.innerHTML = '';
        tableWrapper.appendChild(table);
    }

    async showGroupManagementModal() {
        try {
            const groups = await this.loadGroups();
            
            const modalHtml = `
                <div class="patient-analysis-modal" id="group-management-modal">
                    <div class="patient-analysis-modal-content">
                        <div class="modal-header">
                            <h2>
                                <i class="fas fa-layer-group"></i>
                                대분류 그룹 관리
                            </h2>
                            <button class="close-btn">&times;</button>
                        </div>
                        <div class="modal-body">
                            ${groups.length > 0 ? `
                                <div class="group-list">
                                    ${groups.map(group => `
                                        <div class="group-item">
                                            <div class="group-info">
                                                <h3>
                                                    <i class="fas fa-folder"></i>
                                                    ${group.name}
                                                </h3>
                                                <p class="group-description">
                                                    ${group.description || '설명 없음'}
                                                </p>
                                                <div class="visit-paths-list">
                                                    ${group.visitPaths.map(path => 
                                                        `<span class="visit-path-tag">
                                                            <i class="fas fa-tag"></i>
                                                            ${path}
                                                        </span>`
                                                    ).join('')}
                                                </div>
                                            </div>
                                            <div class="group-actions">
                                                <button class="edit-group-btn" data-group-id="${group._id}" title="그룹 수정">
                                                    <i class="fas fa-edit"></i>
                                                    수정
                                                </button>
                                                <button class="delete-group-btn" data-group-id="${group._id}" title="그룹 삭제">
                                                    <i class="fas fa-trash-alt"></i>
                                                    삭제
                                                </button>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `
                                <div class="no-groups-message">
                                    <i class="fas fa-info-circle"></i>
                                    <p>아직 생성된 그룹이 없습니다.</p>
                                </div>
                            `}
                            <button id="add-group-btn" class="add-group-btn">
                                <i class="fas fa-plus"></i>
                                그룹 추가
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // document.body에 모달 추가
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            const modal = document.getElementById('group-management-modal');
            modal.style.display = 'block'; // 모달 표시
            
            // 닫기 버튼
            modal.querySelector('.close-btn').addEventListener('click', () => {
                modal.remove();
            });

            // ESC 키로 모달 닫기
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);

            // 모달 외부 클릭으로 닫기
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });

            // 그룹 추가 버튼
            modal.querySelector('#add-group-btn').addEventListener('click', () => {
                modal.remove();
                this.showGroupEditModal();
            });

            // 그룹 수정 버튼들
            modal.querySelectorAll('.edit-group-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const groupId = btn.dataset.groupId;
                    const group = groups.find(g => g._id === groupId);
                    if (group) {
                        modal.remove();
                        await this.showGroupEditModal(group);
                    }
                });
            });

            // 그룹 삭제 버튼들
            modal.querySelectorAll('.delete-group-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const groupId = btn.dataset.groupId;
                    const group = groups.find(g => g._id === groupId);
                    if (group && await this.confirmDeleteGroup(group)) {
                        await this.deleteGroup(groupId);
                        modal.remove();
                        this.showGroupManagementModal();
                    }
                });
            });
        } catch (error) {
            console.error('대분류 그룹 관리 모달 표시 중 에러:', error);
            alert('대분류 그룹 관리 기능을 불러오는 중 오류가 발생했습니다.');
        }
    }

    async confirmDeleteGroup(group) {
        const visitPathsText = group.visitPaths.join(', ');
        const message = `정말 '${group.name}' 그룹을 삭제하시겠습니까?\n\n포함된 내원경로:\n${visitPathsText}`;
        return confirm(message);
    }

    async deleteGroup(groupId) {
        try {
            const response = await fetch(`/api/visit-path-groups/${groupId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('그룹 삭제 실패');
            }

            await this.loadData();
        } catch (error) {
            console.error('그룹 삭제 중 에러:', error);
            alert('그룹 삭제 중 오류가 발생했습니다.');
        }
    }

    async showGroupEditModal(group = null) {
        try {
            const [visitPaths, usedPathsResponse] = await Promise.all([
                this.loadVisitPaths(),
                this.loadUsedPaths()
            ]);

            const { usedPaths, groupMap } = usedPathsResponse;
            
            const modalHtml = `
                <div class="patient-analysis-modal" id="group-edit-modal">
                    <div class="patient-analysis-modal-content">
                        <div class="modal-header">
                            <h2>
                                <i class="fas fa-layer-group"></i>
                                ${group ? '그룹 수정' : '새 그룹 추가'}
                            </h2>
                            <button class="close-btn">&times;</button>
                        </div>
                        <div class="modal-body">
                            <form id="group-form">
                                <div class="form-group">
                                    <label>
                                        <i class="fas fa-tag"></i>
                                        그룹명
                                    </label>
                                    <input 
                                        type="text" 
                                        name="name" 
                                        value="${group?.name || ''}" 
                                        placeholder="그룹 이름을 입력하세요"
                                        required
                                    >
                                </div>
                                <div class="form-group">
                                    <label>
                                        <i class="fas fa-align-left"></i>
                                        설명
                                    </label>
                                    <textarea 
                                        name="description" 
                                        placeholder="그룹에 대한 설명을 입력하세요"
                                    >${group?.description || ''}</textarea>
                                </div>
                                <div class="form-group">
                                    <label>
                                        <i class="fas fa-list-ul"></i>
                                        내원경로 선택
                                    </label>
                                    <div class="visit-paths-select">
                                        ${visitPaths.map(path => {
                                            const isUsed = usedPaths.includes(path);
                                            const isInCurrentGroup = group?.visitPaths.includes(path);
                                            const isDisabled = isUsed && !isInCurrentGroup;
                                            const usedInGroup = groupMap[path];
                                            
                                            return `
                                                <label class="checkbox-label ${isDisabled ? 'disabled' : ''}">
                                                    <input type="checkbox" 
                                                        name="visitPaths" 
                                                        value="${path}"
                                                        ${isInCurrentGroup ? 'checked' : ''}
                                                        ${isDisabled ? 'disabled' : ''}
                                                    >
                                                    <span class="path-name">${path}</span>
                                                    ${isDisabled ? 
                                                        `<span class="used-path-info">
                                                            <i class="fas fa-info-circle"></i>
                                                            ${usedInGroup.groupName}
                                                        </span>` 
                                                        : ''}
                                                </label>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                                <div class="form-actions">
                                    <button type="submit" class="submit-btn">
                                        <i class="fas fa-save"></i>
                                        저장하기
                                    </button>
                                    <button type="button" class="cancel-btn">
                                        <i class="fas fa-times"></i>
                                        취소
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;

            // document.body에 모달 추가
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            const modal = document.getElementById('group-edit-modal');
            modal.style.display = 'block';
            
            // 폼 제출 이벤트
            modal.querySelector('#group-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const selectedPaths = formData.getAll('visitPaths');

                if (selectedPaths.length === 0) {
                    alert('하나 이상의 내원경로를 선택해주세요.');
                    return;
                }

                const data = {
                    name: formData.get('name'),
                    description: formData.get('description'),
                    visitPaths: selectedPaths
                };

                let success = false;
                if (group) {
                    success = await this.updateGroup(group._id, data);
                } else {
                    success = await this.createGroup(data);
                }

                if (success) {
                    modal.remove();
                    document.getElementById('group-management-modal')?.remove();
                    this.showGroupManagementModal();
                }
            });

            // 닫기 버튼
            modal.querySelector('.close-btn').addEventListener('click', () => {
                modal.remove();
            });

            // 취소 버튼
            modal.querySelector('.cancel-btn').addEventListener('click', () => {
                modal.remove();
            });

            // ESC 키로 모달 닫기
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                }
            });

            // 모달 외부 클릭으로 닫기
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        } catch (error) {
            console.error('그룹 편집 모달 표시 중 에러:', error);
            alert('그룹 편집 화면을 불러오는 중 오류가 발생했습니다.');
        }
    }

    async loadGroups() {
        try {
            const response = await fetch('/api/visit-path-groups', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!response.ok) {
                throw new Error('그룹 목록 로드 실패');
            }
            return await response.json();
        } catch (error) {
            console.error('그룹 목록 로드 중 에러:', error);
            return [];
        }
    }

    async loadVisitPaths() {
        try {
            const response = await fetch('/api/settings/visit-paths', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!response.ok) {
                throw new Error('내원경로 목록 로드 실패');
            }
            return await response.json();
        } catch (error) {
            console.error('내원경로 목록 로드 중 에러:', error);
            return [];
        }
    }

    async createGroup(data) {
        try {
            const response = await fetch('/api/visit-path-groups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (errorData.type === 'PATH_DUPLICATE') {
                    alert(`중복 오류: ${errorData.message}`);
                } else if (errorData.type === 'NAME_DUPLICATE') {
                    alert('이미 존재하는 그룹명입니다.');
                } else {
                    throw new Error('그룹 생성 실패');
                }
                return false;
            }

            return true;
        } catch (error) {
            console.error('그룹 생성 중 에러:', error);
            alert('그룹 생성 중 오류가 발생했습니다.');
            return false;
        }
    }

    async updateGroup(groupId, data) {
        try {
            const response = await fetch(`/api/visit-path-groups/${groupId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (errorData.type === 'PATH_DUPLICATE') {
                    alert(`중복 오류: ${errorData.message}`);
                } else if (errorData.type === 'NAME_DUPLICATE') {
                    alert('이미 존재하는 그룹명입니다.');
                } else {
                    throw new Error('그룹 수정 실패');
                }
                return false;
            }

            return true;
        } catch (error) {
            console.error('그룹 수정 중 에러:', error);
            alert('그룹 수정 중 오류가 발생했습니다.');
            return false;
        }
    }

    async loadUsedPaths() {
        try {
            const response = await fetch('/api/visit-path-groups/used-paths', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!response.ok) {
                throw new Error('사용 중인 내원경로 로드 실패');
            }
            return await response.json();
        } catch (error) {
            console.error('사용 중인 내원경로 로드 중 에러:', error);
            return { usedPaths: [], groupMap: {} };
        }
    }
}

const patientAnalysis = new PatientAnalysis();

export async function loadPatientAnalysis() {
    await patientAnalysis.initialize();
} 