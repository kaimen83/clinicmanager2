import { fetchImplantStats, fetchImplantDetail } from '../api/implantStatsApi.js';
import { formatDate } from '../utils.js';
import { modalManager } from '../modalManager.js';

let currentDoctor = 'all';
let currentPeriod = 'monthly';
let selectedDate = new Date();
let compareYears = new Set(); // 선택된 비교 연도 저장

export function loadImplantStats() {
    initializeImplantStats();
    setupEventListeners();
    loadData(); // 데이터 로드 추가
}

function initializeImplantStats() {
    const container = document.querySelector('.implant-stats-container');
    if (!container) {
        console.error('통계 컨테이너를 찾을 수 없습니다.');
        return;
    }

    // 필터 섹션이 없으면 생성
    let filterSection = container.querySelector('.filter-section');
    if (!filterSection) {
        filterSection = document.createElement('div');
        filterSection.className = 'filter-section';
        container.insertBefore(filterSection, container.firstChild);
    }

    // 기존 내용 초기화
    filterSection.innerHTML = '';

    // 조회기간 선택 그룹 추가
    const periodGroup = document.createElement('div');
    periodGroup.className = 'filter-group';
    periodGroup.innerHTML = `
        <span class="filter-label">조회기간</span>
        <select class="filter-select" id="period-select">
            <option value="monthly">월간</option>
            <option value="yearly">연간</option>
        </select>
    `;
    filterSection.appendChild(periodGroup);

    // 구분선 추가
    const divider1 = document.createElement('div');
    divider1.className = 'filter-divider';
    filterSection.appendChild(divider1);

    // 기준기간 선택 그룹 추가
    const dateGroup = document.createElement('div');
    dateGroup.className = 'filter-group';
    dateGroup.innerHTML = `
        <span class="filter-label">기준기간</span>
        <div class="date-picker-group" id="date-picker-group">
            ${generateDatePicker(currentPeriod)}
        </div>
    `;
    filterSection.appendChild(dateGroup);

    // 구분선 추가
    const divider2 = document.createElement('div');
    divider2.className = 'filter-divider';
    filterSection.appendChild(divider2);

    // 비교기간 선택 그룹 추가
    const compareGroup = document.createElement('div');
    compareGroup.className = 'filter-group';
    compareGroup.innerHTML = `
        <span class="filter-label">비교기간</span>
        <div class="compare-buttons" id="compare-buttons">
            ${generateCompareButtons()}
        </div>
    `;
    filterSection.appendChild(compareGroup);

    // 구분선 추가
    const divider3 = document.createElement('div');
    divider3.className = 'filter-divider';
    filterSection.appendChild(divider3);

    // 의사 선택 필터 그룹 추가
    const doctorGroup = document.createElement('div');
    doctorGroup.className = 'filter-group';
    doctorGroup.innerHTML = `
        <span class="filter-label">의사</span>
        <select class="filter-select" id="implant-doctor-filter">
            <option value="all">전체 의사</option>
        </select>
    `;
    filterSection.appendChild(doctorGroup);

    // 의사 목록 로드
    loadDoctorList();
}

function generateDatePicker(period) {
    const now = new Date();
    let html = '';

    switch(period) {
        case 'monthly':
            const monthValue = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
            const maxMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            html = `
                <input type="month" 
                    class="date-picker-input" 
                    id="month-picker" 
                    value="${monthValue}"
                    max="${maxMonth}"
                >
            `;
            break;
        case 'yearly':
            html = `
                <input type="number" 
                    class="date-picker-input" 
                    id="year-picker" 
                    value="${selectedDate.getFullYear()}"
                    min="2000" 
                    max="${now.getFullYear()}"
                >
            `;
            break;
    }
    return html;
}

function generateCompareButtons() {
    if (currentPeriod === 'monthly') {
        return `
            <button class="compare-button" data-years="0" data-months="1">전월</button>
            <button class="compare-button" data-years="1">전년 동월</button>
            <button class="compare-button" data-years="2">2년전 동월</button>
            <button class="compare-button" data-years="3">3년전 동월</button>
        `;
    } else {
        return `
            <button class="compare-button" data-years="1">작년</button>
            <button class="compare-button" data-years="2">2년전</button>
            <button class="compare-button" data-years="3">3년전</button>
        `;
    }
}

function getCalendarTitle() {
    if (currentPeriod === 'monthly') {
        return `${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월`;
    } else {
        return `${selectedDate.getFullYear()}년`;
    }
}

function getDateRange() {
    const startDate = new Date(selectedDate);
    const endDate = new Date(selectedDate);

    switch(currentPeriod) {
        case 'monthly':
            startDate.setDate(1);
            endDate.setMonth(endDate.getMonth() + 1, 0);
            break;
        case 'yearly':
            startDate.setMonth(0, 1);
            endDate.setMonth(11, 31);
            break;
    }

    return {
        startDate: formatDate(startDate, 'YYYY-MM-DD'),
        endDate: formatDate(endDate, 'YYYY-MM-DD')
    };
}

function setupEventListeners() {
    // 조회기간 선택 이벤트
    const periodSelect = document.getElementById('period-select');
    if (periodSelect) {
        periodSelect.addEventListener('change', (e) => {
            handlePeriodChange(e.target.value);
        });
    }

    setupDatePickerEvents();
    setupCompareButtonEvents();
    
    // 의사 필터 변경 이벤트
    const doctorFilter = document.getElementById('implant-doctor-filter');
    if (doctorFilter) {
        doctorFilter.addEventListener('change', (e) => {
            currentDoctor = e.target.value;
            loadData();
        });
    }
}

function setupDatePickerEvents() {
    const filterSection = document.querySelector('.filter-section');
    if (!filterSection) return;

    filterSection.addEventListener('change', (e) => {
        if (e.target.id === 'month-picker' && currentPeriod === 'monthly') {
            try {
                const dateValue = e.target.value;
                if (!dateValue) return;  // 값이 비어있으면 처리하지 않음
                
                const [year, month] = dateValue.split('-').map(Number);
                
                // 유효성 검사 추가
                if (!year || !month || year < 1900 || month < 1 || month > 12) {
                    console.error('Invalid date value:', dateValue);
                    return;
                }
                
                selectedDate = new Date(year, month - 1);
                loadData();
            } catch (error) {
                console.error('Error processing date:', error);
            }
        } else if (e.target.id === 'year-picker' && currentPeriod === 'yearly') {
            selectedDate.setFullYear(Number(e.target.value));
            loadData();
        }
    });
}

function setupCompareButtonEvents() {
    const buttons = document.querySelectorAll('.compare-button');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const years = parseInt(button.dataset.years || '0');
            const months = parseInt(button.dataset.months || '0');
            const key = months > 0 ? `m${months}` : `y${years}`;

            if (compareYears.has(key)) {
                compareYears.delete(key);
                button.classList.remove('active');
            } else {
                compareYears.add(key);
                button.classList.add('active');
            }
            loadData();
        });
    });
}

async function loadDoctorList() {
    try {
        const response = await fetch('/api/settings', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const settings = await response.json();
        
        const doctorSelect = document.getElementById('implant-doctor-filter');
        if (!doctorSelect) return;

        doctorSelect.innerHTML = '<option value="all">전체 의사</option>';
        
        if (Array.isArray(settings.doctor)) {
            settings.doctor.forEach(doctor => {
                const option = document.createElement('option');
                option.value = doctor.value;
                option.textContent = doctor.value;
                doctorSelect.appendChild(option);
            });
        } else {
            console.error('의사 목록을 찾을 수 없습니다:', settings);
        }
    } catch (error) {
        console.error('의사 목록 로드 실패:', error);
    }
}

async function loadData() {
    try {
        const dateRange = getDateRange();
        const mainData = await fetchImplantStats(dateRange.startDate, dateRange.endDate, currentDoctor, '');
        
        console.log('Received mainData:', mainData); // 디버깅 로그 추가

        // 데이터 구조 확인 및 유효성 검사
        if (!mainData || !mainData.data) {
            console.error('Invalid mainData structure:', mainData);
            return;
        }

        // 비교 데이터 로드
        const compareData = await Promise.all(
            Array.from(compareYears).map(async key => {
                const compareRange = getCompareRange(key);
                const data = await fetchImplantStats(compareRange.startDate, compareRange.endDate, currentDoctor, '');
                return { key, data };
            })
        );

        if (compareData.length > 0) {
            renderComparisonTable(mainData, compareData);
        } else {
            const calendarContainer = createCalendarContainer(mainData);
            const container = document.querySelector('.implant-stats-container');
            const existingContent = container.querySelector('.calendar-container, .stats-table-container');
            if (existingContent) existingContent.remove();
            container.appendChild(calendarContainer);
            setupCalendarEvents(mainData.data);
        }
    } catch (error) {
        console.error('데이터 로드 실패:', error);
    }
}

function getCompareRange(key) {
    const startDate = new Date(selectedDate);
    const endDate = new Date(selectedDate);

    if (key.startsWith('m')) {
        // 월 단위 비교
        const months = parseInt(key.substring(1));
        startDate.setMonth(startDate.getMonth() - months, 1);
        endDate.setMonth(endDate.getMonth() - months + 1, 0);
    } else {
        // 연 단위 비교
        const years = parseInt(key.substring(1));
        startDate.setFullYear(startDate.getFullYear() - years);
        endDate.setFullYear(endDate.getFullYear() - years);

        if (currentPeriod === 'monthly') {
            startDate.setDate(1);
            endDate.setMonth(endDate.getMonth() + 1, 0);
        } else {
            startDate.setMonth(0, 1);
            endDate.setMonth(11, 31);
        }
    }

    return {
        startDate: formatDate(startDate, 'YYYY-MM-DD'),
        endDate: formatDate(endDate, 'YYYY-MM-DD')
    };
}

function renderComparisonTable(mainData, compareData) {
    const container = document.querySelector('.implant-stats-container');
    const tableContainer = document.createElement('div');
    tableContainer.className = 'stats-table-container';

    const table = document.createElement('table');
    table.className = 'stats-table';

    // 비교 데이터 정렬
    compareData.sort((a, b) => {
        const getMonthsAgo = (key) => {
            if (key.startsWith('m')) {
                return parseInt(key.substring(1));
            } else {
                return parseInt(key.substring(1)) * 12;
            }
        };
        return getMonthsAgo(a.key) - getMonthsAgo(b.key);
    });

    // 헤더 칼럼 생성
    const headers = ['항목'];
    
    // 기준 기간 헤더
    if (currentPeriod === 'monthly') {
        headers.push(`${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월`);
    } else {
        headers.push(`${selectedDate.getFullYear()}년`);
    }

    // 비교 기간 헤더
    compareData.forEach(({ key }) => {
        const compareDate = new Date(selectedDate);
        if (key.startsWith('m')) {
            const months = parseInt(key.substring(1));
            compareDate.setMonth(compareDate.getMonth() - months);
            headers.push(`${compareDate.getFullYear()}년 ${compareDate.getMonth() + 1}월`);
        } else {
            const years = parseInt(key.substring(1));
            compareDate.setFullYear(compareDate.getFullYear() - years);
            if (currentPeriod === 'monthly') {
                headers.push(`${compareDate.getFullYear()}년 ${compareDate.getMonth() + 1}월`);
            } else {
                headers.push(`${compareDate.getFullYear()}년`);
            }
        }
    });

    // 테이블 헤더 생성
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // 테이블 바디 생성
    const tbody = document.createElement('tbody');
    const allDataSets = [
        { data: mainData },
        ...compareData
    ];

    // 데이터 계산
    const manufacturers = getAllManufacturers([mainData.data, ...compareData.map(c => c.data.data)]);
    const fixtureTypes = getAllFixtureTypes([mainData.data, ...compareData.map(c => c.data.data)]);
    const stats = allDataSets.map(({ data }) => calculateStats(data.data));

    // 임플란트 섹션
    tbody.appendChild(createGroupHeader('임플란트', headers.length));
    tbody.appendChild(createDataRow('합계', stats.map(s => s.totalImplants), true));
    manufacturers.forEach(manufacturer => {
        tbody.appendChild(createDataRow(
            manufacturer, 
            stats.map(s => s.implantsByManufacturer[manufacturer] || 0)
        ));
    });

    // 이식재 섹션
    tbody.appendChild(createGroupHeader('이식재', headers.length));
    tbody.appendChild(createDataRow('합계', stats.map(s => s.totalFixtures), true));
    fixtureTypes.forEach(type => {
        tbody.appendChild(createDataRow(
            type,
            stats.map(s => s.fixturesByType[type] || 0)
        ));
    });

    table.appendChild(tbody);
    tableContainer.appendChild(table);

    // 기존 컨텐츠 제거
    const existingContent = container.querySelector('.calendar-container, .stats-table-container');
    if (existingContent) existingContent.remove();    
    container.appendChild(tableContainer);
}

function createGroupHeader(title, columnCount) {
    const row = document.createElement('tr');
    row.className = 'group-header';
    const cell = document.createElement('td');
    cell.textContent = title;
    cell.colSpan = columnCount; // 헤더의 열 개수를 직접 전달
    row.appendChild(cell);
    return row;
}

function createDataRow(label, values, isTotal = false) {
    const row = document.createElement('tr');
    row.className = isTotal ? 'total-row' : 'sub-item';

    const labelCell = document.createElement('td');
    labelCell.textContent = label;
    row.appendChild(labelCell);

    values.forEach(value => {
        const cell = document.createElement('td');
        cell.innerHTML = value > 0 ? 
            `<span class="stats-value">${value}개</span>` : 
            '<span class="empty-cell">-</span>';
        row.appendChild(cell);
    });

    return row;
}

function getAllManufacturers(dataSets) {
    const manufacturers = new Set();
    dataSets.forEach(data => {
        data.forEach(day => {
            Object.keys(day.implants).forEach(m => manufacturers.add(m));
        });
    });
    return Array.from(manufacturers).sort();
}

function getAllFixtureTypes(dataSets) {
    const types = new Set();
    dataSets.forEach(data => {
        data.forEach(day => {
            Object.keys(day.fixtures).forEach(t => types.add(t));
        });
    });
    return Array.from(types).sort();
}

function generateDateRange() {
    const dates = [];
    const startDate = new Date(selectedDate);
    const endDate = new Date(selectedDate);

    if (currentPeriod === 'monthly') {
        startDate.setDate(1);
        endDate.setMonth(endDate.getMonth() + 1, 0);
    } else {
        startDate.setMonth(0, 1);
        endDate.setMonth(11, 31);
    }

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
}

function createCalendarContainer(data, label) {
    const calendarContainer = document.createElement('div');
    calendarContainer.className = 'calendar-container';

    // 달력 헤더 추가
    const calendarHeader = document.createElement('div');
    calendarHeader.className = 'calendar-header';
    
    // 타이틀 섹션 추가
    const titleSection = document.createElement('div');
    titleSection.className = 'calendar-title-section';

    // 이전 버튼
    const prevButton = document.createElement('button');
    prevButton.className = 'calendar-nav-button';
    prevButton.innerHTML = '◀ 이전';
    prevButton.onclick = () => {
        navigateCalendar(-1);
    };

    // 다음 버튼
    const nextButton = document.createElement('button');
    nextButton.className = 'calendar-nav-button';
    nextButton.innerHTML = '다음 ▶';
    nextButton.onclick = () => {
        navigateCalendar(1);
    };

    // 현재 날짜가 이인 경우 다음 버튼 비활성화
    const now = new Date();
    if (currentPeriod === 'monthly') {
        const currentMonth = now.getFullYear() * 12 + now.getMonth();
        const selectedMonth = selectedDate.getFullYear() * 12 + selectedDate.getMonth();
        nextButton.disabled = selectedMonth >= currentMonth;
    } else {
        nextButton.disabled = selectedDate.getFullYear() >= now.getFullYear();
    }

    // 타이틀
    const title = document.createElement('div');
    title.className = 'calendar-title';
    title.textContent = getCalendarTitle();

    titleSection.appendChild(prevButton);
    titleSection.appendChild(title);
    titleSection.appendChild(nextButton);
    calendarHeader.appendChild(titleSection);

    // 통계 정보 추가
    const stats = calculateStats(data.data); // data.data로 변경
    const statsContainer = document.createElement('div');
    statsContainer.className = 'calendar-stats';
    
    // 임플란트 통계
    const implantStats = document.createElement('div');
    implantStats.className = 'stats-section';
    implantStats.innerHTML = `
        <div class="stats-header">
            <div class="stats-title">임플란트 통계</div>
            <div class="accumulated-total">누적총계: ${data.accumulatedTotal}개</div>
        </div>
        <div class="stats-items">
            <div class="stats-item total-item">
                <span class="stats-item-label">총계</span>
                <span class="stats-item-value">${stats.totalImplants}개</span>
            </div>
            ${Object.entries(stats.implantsByManufacturer)
                .map(([manufacturer, count]) => `
                    <div class="stats-item">
                        <span class="stats-item-label">${manufacturer}</span>
                        <span class="stats-item-value">${count}개</span>
                    </div>
                `).join('')}
        </div>
    `;
    statsContainer.appendChild(implantStats);

    // 이식재 통계
    const fixtureStats = document.createElement('div');
    fixtureStats.className = 'stats-section';
    fixtureStats.innerHTML = `
        <div class="stats-title">이식재 통계</div>
        <div class="stats-items">
            ${Object.entries(stats.fixturesByType)
                .map(([type, count]) => `
                    <div class="stats-item">
                        <span class="stats-item-label">${type}</span>
                        <span class="stats-item-value">${count}개</span>
                    </div>
                `).join('')}
        </div>
    `;
    statsContainer.appendChild(fixtureStats);

    calendarHeader.appendChild(statsContainer);
    calendarContainer.appendChild(calendarHeader);

    // 달력 그리드 생성
    if (currentPeriod === 'monthly') {
        renderDailyCalendar(calendarContainer, data.data); // data.data로 변경
    } else {
        renderMonthlyCalendar(calendarContainer, data.data); // data.data로 변경
    }

    return calendarContainer;
}

function navigateCalendar(direction) {
    if (currentPeriod === 'monthly') {
        selectedDate.setMonth(selectedDate.getMonth() + direction);
    } else {
        selectedDate.setFullYear(selectedDate.getFullYear() + direction);
    }

    // 필터 영역 업데이트
    const monthPicker = document.getElementById('month-picker');
    const yearPicker = document.getElementById('year-picker');
    
    if (currentPeriod === 'monthly' && monthPicker) {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        monthPicker.value = `${year}-${month}`;
    } else if (currentPeriod === 'yearly' && yearPicker) {
        yearPicker.value = selectedDate.getFullYear().toString();
    }

    // 데이터 새로 불러오기
    loadData();
}

function calculateStats(data) {
    // 데이터 유효성 검사
    if (!data) {
        console.error('Data is undefined or null');
        return {
            totalImplants: 0,
            implantsByManufacturer: {},
            totalFixtures: 0,
            fixturesByType: {}
        };
    }

    if (!Array.isArray(data)) {
        console.error('Data is not an array:', data);
        return {
            totalImplants: 0,
            implantsByManufacturer: {},
            totalFixtures: 0,
            fixturesByType: {}
        };
    }

    const stats = {
        totalImplants: 0,
        implantsByManufacturer: {},
        totalFixtures: 0,
        fixturesByType: {}
    };

    data.forEach(day => {
        if (!day || typeof day !== 'object') return;

        // 임플란트 통계
        if (day.implants && typeof day.implants === 'object') {
            Object.entries(day.implants).forEach(([manufacturer, count]) => {
                if (typeof count === 'number') {
                    stats.implantsByManufacturer[manufacturer] = (stats.implantsByManufacturer[manufacturer] || 0) + count;
                    stats.totalImplants += count;
                }
            });
        }

        // 이식재 통계
        if (day.fixtures && typeof day.fixtures === 'object') {
            Object.entries(day.fixtures).forEach(([type, count]) => {
                if (typeof count === 'number') {
                    stats.fixturesByType[type] = (stats.fixturesByType[type] || 0) + count;
                    stats.totalFixtures += count;
                }
            });
        }
    });

    return stats;
}

function renderDailyCalendar(container, data) {
    if (!Array.isArray(data)) {
        console.error('Invalid data format in renderDailyCalendar:', data);
        return;
    }

    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    
    // 요일 헤더 추가
    const weekdaysDiv = document.createElement('div');
    weekdaysDiv.className = 'calendar-weekdays';
    weekdays.forEach(day => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'weekday';
        dayDiv.textContent = day;
        weekdaysDiv.appendChild(dayDiv);
    });
    container.appendChild(weekdaysDiv);

    // 달력 그리드 생성
    const calendarGrid = document.createElement('div');
    calendarGrid.className = 'calendar-grid';

    const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();

    // 이전 달의 날짜 추가
    const prevMonthLastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 0).getDate();
    for (let i = 0; i < startPadding; i++) {
        const dayDiv = createDayCell(prevMonthLastDay - startPadding + i + 1, true);
        calendarGrid.appendChild(dayDiv);
    }

    // 현재 달의 날짜 추가
    for (let day = 1; day <= totalDays; day++) {
        const currentDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
        const formattedDate = formatDate(currentDate, 'YYYY-MM-DD');
        const dayData = data.find(d => d.date === formattedDate);
        const dayDiv = createDayCell(day, false, dayData);
        calendarGrid.appendChild(dayDiv);
    }

    // 다음 달의 날짜로 나머지 채우기
    const remainingCells = 42 - (startPadding + totalDays);
    for (let i = 1; i <= remainingCells; i++) {
        const dayDiv = createDayCell(i, true);
        calendarGrid.appendChild(dayDiv);
    }

    container.appendChild(calendarGrid);
}

function renderMonthlyCalendar(container, data) {
    const calendarGrid = document.createElement('div');
    calendarGrid.className = 'calendar-grid monthly';

    const months = Array.from({length: 12}, (_, i) => {
        const date = new Date(selectedDate.getFullYear(), i, 1);
        const monthData = data.filter(d => {
            const dataDate = new Date(d.date);
            return dataDate.getMonth() === i && dataDate.getFullYear() === selectedDate.getFullYear();
        });
        return { date, data: monthData };
    });

    months.forEach(({date, data}) => {
        const monthDiv = createMonthCell(date, data);
        calendarGrid.appendChild(monthDiv);
    });

    container.appendChild(calendarGrid);
}

function createDayCell(day, isOtherMonth, data = null) {
    const dayDiv = document.createElement('div');
    dayDiv.className = `calendar-day${isOtherMonth ? ' other-month' : ''}`;
    
    const today = new Date();
    if (!isOtherMonth && 
        day === today.getDate() && 
        selectedDate.getMonth() === today.getMonth() && 
        selectedDate.getFullYear() === today.getFullYear()) {
        dayDiv.classList.add('today');
    }

    // 헤더 (날짜 + 총계)
    const header = document.createElement('div');
    header.className = 'day-header';
    header.innerHTML = `
        <span class="day-number">${day}</span>
        ${data ? `<span class="stats-badge">${data.totalImplants}개</span>` : ''}
    `;
    dayDiv.appendChild(header);

    // 상세 내용
    if (data) {
        const content = document.createElement('div');
        content.className = 'day-content';

        // 제조사별 임플란트
        if (Object.keys(data.implants).length > 0) {
            const implantSection = document.createElement('div');
            implantSection.className = 'content-section';
            implantSection.innerHTML = `
                <div class="content-section-title">Fixture</div>
                <div class="content-items">
                    ${Object.entries(data.implants)
                        .map(([manufacturer, count]) => `
                            <div class="content-item">
                                <span class="content-item-label">${manufacturer}</span>
                                <span class="content-item-value">${count}개</span>
                            </div>
                        `).join('')}
                </div>
            `;
            content.appendChild(implantSection);
        }

        // 이식재별
        if (Object.keys(data.fixtures).length > 0) {
            const fixtureSection = document.createElement('div');
            fixtureSection.className = 'content-section';
            fixtureSection.innerHTML = `
                <div class="content-section-title">이식재</div>
                <div class="content-items">
                    ${Object.entries(data.fixtures)
                        .map(([type, count]) => `
                            <div class="content-item">
                                <span class="content-item-label">${type}</span>
                                <span class="content-item-value">${count}개</span>
                            </div>
                        `).join('')}
                </div>
            `;
            content.appendChild(fixtureSection);
        }

        dayDiv.appendChild(content);
        dayDiv.dataset.date = data.date;
    }

    return dayDiv;
}

function createMonthCell(date, monthData) {
    const monthDiv = document.createElement('div');
    monthDiv.className = 'calendar-month';
    
    if (date.getMonth() === new Date().getMonth() && 
        date.getFullYear() === new Date().getFullYear()) {
        monthDiv.classList.add('current');
    }

    // 월별 통계 계산
    const stats = {
        totalImplants: 0,
        implants: {},
        fixtures: {}
    };

    monthData.forEach(day => {
        // 임플란트 통계
        Object.entries(day.implants).forEach(([manufacturer, count]) => {
            stats.implants[manufacturer] = (stats.implants[manufacturer] || 0) + count;
            stats.totalImplants += count;
        });

        // 이식재 통계
        Object.entries(day.fixtures).forEach(([type, count]) => {
            stats.fixtures[type] = (stats.fixtures[type] || 0) + count;
        });
    });

    // 헤더 (월 + 총계)
    const header = document.createElement('div');
    header.className = 'month-header';
    header.innerHTML = `
        <span class="month-name">${date.getMonth() + 1}월</span>
        ${stats.totalImplants > 0 ? `<span class="stats-badge">${stats.totalImplants}개</span>` : ''}
    `;
    monthDiv.appendChild(header);

    // 상세 내용
    if (monthData.length > 0) {
        const content = document.createElement('div');
        content.className = 'month-content';

        // 제조사별 임플란트
        if (Object.keys(stats.implants).length > 0) {
            const implantSection = document.createElement('div');
            implantSection.className = 'content-section';
            implantSection.innerHTML = `
                <div class="content-section-title">제조사별</div>
                <div class="content-items">
                    ${Object.entries(stats.implants)
                        .map(([manufacturer, count]) => `
                            <div class="content-item">
                                <span class="content-item-label">${manufacturer}</span>
                                <span class="content-item-value">${count}개</span>
                            </div>
                        `).join('')}
                </div>
            `;
            content.appendChild(implantSection);
        }

        // 이식재별
        if (Object.keys(stats.fixtures).length > 0) {
            const fixtureSection = document.createElement('div');
            fixtureSection.className = 'content-section';
            fixtureSection.innerHTML = `
                <div class="content-section-title">이식재</div>
                <div class="content-items">
                    ${Object.entries(stats.fixtures)
                        .map(([type, count]) => `
                            <div class="content-item fixture">
                                <span class="content-item-label">${type}</span>
                                <span class="content-item-value">${count}개</span>
                            </div>
                        `).join('')}
                </div>
            `;
            content.appendChild(fixtureSection);
        }

        monthDiv.appendChild(content);
        monthDiv.dataset.month = date.getMonth();
    }

    return monthDiv;
}

function setupCalendarEvents(data) {
    // 기존 이벤트 리스너 제거
    document.querySelectorAll('.calendar-day, .calendar-month').forEach(element => {
        const clone = element.cloneNode(true);
        element.parentNode.replaceChild(clone, element);
    });

    // 일별 클릭 이벤트
    document.querySelectorAll('.calendar-day').forEach(day => {
        if (day.dataset.date) {
            day.addEventListener('click', () => {
                const dayData = data.find(d => d.date === day.dataset.date);
                if (dayData) {
                    showDetailModal(dayData);
                }
            });
        }
    });

    // 월별 클릭 이벤트
    document.querySelectorAll('.calendar-month').forEach(month => {
        if (month.dataset.month) {
            month.addEventListener('click', () => {
                const monthData = data.filter(d => {
                    const dataDate = new Date(d.date);
                    return dataDate.getMonth() === Number(month.dataset.month);
                });
                if (monthData.length > 0) {
                    showDetailModal(monthData);
                }
            });
        }
    });
}

function showDetailModal(data) {
    let existingModal = document.querySelector('.detail-modal');
    if (existingModal) {
        existingModal.remove();
    }

    existingModal = document.createElement('div');
    existingModal.className = 'detail-modal';
    document.body.appendChild(existingModal);

    const isMultipleDays = Array.isArray(data);
    const title = isMultipleDays 
        ? `${selectedDate.getFullYear()}년 ${Number(data[0].date.split('-')[1])}월 통계` 
        : formatDate(new Date(data.date), 'YYYY년 M월 D일');

    existingModal.innerHTML = `
        <div class="detail-content">
            <div class="detail-header">
                <div class="detail-title">${title}</div>
                <button class="detail-close">&times;</button>
            </div>
            ${renderDetailContent(data)}
        </div>
    `;

    existingModal.classList.add('show');
    modalManager.pushModal(existingModal);

    setupModalEventListeners(existingModal, data);
}

function setupModalEventListeners(modal, data) {
    const closeButton = modal.querySelector('.detail-close');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            modal.classList.remove('show');
            modalManager.removeModal(modal);
            setTimeout(() => modal.remove(), 300); 
        });
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
            modalManager.removeModal(modal);
            setTimeout(() => modal.remove(), 300); 
        }
    });

    const editButtons = modal.querySelectorAll('.edit-patient-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', () => {
            const chartNumber = button.getAttribute('data-chart');
            handlePatientEdit(chartNumber, data.date);
        });
    });

    const deleteButtons = modal.querySelectorAll('.delete-patient-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', () => {
            const chartNumber = button.getAttribute('data-chart');
            handlePatientDelete(chartNumber, data.date);
        });
    });
}

//
// ======== [수정 포인트 1] handlePatientEdit 함수 수정 ========
//
async function handlePatientEdit(chartNumber, date) {
    try {
        const response = await fetch(`/api/implant-stats/${date}/${chartNumber}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('환자 정보를 가져오는데 실패했습니다.');
        }

        const patientData = await response.json();
        showEditPatientModal(patientData);
    } catch (error) {
        console.error('환자 정보 수정 중 에러:', error);
        alert('환자 정보를 수정하는데 실패했습니다.');
    }
}

//
// ======== [수정 포인트 2] handlePatientDelete 함수 수정 ========
//
async function handlePatientDelete(chartNumber, date) {
    if (!confirm('정말 이 환자의 정보를 삭제하시겠습니까?')) {
        return;
    }

    try {
        const response = await fetch(`/api/implant-stats/${date}/${chartNumber}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('환자 정보 삭제에 실패했습니다.');
        }
        
        const updatedDataResponse = await fetch(`/api/implant-stats/${date}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!updatedDataResponse.ok) {
            throw new Error('데이터 갱신에 실패했습니다.');
        }

        // ----- 이 부분에서 받아온 updatedData가 배열인지, 객체인지 분기 처리 -----
        let updatedData = await updatedDataResponse.json();
        let dayData = Array.isArray(updatedData)
            ? updatedData.find(d => d.date === date)
            : updatedData;

        // 혹시라도 dayData를 찾지 못했다면 그냥 updatedData 사용(예외 케이스)
        if (!dayData) {
            dayData = updatedData;
        }
        // ------------------------------------------

        const existingModal = document.querySelector('.detail-modal');
        if (existingModal) {
            const detailContent = existingModal.querySelector('.detail-content');
            if (detailContent) {
                detailContent.innerHTML = `
                    <div class="detail-header">
                        <div class="detail-title">${formatDate(new Date(date), 'YYYY년 M월 D일')}</div>
                        <button class="detail-close">&times;</button>
                    </div>
                    ${renderDetailContent(dayData)}
                `;

                setupModalEventListeners(existingModal, dayData);
            }
        }

        loadData();
        alert('환자 정보가 삭제되었습니다.');
    } catch (error) {
        console.error('환자 정보 삭제 중 에러:', error);
        alert('환자 정보를 삭제하는데 실패했습니다.');
    }
}

//
// ========== renderDetailContent 함수 ==========
//
function renderDetailContent(data) {

    
    if (!data || !data.patients) {
        return '<div class="error">데이터 형식이 올바르지 않습니다.</div>';
    }

    return `
        <div class="detail-content-inner">
            <table class="detail-table">
                <thead>
                    <tr>
                        <th>차트번호</th>
                        <th>환자명</th>
                        <th>담당의</th>
                        <th>사용량</th>
                        <th>총계</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${data.patients.map(patient => {
                        let implantContent = '<div class="no-items">임플란트 없음</div>';
                        let totalImplants = 0;

                        if (patient.implants) {
                            if (Array.isArray(patient.implants)) {
                                const implantsByManufacturer = {};
                                patient.implants.forEach(imp => {
                                    implantsByManufacturer[imp.manufacturer] = (implantsByManufacturer[imp.manufacturer] || 0) + imp.quantity;
                                    totalImplants += imp.quantity;
                                });
                                
                                if (Object.keys(implantsByManufacturer).length > 0) {
                                    implantContent = Object.entries(implantsByManufacturer)
                                        .map(([manufacturer, count]) => `
                                            <div class="usage-item implant">
                                                <span class="item-label">임플란트 ${manufacturer}</span>
                                                <span class="item-count">${count}개</span>
                                            </div>
                                        `).join('');
                                }
                            } else if (typeof patient.implants === 'object') {
                                if (Object.keys(patient.implants).length > 0) {
                                    implantContent = Object.entries(patient.implants)
                                        .map(([manufacturer, count]) => `
                                            <div class="usage-item implant">
                                                <span class="item-label">임플란트 ${manufacturer}</span>
                                                <span class="item-count">${count}개</span>
                                            </div>
                                        `).join('');
                                    totalImplants = Object.values(patient.implants).reduce((sum, count) => sum + count, 0);
                                }
                            }
                        }

                        let fixtureContent = '<div class="no-items">이식재 없음</div>';
                        let totalFixtures = 0;

                        if (patient.fixtures) {
                            if (Array.isArray(patient.fixtures)) {
                                const fixturesByType = {};
                                patient.fixtures.forEach(fix => {
                                    fixturesByType[fix.type] = (fixturesByType[fix.type] || 0) + fix.quantity;
                                    totalFixtures += fix.quantity;
                                });
                                
                                if (Object.keys(fixturesByType).length > 0) {
                                    fixtureContent = Object.entries(fixturesByType)
                                        .map(([type, count]) => `
                                            <div class="usage-item">
                                                <span class="item-label">이식재 ${type}</span>
                                                <span class="item-count">${count}개</span>
                                            </div>
                                        `).join('');
                                }
                            } else if (typeof patient.fixtures === 'object') {
                                if (Object.keys(patient.fixtures).length > 0) {
                                    fixtureContent = Object.entries(patient.fixtures)
                                        .map(([type, count]) => `
                                            <div class="usage-item">
                                                <span class="item-label">이식재 ${type}</span>
                                                <span class="item-count">${count}개</span>
                                            </div>
                                        `).join('');
                                    totalFixtures = Object.values(patient.fixtures).reduce((sum, count) => sum + count, 0);
                                }
                            }
                        }

                        return `
                            <tr>
                                <td>${patient.chartNumber}</td>
                                <td>${patient.patientName}</td>
                                <td>${patient.doctor}</td>
                                <td class="usage-details">
                                    ${implantContent}
                                    ${fixtureContent}
                                </td>
                                <td class="total-count">
                                    ${totalImplants}개
                                </td>
                                <td>
                                    <div class="patient-actions">
                                        <button type="button" class="patient-action-btn edit-patient-btn" data-chart="${patient.chartNumber}" data-date="${data.date}">
                                            수정
                                        </button>
                                        <button type="button" class="patient-action-btn delete-patient-btn" data-chart="${patient.chartNumber}" data-date="${data.date}">
                                            삭제
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            <div class="detail-summary">
                <div class="summary-section">
                    <h4>임플란트 통계</h4>
                    ${Object.entries(data.implants || {}).length > 0 
                        ? Object.entries(data.implants).map(([manufacturer, count]) => `
                            <div class="stat-item">
                                <span class="stat-label">${manufacturer}:</span>
                                <span class="stat-value">${count}개</span>
                            </div>
                        `).join('')
                        : '<div class="no-items">임플란트 데이터 없음</div>'
                    }
                </div>
                <div class="summary-section">
                    <h4>이식재 통계</h4>
                    ${Object.entries(data.fixtures || {}).length > 0 
                        ? Object.entries(data.fixtures).map(([type, count]) => `
                            <div class="stat-item">
                                <span class="stat-label">${type}:</span>
                                <span class="stat-value">${count}개</span>
                            </div>
                        `).join('')
                        : '<div class="no-items">이식재 데이터 없음</div>'
                    }
                </div>
            </div>
        </div>
    `;
}

function showEditPatientModal(patientData) {
    const existingEditModal = document.querySelector('.edit-patient-modal');
    if (existingEditModal) {
        existingEditModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'edit-patient-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>사용량 수정</h3>
                <button class="close-btn">&times;</button>
            </div>
            <form id="edit-patient-form">
                <div class="patient-info">
                    <div class="patient-info-item">
                        <span class="patient-info-label">차트번호</span>
                        <span class="patient-info-value">${patientData.chartNumber}</span>
                    </div>
                    <div class="patient-info-item">
                        <span class="patient-info-label">환자명</span>
                        <span class="patient-info-value">${patientData.patientName}</span>
                    </div>
                    <div class="patient-info-item">
                        <span class="patient-info-label">담당의</span>
                        <span class="patient-info-value">${patientData.doctor}</span>
                    </div>
                </div>
                
                <div class="modal-body">
                    <div class="left-section">
                        <div class="section-implant">
                            <div class="section-header">
                                <h4>임플란트</h4>
                            </div>
                            <div id="implant-container"></div>
                            <button type="button" class="add-row-btn" id="add-implant-row">임플란트 추가</button>
                        </div>
                    </div>
                    
                    <div class="right-section">
                        <div class="section-fixture">
                            <div class="section-header">
                                <h4>이식재</h4>
                            </div>
                            <div id="fixture-container"></div>
                            <button type="button" class="add-row-btn" id="add-fixture-row">이식재 추가</button>
                        </div>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="secondary-btn cancel-btn">취소</button>
                    <button type="submit" class="primary-btn">저장</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'block';
    modalManager.pushModal(modal);

    async function loadSettings() {
        try {
            const response = await fetch('/api/settings', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const settings = await response.json();
            return settings;
        } catch (error) {
            console.error('설정 로드 중 에러:', error);
            return { implantManufacturer: [], implantFixture: [] };
        }
    }

    async function addImplantRow(manufacturers, implant = null) {
        const container = modal.querySelector('#implant-container');
        const row = document.createElement('div');
        row.className = 'usage-row';
        row.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <select name="implant-manufacturer" required>
                        <option value="">제조사 선택</option>
                        ${manufacturers.map(m => `
                            <option value="${m.value}" ${implant && implant.manufacturer === m.value ? 'selected' : ''}>
                                ${m.value}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <select name="implant-specification" disabled>
                        <option value="">규격 선택</option>
                    </select>
                </div>
                <div class="form-group">
                    <input type="number" name="implant-quantity" min="1" value="${implant ? implant.quantity : ''}" required placeholder="수량">
                </div>
                <button type="button" class="remove-row-btn">삭제</button>
            </div>
        `;

        // 제조사 선택 시 규격 목록 로드
        const manufacturerSelect = row.querySelector('[name="implant-manufacturer"]');
        const specificationSelect = row.querySelector('[name="implant-specification"]');
        
        // 기존 선택된 제조사 설정
        if (implant && implant.manufacturer) {
            const option = manufacturerSelect.querySelector(`option[value="${implant.manufacturer}"]`);
            if (!option) {
                // 기존 제조사가 목록에 없는 경우 추가
                const newOption = document.createElement('option');
                newOption.value = implant.manufacturer;
                newOption.textContent = implant.manufacturer;
                manufacturerSelect.appendChild(newOption);
            }
            manufacturerSelect.value = implant.manufacturer;
        }

        manufacturerSelect.addEventListener('change', async () => {
            const selectedManufacturer = manufacturerSelect.value;
            specificationSelect.disabled = true;
            specificationSelect.innerHTML = '<option value="">규격 선택</option>';
            
            if (selectedManufacturer) {
                try {
                    const response = await fetch('/api/implantproducts/specifications', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({
                            category: 'fixture',
                            name: selectedManufacturer
                        })
                    });

                    if (!response.ok) {
                        throw new Error('규격 목록을 가져오는데 실패했습니다.');
                    }

                    const specifications = await response.json();
                    
                    specificationSelect.innerHTML = `
                        <option value="">규격 선택</option>
                        ${specifications.map(spec => `
                            <option value="${spec}" ${implant && implant.specification === spec ? 'selected' : ''}>
                                ${spec}
                            </option>
                        `).join('')}
                    `;
                    specificationSelect.disabled = false;
                } catch (error) {
                    console.error('규격 목록 로드 중 에러:', error);
                    alert('규격 목록을 불러오는데 실패했습니다.');
                }
            }
        });

        // 기존 데이터가 있는 경우 규격 목록 로드
        if (implant && implant.manufacturer) {
            manufacturerSelect.dispatchEvent(new Event('change'));
        }

        container.appendChild(row);
    }

    async function addFixtureRow(fixtures = [], fixture = null) {
        const container = modal.querySelector('#fixture-container');
        const row = document.createElement('div');
        row.className = 'usage-row';
        row.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <select name="fixture-type" required>
                        <option value="">이식재 선택</option>
                        ${fixtures.map(f => `
                            <option value="${f}" ${fixture && fixture.type === f ? 'selected' : ''}>
                                ${f}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <select name="fixture-specification" disabled>
                        <option value="">규격 선택</option>
                    </select>
                </div>
                <div class="form-group">
                    <input type="number" name="fixture-quantity" min="1" value="${fixture ? fixture.quantity : ''}" required placeholder="수량">
                </div>
                <button type="button" class="remove-row-btn">삭제</button>
            </div>
        `;

        // 이식재 선택 시 규격 목록 로드
        const fixtureSelect = row.querySelector('[name="fixture-type"]');
        const specificationSelect = row.querySelector('[name="fixture-specification"]');
        
        // 기존 선택된 이식재 설정
        if (fixture && fixture.type) {
            const option = fixtureSelect.querySelector(`option[value="${fixture.type}"]`);
            if (!option) {
                // 기존 이식재가 목록에 없는 경우 추가
                const newOption = document.createElement('option');
                newOption.value = fixture.type;
                newOption.textContent = fixture.type;
                fixtureSelect.appendChild(newOption);
            }
            fixtureSelect.value = fixture.type;
        }

        fixtureSelect.addEventListener('change', async () => {
            const selectedFixture = fixtureSelect.value;
            specificationSelect.disabled = true;
            specificationSelect.innerHTML = '<option value="">규격 선택</option>';
            
            if (selectedFixture) {
                try {
                    const response = await fetch('/api/implantproducts/specifications', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({
                            category: '이식재',
                            name: selectedFixture
                        })
                    });

                    if (!response.ok) {
                        throw new Error('규격 목록을 가져오는데 실패했습니다.');
                    }

                    const specifications = await response.json();
                    
                    specificationSelect.innerHTML = `
                        <option value="">규격 선택</option>
                        ${specifications.map(spec => `
                            <option value="${spec}" ${fixture && fixture.specification === spec ? 'selected' : ''}>
                                ${spec}
                            </option>
                        `).join('')}
                    `;
                    specificationSelect.disabled = false;
                } catch (error) {
                    console.error('규격 목록 로드 중 에러:', error);
                    alert('규격 목록을 불러오는데 실패했습니다.');
                }
            }
        });

        // 기존 데이터가 있는 경우 규격 목록 로드
        if (fixture && fixture.type) {
            fixtureSelect.dispatchEvent(new Event('change'));
        }

        container.appendChild(row);
    }

    (async () => {
        const settings = await loadSettings();
        
        // 이식재 목록 가져오기
        let fixtureTypes = [];
        try {
            const response = await fetch('/api/implantproducts/fixtures', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                fixtureTypes = data.fixtures || [];
            }
        } catch (error) {
            console.error('이식재 목록 로드 중 에러:', error);
        }
        
        if (patientData.implants && patientData.implants.length > 0) {
            patientData.implants.forEach(implant => {
                addImplantRow(settings.implantManufacturer || [], implant);
            });
        } else {
            addImplantRow(settings.implantManufacturer || []);
        }

        if (patientData.fixtures && patientData.fixtures.length > 0) {
            patientData.fixtures.forEach(fixture => {
                addFixtureRow(fixtureTypes, fixture);
            });
        } else {
            addFixtureRow(fixtureTypes);
        }

        modal.querySelector('#add-implant-row').addEventListener('click', () => {
            addImplantRow(settings.implantManufacturer || []);
        });

        modal.querySelector('#add-fixture-row').addEventListener('click', () => {
            addFixtureRow(fixtureTypes);
        });

        const form = modal.querySelector('#edit-patient-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const implants = Array.from(modal.querySelectorAll('#implant-container .usage-row')).map(row => {
                    const manufacturer = row.querySelector('[name="implant-manufacturer"]').value;
                    const specification = row.querySelector('[name="implant-specification"]').value;
                    const quantity = parseInt(row.querySelector('[name="implant-quantity"]').value);
                    return { manufacturer, specification, quantity };
                }).filter(implant => implant.manufacturer && !isNaN(implant.quantity) && implant.quantity > 0);

                const fixtures = Array.from(modal.querySelectorAll('#fixture-container .usage-row')).map(row => {
                    const type = row.querySelector('[name="fixture-type"]').value;
                    const specification = row.querySelector('[name="fixture-specification"]').value;
                    const quantity = parseInt(row.querySelector('[name="fixture-quantity"]').value);
                    return { type, specification, quantity };
                }).filter(fixture => fixture.type && !isNaN(fixture.quantity) && fixture.quantity > 0);

                const requestData = {
                    patientName: patientData.patientName,
                    doctor: patientData.doctor,
                    implants,
                    fixtures
                };

                const response = await fetch(`/api/implant-stats/${patientData.date}/${patientData.chartNumber}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(requestData)
                });

                const responseData = await response.json();

                if (!response.ok) {
                    throw new Error(responseData.message || '데이터 수정에 실패했습니다.');
                }

                modal.classList.remove('show');
                modalManager.removeModal(modal);
                modal.remove();
                
                const detailModal = document.querySelector('.detail-modal');
                if (detailModal) {
                    try {
                        const updatedDataResponse = await fetch(`/api/implant-stats/${patientData.date}`, {
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            }
                        });

                        let updatedData = await updatedDataResponse.json();
                        if (!updatedDataResponse.ok) {
                            throw new Error('데이터 갱신에 실패했습니다.');
                        }

                        // ----- 배열인지 객체인지에 따라 dayData 추출 -----
                        let dayData = Array.isArray(updatedData)
                            ? updatedData.find(d => d.date === patientData.date)
                            : updatedData;
                        
                        if (!dayData) {
                            dayData = updatedData;
                        }
                        // -------------------------------------------

                        const detailContent = detailModal.querySelector('.detail-content');
                        if (detailContent) {
                            detailContent.innerHTML = `
                                <div class="detail-header">
                                    <div class="detail-title">${formatDate(new Date(patientData.date), 'YYYY년 M월 D일')}</div>
                                    <button class="detail-close">&times;</button>
                                </div>
                                ${renderDetailContent(dayData)}
                            `;
                            setupModalEventListeners(detailModal, dayData);
                        }
                    } catch (error) {
                        console.error('[Edit Modal] Error updating detail modal:', error);
                        alert('데이터 갱신에 실패했습니다. 페이지를 새로고침해주세요.');
                    }
                }

                await loadImplantStats();
                alert('수정이 완료되었습니다.');
            } catch (error) {
                console.error('[Edit Modal] Error during update:', error);
                alert(error.message || '수정에 실패했습니다.');
            }
        });

        modal.querySelector('.cancel-btn').addEventListener('click', () => {
            modal.classList.remove('show');
            modalManager.removeModal(modal);
            modal.remove();
        });

        modal.querySelector('.close-btn').addEventListener('click', () => {
            modal.classList.remove('show');
            modalManager.removeModal(modal);
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                modalManager.removeModal(modal);
                modal.remove();
            }
        });
    })();
}

async function showDetail(date) {
    try {
        const detail = await fetchImplantDetail(date, currentDoctor);
        
        document.getElementById('implant-detail-list').innerHTML = `
            <table class="detail-table">
                <thead>
                    <tr>
                        <th>제조사</th>
                        <th>수량</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(detail.implants)
                        .map(([manufacturer, count]) => `
                            <tr>
                                <td>${manufacturer}</td>
                                <td>${count}개</td>
                            </tr>
                        `).join('')}
                    <tr>
                        <td><strong>총계</strong></td>
                        <td><strong>${detail.totalImplants}개</strong></td>
                    </tr>
                </tbody>
            </table>
        `;

        document.getElementById('fixture-detail-list').innerHTML = `
            <table class="detail-table">
                <thead>
                    <tr>
                        <th>종류</th>
                        <th>량</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(detail.fixtures)
                        .map(([type, count]) => `
                            <tr>
                                <td>${type}</td>
                                <td>${count}개</td>
                            </tr>
                        `).join('')}
                </tbody>
            </table>
        `;

        document.getElementById('patient-detail-info').innerHTML = `
            <table class="detail-table">
                <thead>
                    <tr>
                        <th>차트번호</th>
                        <th>환자명</th>
                        <th>담당의</th>
                    </tr>
                </thead>
                <tbody>
                    ${detail.patients.map(patient => `
                        <tr>
                            <td>${patient.chartNumber}</td>
                            <td>${patient.patientName}</td>
                            <td>${patient.doctor}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        document.getElementById('implant-detail-modal').style.display = 'block';
    } catch (error) {
        console.error('상세 정보 로드 실패:', error);
    }
}

function handlePeriodChange(period) {
    currentPeriod = period;
    compareYears.clear(); 
    
    const compareButtons = document.getElementById('compare-buttons');
    if (compareButtons) {
        compareButtons.innerHTML = generateCompareButtons();
        setupCompareButtonEvents();
    }
    
    const datePickerGroup = document.getElementById('date-picker-group');
    if (datePickerGroup) {
        datePickerGroup.innerHTML = generateDatePicker(currentPeriod);
        setupDatePickerEvents();
    }

    loadData();
}
