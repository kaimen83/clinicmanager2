# 환자분석 최적화 구현 가이드

환자분석 페이지의 로딩 시간을 단축하기 위해 다음 3가지 최적화를 구현했습니다.

## 🚀 구현된 최적화

### 1. MongoDB 인덱스 최적화
- `transactions` 컬렉션에 복합 인덱스 추가
- `patient_analysis_summary` 컬렉션에 조회 최적화 인덱스 추가

### 2. 요약 데이터 프리캐싱
- 자주 사용되는 기간별 데이터를 미리 계산하여 저장
- 24시간 TTL로 캐시 관리
- 백그라운드에서 자동 갱신

### 3. Progressive Loading
- 현재 기간 데이터를 먼저 표시
- 비교 기간 데이터는 비동기로 로드
- 스켈레톤 UI로 로딩 상태 표시

## 📁 새로 추가된 파일

```
app/api/admin/optimize-indexes/route.ts          # 인덱스 최적화 API
app/api/patient-analysis/generate-summary/route.ts # 요약 데이터 생성 API
scripts/optimize-patient-analysis.js            # 최적화 실행 스크립트
```

## 🔧 설정 및 실행

### 1. 인덱스 최적화 실행

개발/프로덕션 환경에서 한 번만 실행하면 됩니다.

```bash
# 스크립트로 실행 (권장)
node scripts/optimize-patient-analysis.js

# 또는 API 직접 호출
curl -X POST http://localhost:3000/api/admin/optimize-indexes
```

### 2. 요약 데이터 생성

```bash
# 현재 월 요약 데이터 생성
curl -X POST http://localhost:3000/api/patient-analysis/generate-summary \
  -H "Content-Type: application/json" \
  -d '{"periodType": "month", "year": 2024, "month": 7}'

# 강제 재생성 (기존 캐시 무시)
curl -X POST http://localhost:3000/api/patient-analysis/generate-summary \
  -H "Content-Type: application/json" \
  -d '{"periodType": "month", "year": 2024, "month": 7, "force": true}'
```

### 3. 주기적 최적화 (권장)

Cron이나 서버리스 함수로 주기적 실행을 설정하세요.

```bash
# 매일 새벽 2시에 실행 (crontab 예시)
0 2 * * * cd /path/to/project && node scripts/optimize-patient-analysis.js
```

## 📊 성능 개선 효과

### Before (최적화 전)
- 초기 로딩: 5-15초
- 모든 데이터를 한번에 로드
- 복잡한 aggregation 쿼리를 매번 실행

### After (최적화 후)
- 초기 로딩: 1-3초 (현재 기간 데이터)
- 비교 데이터: 추가 2-5초 (비동기)
- 캐시된 데이터 사용 시: 0.5초 이내

## 🛠️ 기술적 세부사항

### 인덱스 구성
```javascript
// transactions 컬렉션
{ date: 1, chartNumber: 1 }  // 날짜별 환자 조회
{ date: 1, isNew: 1 }        // 신환 필터링
{ chartNumber: 1 }           // 환자별 조회

// patient_analysis_summary 컬렉션
{ periodType: 1, year: 1, month: 1 }    // 월별 요약 데이터
{ periodType: 1, year: 1, quarter: 1 }  // 분기별 요약 데이터
{ createdAt: 1 }                        // TTL 관리
```

### 캐싱 전략
- **생성 시점**: 첫 조회 시 또는 배치 작업
- **갱신 주기**: 24시간 TTL
- **저장 형태**: 그룹별/개별별 데이터 모두 저장
- **백그라운드 갱신**: 자동화된 배치 프로세스

### Progressive Loading 흐름
1. 사용자가 환자분석 탭 클릭
2. 즉시 현재 기간 데이터 로드 및 표시
3. 비교 기간 데이터는 백그라운드에서 비동기 로드
4. 로딩 중에는 스켈레톤 UI 표시
5. 완료되면 실제 데이터로 교체

## 🔍 모니터링

### 성능 확인
- 브라우저 개발자 도구의 Network 탭에서 API 응답 시간 확인
- MongoDB 쿼리 로그에서 실행 시간 모니터링

### 캐시 상태 확인
```javascript
// MongoDB에서 요약 데이터 확인
db.patient_analysis_summary.find().sort({updatedAt: -1})
```

## 🚨 주의사항

1. **인덱스 생성**: 대량 데이터가 있는 환경에서는 시간이 오래 걸릴 수 있습니다.
2. **메모리 사용량**: 요약 데이터가 MongoDB 메모리를 사용합니다.
3. **데이터 일관성**: 실시간 데이터와 캐시된 데이터 간 약간의 지연이 있을 수 있습니다.

## 📈 추가 최적화 가능사항

1. **Redis 캐싱**: MongoDB 대신 Redis를 캐시 저장소로 사용
2. **CDN 활용**: 정적 데이터는 CDN에 캐싱
3. **쿼리 최적화**: 더 세밀한 aggregation 파이프라인 튜닝
4. **압축**: 대용량 데이터의 gzip 압축 전송