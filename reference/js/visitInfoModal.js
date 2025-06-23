// CSS 파일 로드
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/css/modals/visitInfoModal.css';
document.head.appendChild(link);

import { modalManager } from '../modalManager.js';
import { FirstOpModal } from './firstOpModal.js';
import { DentalProductSaleModal } from './dentalProductSaleModal.js';
import { loadSettings } from '../settings.js';  // loadSettings import 추가

class VisitInfoModal {
    constructor() {
        this.modalContainer = document.createElement('div');
        this.modalContainer.id = 'visitInfoModalContainer';
        document.body.appendChild(this.modalContainer);
        this.loadModalContent();

        // 상담 내역과 수납 내역 저장
        this.consultations = [];
        this.payments = [];

        // 한국 시간 기준 날짜 가져오기
        this.getKoreanDate = (dateString = null) => {
            const date = dateString ? new Date(dateString) : new Date();
            return new Date(date.getTime() + (9 * 60 * 60 * 1000)); // UTC+9 (한국 시간)
        }

        // 한국 시간 기준 날짜 문자열 반환
        this.getKoreanDateString = (date) => {
            return date.toISOString().split('T')[0];
        }

        // 초기 설정
        this.settings = null;
        this.cardCompanyOptions = [];
    }

    async loadModalContent() {
        try {
            const response = await fetch('/html/visitinfo.html');
            const html = await response.text();
            this.modalContainer.innerHTML = html;
            
            this.modal = document.getElementById('visitInfoModal');
            this.form = this.modal.querySelector('#visitInfoForm');
            this.closeBtn = this.modal.querySelector('.visit-info-modal-close');
            this.currentStep = 1;
            this.treatmentGroupTemplate = this.modal.querySelector('.treatment-group').cloneNode(true);
            
            // 환자 이름 입력 필드를 읽기 전용으로 설정
            const patientNameInput = this.modal.querySelector('#patientName');
            if (patientNameInput) {
                patientNameInput.readOnly = true;
                patientNameInput.style.backgroundColor = '#f0f0f0';
            }
            
            this.initializeEventListeners();
            this.initializeFormElements();
        } catch (error) {
            console.error('Failed to load modal content:', error);
        }
    }

    initializeEventListeners() {
        // 모달 열기 버튼 이벤트
        const visitInfoBtn = document.getElementById('visit-info-btn');
        if (visitInfoBtn) {
            visitInfoBtn.addEventListener('click', () => {
                this.show();
            });
        } else {
            console.warn('visit-info-btn 요소를 찾을 수 없습니다.');
        }

        // 모달 닫기 버튼 이벤트
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        // 모달 외부 클릭시 닫기
        window.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.hide();
            }
        });

        // ESC 키로 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'block') {
                this.hide();
            }
        });

        // 네비게이션 버튼 이벤트
        const prevStepBtn = this.modal.querySelector('#prevStep');
        const nextStepBtn = this.modal.querySelector('#nextStep');
        const submitBtn = this.modal.querySelector('#submitForm');

        if (prevStepBtn) {
            prevStepBtn.addEventListener('click', () => this.navigateStep(-1));
        }

        if (nextStepBtn) {
            nextStepBtn.addEventListener('click', () => this.navigateStep(1));
        }

        // 진료 정보 그룹 추가 버튼 이벤트
        const addTreatmentGroupBtn = this.modal.querySelector('#addTreatmentGroup');
        if (addTreatmentGroupBtn) {
            addTreatmentGroupBtn.addEventListener('click', () => this.addTreatmentGroup());
        }

        // 저장 버튼 이벤트
        if (submitBtn) {
            submitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSubmit(e);
            });
        }

        // 폼 제출 이벤트
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit(e);
            });
        }

        // 상담입력 버튼 이벤트
        const addConsultationBtn = this.modal.querySelector('#add-consultation-btn');
        if (addConsultationBtn) {
            addConsultationBtn.addEventListener('click', () => this.showConsultationModal());
        }

        // **이벤트 위임을 사용하여 treatment select의 change 이벤트 처리**
        const treatmentGroupsContainer = this.modal.querySelector('#treatmentGroups');
        if (treatmentGroupsContainer) {
            treatmentGroupsContainer.addEventListener('change', async (e) => {
                if (e.target && e.target.matches('select[name="treatment"]')) {
                    const selectedValue = e.target.value;
                    const treatmentGroup = e.target.closest('.treatment-group');
                    const transactionData = {
                        chartNumber: this.modal.querySelector('#chartNumber').value,
                        patientName: this.modal.querySelector('#patientName').value,
                        date: this.modal.querySelector('#visitDate').value,
                        doctor: treatmentGroup.querySelector('select[name="doctor"]').value
                    };

                    if (selectedValue === '1st OP') {
                        try {
                            const firstOpModal = new FirstOpModal();
                            await firstOpModal.show(transactionData);
                        } catch (error) {
                            console.error('FirstOpModal 처리 중 에러:', error);
                        }
                    } else if (selectedValue === '구강용품') {
                        try {
                            const dentalProductSaleModal = new DentalProductSaleModal();
                            await dentalProductSaleModal.show(transactionData);
                        } catch (error) {
                            console.error('DentalProductSaleModal 처리 중 에러:', error);
                        }
                    }
                }
            });
        } else {
            console.warn('#treatmentGroups 요소를 찾을 수 없습니다.');
        }
    }

    initializeFormElements() {
        // 메인 화면의 선택된 날짜를 가져와서 설정
        const statisticsDate = document.getElementById('statistics-date');
        const visitDateField = this.modal.querySelector('#visitDate');
        
        if (visitDateField) {
            const today = this.getKoreanDate();
            const user = JSON.parse(localStorage.getItem('user'));
            const isAdmin = user && user.role === '관리자';

            if (isAdmin && statisticsDate && statisticsDate.value) {
                // 관리자는 선택된 날짜 사용 가능
                const date = this.getKoreanDate(statisticsDate.value);
                const adjustedDate = this.getKoreanDateString(date);
                visitDateField.value = adjustedDate;
            } else {
                // 관리자가 아니거나 선택된 날짜가 없으면 오늘 날짜 사용
                visitDateField.value = this.getKoreanDateString(today);
            }

            // 관리자가 아닌 경우 날짜 필드 비활성화
            visitDateField.readOnly = !isAdmin;
            visitDateField.style.backgroundColor = !isAdmin ? '#f0f0f0' : 'white';
        }

        // 필수 입력 필드 표시 추가
        const visitDateLabel = this.modal.querySelector('label[for="visitDate"]');
        const chartNumberLabel = this.modal.querySelector('label[for="chartNumber"]');
        const patientNameLabel = this.modal.querySelector('label[for="patientName"]');

        if (visitDateLabel) visitDateLabel.innerHTML = '내원날짜 *';
        if (chartNumberLabel) chartNumberLabel.innerHTML = '차트번호 *';
        if (patientNameLabel) patientNameLabel.innerHTML = '환자 이름 *';

        // 필수 입력 필드 required 속성 추가
        if (visitDateField) visitDateField.required = true;
        if (this.modal.querySelector('#chartNumber')) this.modal.querySelector('#chartNumber').required = true;
        if (this.modal.querySelector('#patientName')) this.modal.querySelector('#patientName').required = true;

        // 첫 번째 진료 정보 그룹의 필수 입력 필드 설정
        const firstGroup = this.modal.querySelector('.treatment-group');
        if (firstGroup) {
            // 필수 입력 필드 설정
            firstGroup.querySelector('select[name="doctor"]').required = true;
            firstGroup.querySelector('select[name="treatment"]').required = true;
            firstGroup.querySelector('select[name="paymentMethod"]').required = true;
            firstGroup.querySelector('input[name="paymentAmount"]').required = true;

            // 라벨에 * 표시 추가
            firstGroup.querySelector('label[for="doctor"]').innerHTML = '진료의사 *';
            firstGroup.querySelector('label[for="treatment"]').innerHTML = '진료내용 *';
            firstGroup.querySelector('label[for="paymentMethod"]').innerHTML = '수납방법 *';
            firstGroup.querySelector('label[for="paymentAmount"]').innerHTML = '수납금액 *';

            firstGroup.querySelector('.remove-group-btn').style.display = 'none';
        }

        // 차트번호 입력 이벤트 리스너 추가
        const chartNumberInput = this.modal.querySelector('#chartNumber');
        if (chartNumberInput) {
            // 이벤트 리스너를 속성으로 저장
            if (!this.chartNumberChangeHandler) {
                this.chartNumberChangeHandler = this.handleChartNumberChange.bind(this);
            }
            // 기존 이벤트 리스너 제거
            chartNumberInput.removeEventListener('change', this.chartNumberChangeHandler);
            // 새로운 이벤트 리스너 추가
            chartNumberInput.addEventListener('change', this.chartNumberChangeHandler);
        }

        // 시스템 설정에서 옵션 데이터 로드
        this.loadSettingsOptions();
    }

    async loadSettingsOptions() {
        try {
            const response = await fetch('/api/settings', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const settings = await response.json();
            
            // 내원경로 옵션 설정
            const visitPathSelect = this.modal.querySelector('#visitPath');
            if (settings.visitPath && visitPathSelect) {
                visitPathSelect.innerHTML = `
                    <option value="">선택하세요</option>
                    ${settings.visitPath.map(path => `<option value="${path}">${path}</option>`).join('')}
                `;
            }

            // 다른 설정 옵션들도 여기서 로드...
            this.settings = settings;

            // 각 설정 데이터 적용
            this.setSelectOptions('visitPath', settings.visitPath || []);
            this.setSelectOptions('doctor', settings.doctor || []);
            this.setSelectOptions('treatment', settings.treatmentType || []);
            this.setSelectOptions('paymentMethod', settings.paymentMethod || []);
            // 카드사 데이터도 저장
            this.cardCompanyOptions = settings.cardCompany || [];

            // 기존 그룹들에 대해 수납방법 이벤트 리스너 추가
            this.modal.querySelectorAll('.treatment-group select[name="paymentMethod"]').forEach(select => {
                select.addEventListener('change', (e) => this.handlePaymentMethodChange(e.target));
                // 초기 상태에 대해서도 handlePaymentMethodChange 실행
                this.handlePaymentMethodChange(select);
            });
        } catch (error) {
            console.error('설정 로드 중 오류 발생:', error);
            this.settings = {
                visitPath: [],
                doctor: [],
                treatmentType: [],
                paymentMethod: [],
                cardCompany: []
            };
            this.cardCompanyOptions = [];
        }
    }

    setSelectOptions(name, options, selectElement = null) {
        const selects = selectElement ? [selectElement] : 
            this.modal.querySelectorAll(`select[name="${name}"], select#${name}`);

        selects.forEach(select => {
            select.innerHTML = '<option value="">선택하세요</option>';
            options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.label || option.value; // label이 있으면 사용
                select.appendChild(optionElement);
            });
        });
    }

    navigateStep(direction) {
        const newStep = this.currentStep + direction;
        if (newStep < 1 || newStep > 2) return;

        // 1단계에서 2단계로 넘어갈 때 필수 입력값 검사
        if (this.currentStep === 1 && direction === 1) {
            const visitDate = this.modal.querySelector('#visitDate').value;
            const chartNumber = this.modal.querySelector('#chartNumber').value;
            const patientName = this.modal.querySelector('#patientName').value;

            if (!visitDate) {
                alert('내원날짜를 입력해주세요.');
                this.modal.querySelector('#visitDate').focus();
                return;
            }
            if (!chartNumber) {
                alert('차트번호를 입력해주세요.');
                this.modal.querySelector('#chartNumber').focus();
                return;
            }
            if (!patientName) {
                alert('환자 이름을 입력해주세요.');
                this.modal.querySelector('#patientName').focus();
                return;
            }
        }

        const currentContent = this.modal.querySelector(`.step-content[data-step="${this.currentStep}"]`);
        const newContent = this.modal.querySelector(`.step-content[data-step="${newStep}"]`);

        // 현재 콘텐츠에 이전/다음 방향 클래스 추가
        currentContent.classList.add(direction === 1 ? 'prev' : 'next');
        currentContent.classList.remove('active');

        // 새로운 콘텐츠 표시
        requestAnimationFrame(() => {
            newContent.style.display = 'block';
            requestAnimationFrame(() => {
                newContent.classList.add('active');
                this.currentStep = newStep;
                this.updateNavigationButtons();

                // 애니메이션 완료 후 이전 콘텐츠 숨김
                setTimeout(() => {
                    currentContent.style.display = 'none';
                    currentContent.classList.remove('prev', 'next');
                }, 300);
            });
        });
    }

    updateNavigationButtons() {
        const prevBtn = this.modal.querySelector('#prevStep');
        const nextBtn = this.modal.querySelector('#nextStep');
        const submitBtn = this.modal.querySelector('#submitForm');

        prevBtn.disabled = this.currentStep === 1;
        nextBtn.style.display = this.currentStep === 2 ? 'none' : 'block';
        submitBtn.style.display = this.currentStep === 2 ? 'block' : 'none';
    }

    addTreatmentGroup() {
        const newGroup = this.treatmentGroupTemplate.cloneNode(true);
        const removeBtn = newGroup.querySelector('.remove-group-btn');
        
        // 삭제 버튼 표시 및 이벤트 추가
        removeBtn.style.display = 'block';
        removeBtn.addEventListener('click', () => {
            newGroup.remove();
            // 이벤트 위임 덕분에 추가적인 이벤트 리스너 필요 없음
        });

        // 새 그룹의 select 옵션들 설정
        const doctorSelect = newGroup.querySelector('select[name="doctor"]');
        const treatmentSelect = newGroup.querySelector('select[name="treatment"]');
        const paymentMethodSelect = newGroup.querySelector('select[name="paymentMethod"]');
        const paymentAmountInput = newGroup.querySelector('input[name="paymentAmount"]');

        // 필수 입력 필드 설정
        doctorSelect.required = true;
        treatmentSelect.required = true;
        paymentMethodSelect.required = true;
        paymentAmountInput.required = true;

        // 라벨에 * 표시 추가
        newGroup.querySelector('label[for="doctor"]').innerHTML = '진료의사 *';
        newGroup.querySelector('label[for="treatment"]').innerHTML = '진료내용 *';
        newGroup.querySelector('label[for="paymentMethod"]').innerHTML = '수납방법 *';
        newGroup.querySelector('label[for="paymentAmount"]').innerHTML = '수납금액 *';

        // 옵션 설정
        if (this.settings) {
            this.setSelectOptions('doctor', this.settings.doctor || [], doctorSelect);
            this.setSelectOptions('treatment', this.settings.treatmentType || [], treatmentSelect);
            this.setSelectOptions('paymentMethod', this.settings.paymentMethod || [], paymentMethodSelect);
        }

        // 수납방법 변경 이벤트 리스너 추가
        paymentMethodSelect.addEventListener('change', (e) => this.handlePaymentMethodChange(e.target));

        // 그룹 추가
        this.modal.querySelector('#treatmentGroups').appendChild(newGroup);
    }

    handlePaymentMethodChange(select) {
        const group = select.closest('.treatment-group');
        const selectedMethod = select.value;
        
        // 카드사 선택 필드
        let cardCompanyField = group.querySelector('.card-company-field');
        if (!cardCompanyField && selectedMethod === '카드') {
            cardCompanyField = document.createElement('div');
            cardCompanyField.className = 'form-group card-company-field';
            cardCompanyField.innerHTML = `
                <label for="cardCompany">카드사</label>
                <select name="cardCompany" required>
                    <option value="">선택하세요</option>
                </select>
            `;
            // 카드사 옵션 설정 - 저장된 카드사 옵션 사용
            const cardCompanySelect = cardCompanyField.querySelector('select');
            this.cardCompanyOptions.forEach(company => {
                const option = document.createElement('option');
                option.value = company.value;
                option.textContent = company.value;
                cardCompanySelect.appendChild(option);
            });
        }

        // 현금영수증 체크박스
        let cashReceiptField = group.querySelector('.cash-receipt-field');
        if (!cashReceiptField && (selectedMethod === '현금' || selectedMethod === '계좌이체')) {
            cashReceiptField = document.createElement('div');
            cashReceiptField.className = 'form-group cash-receipt-field';
            cashReceiptField.innerHTML = `
                <label class="checkbox-label">
                    <input type="checkbox" name="cashReceipt" checked>
                    <span class="checkbox-text">현금영수증</span>
                </label>
            `;
        }

        // 수납금액 입력 필드
        const amountInput = group.querySelector('input[name="paymentAmount"]');

        // 기존 필드들 제거
        group.querySelector('.card-company-field')?.remove();
        group.querySelector('.cash-receipt-field')?.remove();

        // 선택된 수납방법에 따라 필드 추가
        const paymentFields = group.querySelector('.form-grid2');
        switch (selectedMethod) {
            case '카드':
                paymentFields.insertBefore(cardCompanyField, amountInput.parentElement);
                amountInput.value = '';
                amountInput.disabled = false;
                break;
            case '현금':
            case '계좌이체':
                paymentFields.insertBefore(cashReceiptField, amountInput.parentElement);
                amountInput.value = '';
                amountInput.disabled = false;
                break;
            case '수납없음':
                amountInput.value = '0';
                amountInput.disabled = true;
                break;
            default:
                amountInput.value = '';
                amountInput.disabled = false;
                break;
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        try {
            // 첫 번째 스텝의 기본 정보 수집
            const formData = {
                date: this.modal.querySelector('#visitDate').value,
                chartNumber: this.modal.querySelector('#chartNumber').value,
                patientName: this.modal.querySelector('#patientName').value,
                visitPath: this.modal.querySelector('#visitPath').value,
                isNew: this.modal.querySelector('#isNewPatient').checked
            };

            // 진료 정보 그룹 데이터 수집 및 트랜잭션 생성
            const treatmentGroups = this.modal.querySelectorAll('.treatment-group');
            const transactions = [];

            for (const group of treatmentGroups) {
                const paymentAmountValue = group.querySelector('input[name="paymentAmount"]').value.trim();
                const transaction = {
                    ...formData,
                    doctor: group.querySelector('select[name="doctor"]').value,
                    treatmentType: group.querySelector('select[name="treatment"]').value,
                    paymentMethod: group.querySelector('select[name="paymentMethod"]').value,
                    paymentAmount: paymentAmountValue === '' ? null : Number(paymentAmountValue),
                    isConsultation: group.querySelector('input[name="isConsultation"]').checked,
                    notes: group.querySelector('textarea[name="notes"]').value || ''
                };

                // 카드 결제인 경우 카드사 정보 추가
                if (transaction.paymentMethod === '카드') {
                    const cardCompanySelect = group.querySelector('select[name="cardCompany"]');
                    if (cardCompanySelect) {
                        transaction.cardCompany = cardCompanySelect.value;
                    }
                }

                // 현금 또는 계좌이체인 경우 현금영수증 여부 추가
                if (transaction.paymentMethod === '현금' || transaction.paymentMethod === '계좌이체') {
                    const cashReceiptCheckbox = group.querySelector('input[name="cashReceipt"]');
                    if (cashReceiptCheckbox) {
                        transaction.cashReceipt = cashReceiptCheckbox.checked;
                    }
                }

                // 필수 필드 검증
                if (!this.validateTransaction(transaction)) {
                    throw new Error('필수 입력 항목을 모두 입력해주세요.');
                }

                transactions.push(transaction);
            }

            // 서버로 각 트랜잭션 전송
            for (const transaction of transactions) {
                const response = await fetch('/api/transactions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(transaction)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || '거래 등록에 실패했습니다.');
                }
            }

            alert('내원 정보가 성공적으로 등록되었습니다.');
            this.hide();
            
            // window.location.reload() 대신 커스텀 이벤트를 발생시켜 메인 화면을 새로고침
            const event = new CustomEvent('visitInfoUpdated', {
                detail: { date: this.modal.querySelector('#visitDate').value }
            });
            document.dispatchEvent(event);

        } catch (error) {
            console.error('Form submission error:', error);
            alert(error.message);
        }
    }

    validateTransaction(transaction) {
        // Transaction.js 모델의 required 필드들 검증
        const requiredFields = [
            'date',
            'chartNumber',
            'patientName',
            'visitPath',
            'doctor',
            'treatmentType',
            'paymentMethod'
        ];

        for (const field of requiredFields) {
            if (!transaction[field]) {
                return false;
            }
        }

        // 수납방법이 '수납없음'이 아닌 경우 수납금액 필수 검증
        if (transaction.paymentMethod !== '수납없음') {
            if (transaction.paymentAmount === null || 
                transaction.paymentAmount === undefined || 
                isNaN(transaction.paymentAmount) || 
                transaction.paymentAmount === 0) {
                return false;
            }
        }

        // 카드 결제 시 카드사 필수 검증
        if (transaction.paymentMethod === '카드' && !transaction.cardCompany) {
            return false;
        }

        return true;
    }

    show() {
        this.modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        modalManager.pushModal(this);
        
        // 폼 초기화
        this.form.reset();
        this.currentStep = 1;
        this.updateNavigationButtons();
        
        // 폼 요소 초기화
        this.initializeFormElements();
        
        // 스텝 표시 초기화
        this.modal.querySelectorAll('.step-content').forEach(el => {
            el.classList.remove('active');
            el.style.display = 'none';
        });
        const firstStep = this.modal.querySelector('.step-content[data-step="1"]');
        if (firstStep) {
            firstStep.classList.add('active');
            firstStep.style.display = 'block';
        }

        // 진료 정보 그룹 초기화
        const treatmentGroups = this.modal.querySelector('#treatmentGroups');
        if (treatmentGroups) {
            treatmentGroups.innerHTML = '';
            treatmentGroups.appendChild(this.treatmentGroupTemplate.cloneNode(true));
            const firstGroup = treatmentGroups.querySelector('.treatment-group');
            if (firstGroup) {
                firstGroup.querySelector('.remove-group-btn').style.display = 'none';
            }
        }

        // **이벤트 위임 덕분에 별도의 리스너 초기화 불필요**

        // 상담 내역과 수납 내역 로드
        this.loadConsultations();
        this.loadPayments();
    }

    hide() {
        this.modal.style.display = 'none';
        document.body.style.overflow = '';
        modalManager.removeModal(this);

        // 폼 초기화
        this.form.reset();
        
        // 진료 정보 그룹 초기화
        const treatmentGroups = this.modal.querySelector('#treatmentGroups');
        if (treatmentGroups) {
            // 모든 그룹 제거
            treatmentGroups.innerHTML = '';
            // 첫 번째 그룹만 다시 추가
            treatmentGroups.appendChild(this.treatmentGroupTemplate.cloneNode(true));
            const firstGroup = treatmentGroups.querySelector('.treatment-group');
            if (firstGroup) {
                // 필수 입력 필드 초기화
                firstGroup.querySelectorAll('select, input, textarea').forEach(element => {
                    if (element.type === 'checkbox') {
                        element.checked = false;
                    } else {
                        element.value = '';
                    }
                });
                // 라벨에 * 표시 추가
                firstGroup.querySelector('label[for="doctor"]').innerHTML = '진료의사 *';
                firstGroup.querySelector('label[for="treatment"]').innerHTML = '진료내용 *';
                firstGroup.querySelector('label[for="paymentMethod"]').innerHTML = '수납방법 *';
                firstGroup.querySelector('label[for="paymentAmount"]').innerHTML = '수납금액 *';
                // 삭제 버튼 숨기기
                firstGroup.querySelector('.remove-group-btn').style.display = 'none';
            }
        }

        // 상담 내역과 수납 내역 초기화
        this.consultations = [];
        this.payments = [];
        this.updateConsultationList();
        this.updatePaymentList();

        // 스텝 초기화
        this.currentStep = 1;
        this.modal.querySelectorAll('.step-content').forEach(el => {
            el.classList.remove('active');
            el.style.display = 'none';
        });
        const firstStep = this.modal.querySelector('.step-content[data-step="1"]');
        if (firstStep) {
            firstStep.classList.add('active');
            firstStep.style.display = 'block';
        }

        // 네비게이션 버튼 초기화
        this.updateNavigationButtons();
    }

    async handleChartNumberChange(event) {
        const chartNumber = event.target.value.trim();
        
        if (chartNumber) {
            try {
                const response = await fetch(`/api/patients/${chartNumber}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (response.ok) {
                    const patient = await response.json();
                    
                    // 환자 정보 자동 입력
                    const nameInput = this.modal.querySelector('#patientName');
                    const visitPathSelect = this.modal.querySelector('#visitPath');
                    
                    if (nameInput) nameInput.value = patient.name || '';
                    if (visitPathSelect) visitPathSelect.value = patient.visitPath || '';

                    // 상담내역과 수납내역 로드
                    await this.loadConsultations();
                    await this.loadPayments();
                } else if (response.status === 404) {
                    // 환자를 찾을 수 없는 경우
                    if (confirm(`차트번호 ${chartNumber}로 등록된 환자가 없습니다.\n새로운 환자로 등록하시겠습니까?`)) {
                        await this.showNewPatientModal(chartNumber);
                    } else {
                        // 입력 필드 초기화
                        event.target.value = '';
                        const nameInput = this.modal.querySelector('#patientName');
                        const visitPathSelect = this.modal.querySelector('#visitPath');
                        
                        if (nameInput) nameInput.value = '';
                        if (visitPathSelect) visitPathSelect.value = '';

                        // 상담내역과 수납내역 초기화
                        this.consultations = [];
                        this.payments = [];
                        this.updateConsultationList();
                        this.updatePaymentList();
                    }
                }
            } catch (error) {
                console.error('환자 정보 조회 중 오류 발생:', error);
            }
        } else {
            // 차트번호가 비어있는 경우 상담내역과 수납내역 초기화
            this.consultations = [];
            this.payments = [];
            this.updateConsultationList();
            this.updatePaymentList();
        }
    }

    async showNewPatientModal(chartNumber) {
        try {
            // 설정에서 내원경로 목록 가져오기
            const response = await fetch('/api/settings', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const settings = await response.json();
            const visitPaths = settings.visitPath || [];

            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'block';
            modalManager.pushModal(modal);
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px;">
                    <h3>새 환자 등록</h3>
                    <form id="new-patient-form">
                        <div class="form-group">
                            <label for="new-patient-name">환자 이름 *</label>
                            <input type="text" id="new-patient-name" required>
                        </div>
                        <div class="form-group">
                            <label for="new-patient-visitPath">내원경로 *</label>
                            <select id="new-patient-visitPath" required>
                                <option value="">선택하세요</option>
                                ${visitPaths.map(path => `<option value="${path.value}">${path.value}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="submit">등록</button>
                            <button type="button" onclick="this.closest('.modal').remove(); modalManager.removeModal(modal);">취소</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);

            // 새 환자 등록 폼 제출 처리
            const form = modal.querySelector('#new-patient-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                try {
                    const nameInput = form.querySelector('#new-patient-name');
                    const visitPathSelect = form.querySelector('#new-patient-visitPath');
                    
                    const name = nameInput.value.trim();
                    const visitPath = visitPathSelect.value;

                    // 폼 유효성 검사
                    if (!name) {
                        alert('환자 이름을 입력해주세요.');
                        nameInput.focus();
                        return;
                    }
                    if (!visitPath) {
                        alert('내원경로를 선택해주세요.');
                        visitPathSelect.focus();
                        return;
                    }

                    const patientData = { chartNumber, name, visitPath };

                    const response = await fetch('/api/patients', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify(patientData)
                    });
                    
                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.message || '환자 등록에 실패했습니다.');
                    }

                    const result = await response.json();
                    
                    if (result) {
                        // 내원정보 입력 폼에 환자 정보 자동 입력
                        const nameInputMain = this.modal.querySelector('#patientName');
                        const visitPathSelectMain = this.modal.querySelector('#visitPath');
                        const isNewPatientCheckbox = this.modal.querySelector('#isNewPatient');
                        
                        if (nameInputMain) nameInputMain.value = patientData.name;
                        if (visitPathSelectMain) visitPathSelectMain.value = patientData.visitPath;
                        if (isNewPatientCheckbox) isNewPatientCheckbox.checked = true;
                        
                        modal.remove();
                        modalManager.removeModal(modal);
                        alert('새로운 환자가 등록되었습니다.');
                    }
                } catch (error) {
                    console.error('환자 등록 중 오류 발생:', error);
                    alert(error.message || '환자 등록에 실패했습니다.');
                    modal.remove();
                    modalManager.removeModal(modal);
                }
            });
        } catch (error) {
            console.error('내원경로 설정 로드 중 에러:', error);
            alert('내원경로 설정을 불러오는데 실패했습니다.');
        }
    }

    async loadConsultations() {
        try {
            const chartNumber = this.modal.querySelector('#chartNumber').value;
            if (!chartNumber) {
                this.updateConsultationList([]);
                return;
            }

            const response = await fetch(`/api/consultations?chartNumber=${chartNumber}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const consultations = await response.json();
                this.consultations = consultations;
                this.updateConsultationList();
            }
        } catch (error) {
            console.error('상담 내역 로드 중 오류:', error);
        }
    }

    async loadPayments() {
        try {
            const chartNumber = this.modal.querySelector('#chartNumber').value;
            if (!chartNumber) {
                this.updatePaymentList([]);
                return;
            }

            const response = await fetch(`/api/transactions?chartNumber=${chartNumber}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const transactions = await response.json();
                
                // 해당 차트번호의 수납 정보만 필터링 (금액 조건 제거)
                const filteredTransactions = transactions.filter(t => t.chartNumber === chartNumber);
                
                this.payments = filteredTransactions.map(t => {
                    const payment = {
                        _id: t._id,
                        date: t.date,
                        amount: t.paymentAmount,
                        method: t.paymentMethod,
                        isConsultation: t.isConsultation || false
                    };
                    return payment;
                });
                
                this.updatePaymentList();
                
                // 수납 데이터 로드 후 상담 상태 업데이트
                const agreedTotal = this.consultations
                    .filter(consultation => consultation.agreed)
                    .reduce((sum, consultation) => sum + consultation.amount, 0);
                this.updateConsultationStatus(agreedTotal);
            }
        } catch (error) {
            console.error('수납 내역 로드 중 오류:', error);
        }
    }

    updateConsultationList() {
        const listElement = this.modal.querySelector('#consultation-list');
        if (!listElement) return;

        if (this.consultations.length === 0) {
            listElement.innerHTML = `
                <tr>
                    <td colspan="6">등록된 상담 내역이 없습니다.</td>
                </tr>
            `;
            const totalElement = this.modal.querySelector('#total-consultation-amount');
            if (totalElement) {
                totalElement.textContent = `0원`;
            }
            return;
        }

        listElement.innerHTML = this.consultations.map((consultation) => `
            <tr>
                <td>${new Date(consultation.date).toLocaleDateString()}</td>
                <td>${consultation.confirmedDate ? new Date(consultation.confirmedDate).toLocaleDateString() : '-'}</td>
                <td class="amount">${consultation.amount.toLocaleString()}원</td>
                <td>${consultation.staff}</td>
                <td>
                    <button type="button" 
                            class="toggle-btn ${consultation.agreed ? 'agreed' : 'not-agreed'}"
                            data-consultation-id="${consultation._id}">
                        ${consultation.agreed ? '동의' : '미동의'}
                    </button>
                </td>
                <td>
                    <button type="button" class="delete-btn" 
                            data-consultation-id="${consultation._id}">
                        삭제
                    </button>
                </td>
            </tr>
        `).join('');

        // 토글 버튼에 이벤트 리스너 추가
        listElement.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const consultationId = btn.dataset.consultationId;
                this.toggleConsultationAgreed(consultationId);
            });
        });

        // 삭제 버튼에 이벤트 리스너 추가
        listElement.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const consultationId = btn.dataset.consultationId;
                this.removeConsultation(consultationId);
            });
        });

        // 동의된 상담금액 합계 계산
        const agreedTotal = this.consultations
            .filter(consultation => consultation.agreed)
            .reduce((sum, consultation) => sum + consultation.amount, 0);

        const totalElement = this.modal.querySelector('#total-consultation-amount');
        if (totalElement) {
            totalElement.textContent = `${agreedTotal.toLocaleString()}원`;
        }

        // payments 데이터가 있을 때만 상담 상태 업데이트
        if (this.payments && this.payments.length > 0) {
            this.updateConsultationStatus(agreedTotal);
        }
    }

    updatePaymentList() {
        const listElement = this.modal.querySelector('#payment-list');
        if (!listElement) return;

        if (this.payments.length === 0) {
            listElement.innerHTML = `
                <tr>
                    <td colspan="4">등록된 수납 내역이 없습니다.</td>
                </tr>
            `;
            const totalElement = this.modal.querySelector('#total-payment-amount');
            if (totalElement) {
                totalElement.textContent = `0원`;
            }
            return;
        }

        listElement.innerHTML = this.payments.map((payment) => `
            <tr>
                <td>${new Date(payment.date).toLocaleDateString()}</td>
                <td class="amount">${payment.amount.toLocaleString()}원</td>
                <td>${payment.method}</td>
                <td>
                    <button type="button" 
                            class="toggle-btn ${payment.isConsultation ? 'consultation' : 'treatment'}"
                            data-payment-id="${payment._id}">
                        ${payment.isConsultation ? '상담수납' : '일반수납'}
                    </button>
                </td>
            </tr>
        `).join('');

        // 토글 버튼에 이벤트 리스너 추가
        listElement.querySelectorAll('.toggle-btn').forEach(btn => {
            const paymentId = btn.dataset.paymentId;
            btn.addEventListener('click', () => {
                this.togglePaymentType(paymentId);
            });
        });

        this.updatePaymentTotal();
    }

    updateConsultationTotal() {
        const totalElement = this.modal.querySelector('#total-consultation-amount');
        if (!totalElement) return;

        // 동의된 상담내역만 필터링하여 합계 계산
        const agreedTotal = this.consultations
            .filter(consultation => consultation.agreed)
            .reduce((sum, consultation) => sum + consultation.amount, 0);

        totalElement.textContent = `${agreedTotal.toLocaleString()}원`;

        // 수납상태 업데이트
        this.updateConsultationStatus(agreedTotal);
    }

    updateConsultationStatus(agreedTotal) {
        // 상담수납금액 계산 (isConsultation이 true인 수납만)
        const consultationPayments = this.payments.filter(payment => payment.isConsultation);
        
        const consultationPaymentTotal = consultationPayments
            .reduce((sum, payment) => sum + payment.amount, 0);

        // 차액 계산
        const difference = agreedTotal - consultationPaymentTotal;

        // 상태 표시 업데이트
        let statusContainer = this.modal.querySelector('.consultation-status');
        if (!statusContainer) {
            statusContainer = document.createElement('div');
            statusContainer.className = 'consultation-status';
            // consultation-section과 payment-section 사이에 삽입
            const consultationSection = this.modal.querySelector('.consultation-section');
            const paymentSection = this.modal.querySelector('.payment-section');
            if (consultationSection && paymentSection) {
                consultationSection.parentNode.insertBefore(statusContainer, paymentSection);
            }
        }

        if (difference > 0) {
            statusContainer.className = 'consultation-status underpaid';
            statusContainer.innerHTML = `
                <div class="status-icon"></div>
                <span>상담내용 미수납</span>
                <span class="amount">-${difference.toLocaleString()}원</span>
            `;
        } else if (difference < 0) {
            statusContainer.className = 'consultation-status overpaid';
            statusContainer.innerHTML = `
                <div class="status-icon"></div>
                <span>상담내용 과수납</span>
                <span class="amount">+${Math.abs(difference).toLocaleString()}원</span>
            `;
        } else {
            statusContainer.className = 'consultation-status fully-paid';
            statusContainer.innerHTML = `
                <div class="status-icon"></div>
                <span>완납</span>
                <span class="amount">0원</span>
            `;
        }
    }

    updatePaymentTotal() {
        const totalElement = this.modal.querySelector('#total-payment-amount');
        if (!totalElement) return;

        const total = this.payments.reduce((sum, payment) => sum + payment.amount, 0);
        totalElement.textContent = `${total.toLocaleString()}원`;
    }

    async toggleConsultationAgreed(consultationId) {
        try {
            // 현재 상담 데이터 찾기
            const consultation = this.consultations.find(c => c._id === consultationId);
            if (!consultation) {
                throw new Error('상담 정보를 찾을 수 없습니다.');
            }

            const isCurrentlyAgreed = consultation.agreed;
            let confirmedDate = consultation.confirmedDate;
            
            // 미동의에서 동의로 변경하는 경우에만 확정날짜 모달 표시
            if (!isCurrentlyAgreed) {
                // 기존 모달이 있다면 제거
                const existingModal = document.querySelector('.confirmed-date-modal');
                if (existingModal) {
                    existingModal.remove();
                }

                // 확정날짜 모달 생성 및 표시
                const modal = document.createElement('div');
                modal.className = 'modal confirmed-date-modal';
                modal.style.display = 'block';
                modalManager.pushModal(modal);
                modal.innerHTML = `
                    <div class="modal-content" style="max-width: 400px;">
                        <h3>확정날짜 선택</h3>
                        <div class="form-group">
                            <label for="confirmed-date">확정날짜</label>
                            <input type="date" id="confirmed-date" value="${new Date().toISOString().split('T')[0]}" required>
                        </div>
                        <div class="form-actions">
                            <button type="button" id="save-confirmed-date">저장</button>
                            <button type="button" id="cancel-confirmed-date">취소</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                modalManager.pushModal(modal);

                try {
                    // 모달에서 날짜 선택 완료를 기다림
                    confirmedDate = await new Promise((resolve, reject) => {
                        const saveBtn = modal.querySelector('#save-confirmed-date');
                        const cancelBtn = modal.querySelector('#cancel-confirmed-date');
                        const dateInput = modal.querySelector('#confirmed-date');

                        // 저장 버튼 클릭 시
                        saveBtn.addEventListener('click', () => {
                            const date = dateInput.value;
                            if (date) {
                                cleanup();
                                resolve(date);
                            } else {
                                alert('날짜를 선택해주세요.');
                            }
                        });

                        // 취소 버튼 클릭 시
                        cancelBtn.addEventListener('click', () => {
                            cleanup();
                            reject(new Error('취소되었습니다.'));
                        });

                        // ESC 키 처리
                        const escHandler = (e) => {
                            if (e.key === 'Escape') {
                                cleanup();
                                reject(new Error('취소되었습니다.'));
                            }
                        };
                        document.addEventListener('keydown', escHandler);

                        // 모달 외부 클릭 처리
                        const outsideClickHandler = (e) => {
                            if (e.target === modal) {
                                cleanup();
                                reject(new Error('취소되었습니다.'));
                            }
                        };
                        modal.addEventListener('click', outsideClickHandler);

                        // 정리 함수
                        function cleanup() {
                            modal.remove();
                            modalManager.removeModal(modal);
                            document.removeEventListener('keydown', escHandler);
                            modal.removeEventListener('click', outsideClickHandler);
                        }
                    });
                } catch (error) {
                    if (error.message === '취소되었습니다.') {
                        return; // 취소된 경우 함수 종료
                    }
                    throw error;
                }
            }

            // API 호출하여 동의 상태 변경
            const response = await fetch(`/api/consultations/${consultationId}/toggle-agreed`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ confirmedDate })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '동의여부 수정 실패');
            }

            const updatedConsultation = await response.json();
            
            // 상담내역 배열 업데이트
            this.consultations = this.consultations.map(c => 
                c._id === consultationId ? updatedConsultation : c
            );
            
            // 목록과 합계 업데이트
            this.updateConsultationList();
            this.updateConsultationTotal();
            
            // 수납상태 업데이트
            const agreedTotal = this.consultations
                .filter(consultation => consultation.agreed)
                .reduce((sum, consultation) => sum + consultation.amount, 0);
            this.updateConsultationStatus(agreedTotal);
            
        } catch (error) {
            console.error('동의여부 수정 중 에러:', error);
            alert(error.message || '동의여부 수정에 실패했습니다.');
        }
    }

    async removeConsultation(consultationId) {
        if (!confirm('이 상담 정보를 삭제하시겠습니까?')) return;

        try {
            const response = await fetch(`/api/consultations/${consultationId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                await this.loadConsultations();
                alert('상담 정보가 삭제되었습니다.');
            }
        } catch (error) {
            console.error('상담 정보 삭제 중 오류:', error);
            alert('상담 정보 삭제에 실패했습니다.');
        }
    }

    showConsultationModal() {
        const chartNumber = this.modal.querySelector('#chartNumber').value;
        const patientName = this.modal.querySelector('#patientName').value;

        if (!chartNumber || !patientName) {
            alert('차트번호와 환자 이름을 먼저 입력해주세요.');
            return;
        }

        // 상담입력 모달 생성
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modalManager.pushModal(modal);
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>상담 정보 입력</h3>
                    <div class="header-date">
                        <label for="consultation-date">상담날짜</label>
                        <input type="date" id="consultation-date" required>
                    </div>
                </div>
                <form id="new-consultation-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="consultation-chartNumber">차트번호</label>
                            <input type="text" id="consultation-chartNumber" value="${chartNumber}" readonly>
                        </div>
                        <div class="form-group">
                            <label for="consultation-patientName">이름</label>
                            <input type="text" id="consultation-patientName" value="${patientName}" readonly>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="consultation-doctor">담당의사</label>
                            <select id="consultation-doctor" required>
                                <option value="">선택하세요</option>
                                ${this.settings.doctor.map(doctor => 
                                    `<option value="${doctor.value}">${doctor.value}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="consultation-staff">상담직원</label>
                            <select id="consultation-staff" required>
                                <option value="">선택하세요</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="consultation-amount">상담금액</label>
                            <input type="number" id="consultation-amount" required min="0">
                        </div>
                        <div class="form-group">
                            <label for="consultation-agreed">동의여부</label>
                            <div class="checkbox-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="consultation-agreed">
                                    <span class="checkbox-text">동의</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="consultation-notes">비고</label>
                        <textarea id="consultation-notes" rows="3"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit">저장</button>
                        <button type="button" onclick="this.closest('.modal').remove(); modalManager.removeModal(modal);">취소</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        // 오늘 날짜 설정
        const today = this.getKoreanDate();
        modal.querySelector('#consultation-date').value = this.getKoreanDateString(today);

        // 직원 목록 로드
        this.loadStaffList(modal.querySelector('#consultation-staff'));

        // 폼 제출 이벤트 처리
        modal.querySelector('#new-consultation-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const consultationData = {
                    date: modal.querySelector('#consultation-date').value,
                    chartNumber: modal.querySelector('#consultation-chartNumber').value,
                    patientName: modal.querySelector('#consultation-patientName').value,
                    doctor: modal.querySelector('#consultation-doctor').value,
                    staff: modal.querySelector('#consultation-staff').value,
                    amount: Number(modal.querySelector('#consultation-amount').value),
                    agreed: modal.querySelector('#consultation-agreed').checked,
                    notes: modal.querySelector('#consultation-notes').value || '',
                    confirmedDate: modal.querySelector('#consultation-agreed').checked ? 
                        new Date().toISOString() : null
                };

                const response = await fetch('/api/consultations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(consultationData)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || '상담 정보 저장에 실패했습니다.');
                }

                // 상담 내역 새로고침
                await this.loadConsultations();
                modal.remove();
                modalManager.removeModal(modal);
                alert('상담 정보가 저장되었습니다.');

            } catch (error) {
                console.error('상담 정보 저장 중 오류:', error);
                alert(error.message || '상담 정보 저장에 실패했습니다.');
            }
        });
    }

    async loadStaffList(selectElement) {
        try {
            // settings 객체에서 직원 목록 가져오기
            const settings = await loadSettings();
            const staffList = settings.staff || [];
            
            // 기존 옵션 제거
            while (selectElement.options.length > 1) {
                selectElement.remove(1);
            }

            // 직원 목록 추가
            staffList.forEach(staff => {
                const option = document.createElement('option');
                option.value = staff.value;  // staff.value를 사용
                option.textContent = staff.value;  // staff.value를 표시 텍스트로 사용
                selectElement.appendChild(option);
            });
        } catch (error) {
            console.error('직원 목록을 불러오는데 실패했습니다:', error);
        }
    }

    async togglePaymentType(transactionId) {
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
            const chartNumber = this.modal.querySelector('#chartNumber').value;
            const patientName = this.modal.querySelector('#patientName').value;
            await this.loadPayments();
            
            // 상담 상태 업데이트
            const agreedTotal = this.consultations
                .filter(consultation => consultation.agreed)
                .reduce((sum, consultation) => sum + consultation.amount, 0);
            this.updateConsultationStatus(agreedTotal);
            
        } catch (error) {
            console.error('상담수납 상태 수정 중 에러:', error);
            alert('상담수납 상태 수정에 실패했습니다.');
        }
    }
}

// 모달 인스턴스 생성
const visitInfoModal = new VisitInfoModal();
