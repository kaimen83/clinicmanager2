This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# 클리닉 관리 시스템

## 🚀 환자 분석 성능 최적화 가이드

### 구현된 최적화 사항

#### 1. **MongoDB Aggregation Pipeline 최적화**
- 기존 N+1 쿼리 문제 해결
- 단일 aggregation 쿼리로 모든 계산 처리
- **예상 성능 향상: 10-20배**

#### 2. **병렬 처리 도입**
- 순차적 for 루프를 Promise.all로 변경
- 그룹별/내원경로별 데이터를 동시 처리
- **응답 시간 단축: 5-10배**

#### 3. **필수 인덱스 자동 생성**
```javascript
// 자동 생성되는 인덱스들
- consultations: { date: 1, chartNumber: 1, agreed: 1 }
- patients: { visitPath: 1, chartNumber: 1, createdAt: 1 }
- consultations: { date: 1 }
- patients: { chartNumber: 1 }
```

#### 4. **React 컴포넌트 최적화**
- `useCallback`, `useMemo`로 불필요한 재계산 방지
- 메모이제이션으로 렌더링 성능 개선

### 추가 성능 개선 권장사항

#### A. **데이터베이스 레벨 최적화**
1. **Read Replica 활용** (장기)
   - 읽기 전용 replica에서 분석 쿼리 실행
   - 메인 DB 부하 감소

2. **데이터 사전 집계** (중기)
   - 일별/월별 집계 테이블 생성
   - 백그라운드에서 주기적 업데이트

#### B. **캐싱 전략** (단기 적용 가능)
1. **클라이언트 사이드 캐싱**
```javascript
// 구현 예시
const useDataCache = (key, fetchFn, ttl = 5 * 60 * 1000) => {
  // 5분간 캐시 유지
};
```

2. **서버 사이드 캐싱**
```javascript
// Redis 또는 메모리 캐싱
const cacheKey = `patient-analysis:${periodType}:${year}:${month}`;
```

#### C. **UI/UX 개선** (단기 적용 가능)
1. **진행률 표시**
2. **부분 로딩** (Skeleton UI)
3. **데이터 스트리밍**

### 성능 측정 가이드

#### 성능 개선 전후 비교
```bash
# 개선 전 (예상)
- 평균 응답 시간: 15-30초
- DB 쿼리 수: 40-100개 (순차 실행)
- 메모리 사용량: 높음

# 개선 후 (예상)
- 평균 응답 시간: 1-3초
- DB 쿼리 수: 3-5개 (병렬 실행)
- 메모리 사용량: 중간
```

#### 모니터링 지표
1. **응답 시간 측정**
2. **데이터베이스 쿼리 성능**
3. **메모리 사용량**
4. **CPU 사용률**

---

## 기존 README 내용...
