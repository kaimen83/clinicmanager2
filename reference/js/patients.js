// 환자 관련 함수들
async function handlePatientSearch(chartNumber) {
    try {
        const response = await fetch(`/api/patients/${chartNumber}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });


        if (response.ok) {
            const data = await response.json();
            
            // 이름과 내원경로 자동 설정
            document.getElementById('patientName').value = data.name;
            if (data.visitPath) {
                const visitPathSelect = document.getElementById('visitPath');
                visitPathSelect.value = data.visitPath;
            }
            return data;
        } else if (response.status === 404) {
            return null;
        } else {
            throw new Error('환자 검색 실패');
        }
    } catch (error) {
        console.error('환자 검색 중 에러:', error);
        throw error;
    }
}


async function registerNewPatient(data) {
    try {
        const response = await fetch('/api/patients', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        });

        const responseData = await response.json();
        
        if (!response.ok) {
            throw new Error(responseData.message || '환자 등록에 실패했습니다.');
        }

        // responseData 자체를 반환
        return responseData;
    } catch (error) {
        console.error('환자 등록 중 에러:', error);
        throw error;
    }
}

// 차트번호 입력 이벤트 핸들러
async function handleChartNumberInput(chartNumber) {
    try {
        const patient = await handlePatientSearch(chartNumber);
        if (!patient) {
            if (confirm(`차트번호 ${chartNumber}로 등록된 환자가 없습니다.\n새로운 환자로 등록하시겠습니까?`)) {
                // 새 환자 등록 모달 표시
                showNewPatientModal(chartNumber);
            } else {
                // 입력 필드 초기화
                document.getElementById('chartNumber').value = '';
                document.getElementById('patientName').value = '';
                document.getElementById('visitPath').value = '';
            }
        } else {
            // 기존 환자 정보 자동 입력
            document.getElementById('patientName').value = patient.name;
            document.getElementById('visitPath').value = patient.visitPath;
        }
    } catch (error) {
        console.error('차트번호 입력 처리 중 에러:', error);
        alert('환자 정보 처리 중 오류가 발생했습니다.');
    }
}

// 새 환자 등록 모달 표시 함수
async function showNewPatientModal(chartNumber) {
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
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <h3>새 환자 등록</h3>
                <form id="new-patient-form">
                    <div class="form-group">
                        <label for="new-patient-name">환자 이름</label>
                        <input type="text" id="new-patient-name" required>
                    </div>
                    <div class="form-group">
                        <label for="new-patient-visitPath">내원경로</label>
                        <select id="new-patient-visitPath" required>
                            <option value="">선택하세요</option>
                            ${visitPaths.map(path => `<option value="${path.value}">${path.value}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="submit">등록</button>
                        <button type="button" onclick="this.closest('.modal').remove();">취소</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        // 새 환자 등록 폼 제출 처리
        modal.querySelector('#new-patient-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const patientData = {
                    chartNumber,
                    name: document.getElementById('new-patient-name').value,
                    visitPath: document.getElementById('new-patient-visitPath').value
                };

                const result = await registerNewPatient(patientData);
                if (result) {
                    // 내원정보 입력 폼에 환자 정보 자동 입력
                    document.getElementById('patientName').value = patientData.name;
                    document.getElementById('visitPath').value = patientData.visitPath;
                    modal.remove(); // 모달 닫기
                    alert('새로운 환자가 등록되었습니다.');
                }
            } catch (error) {
                alert(error.message || '환자 등록에 실패했습니다.');
                modal.remove(); // 에러 발생시에도 모달 닫기
            }
        });
    } catch (error) {
        console.error('내원경로 설정 로드 중 에러:', error);
        alert('내원경로 설정을 불러오는데 실패했습니다.');
    }
}

export { handlePatientSearch, registerNewPatient, handleChartNumberInput }; 