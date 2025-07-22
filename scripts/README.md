# 레거시 데이터 수정 스크립트

이 폴더에는 데이터베이스의 레거시 데이터를 수정하는 유틸리티 스크립트들이 포함되어 있습니다.

## fix-timezone-data.js

### 개요

한국 시간대(KST) 데이터가 잘못 저장된 레거시 데이터를 수정하는 스크립트입니다.

**문제**: KST 자정(00:00)이 UTC 15:00 전날로 잘못 저장된 경우  
**해결**: 올바른 UTC 00:00:00 다음날로 수정

### 설치 및 준비

1. Node.js와 MongoDB 드라이버가 설치되어 있어야 합니다:
```bash
npm install mongodb
```

2. 스크립트에 실행 권한을 부여합니다:
```bash
chmod +x scripts/fix-timezone-data.js
```

### 사용법

#### 기본 사용법
```bash
# 미리보기 (실제 수정하지 않음)
node scripts/fix-timezone-data.js --dry-run

# 실제 수정 실행
node scripts/fix-timezone-data.js
```

#### 고급 옵션
```bash
# 특정 데이터베이스 지정
node scripts/fix-timezone-data.js --database my_clinic_db

# 특정 컬렉션만 수정
node scripts/fix-timezone-data.js --collections transactions,expenses

# 환경변수로 MongoDB URI 설정
MONGODB_URI="mongodb://user:pass@host:port" node scripts/fix-timezone-data.js

# 모든 옵션 조합
MONGODB_URI="mongodb://localhost:27017" node scripts/fix-timezone-data.js \
  --database hospital_accounting \
  --collections transactions,expenses,extraincomes \
  --dry-run
```

### 환경변수 설정

다음 환경변수를 설정할 수 있습니다:

```bash
# MongoDB 연결 URL
export MONGODB_URI="mongodb://username:password@localhost:27017"

# 기본 데이터베이스 이름
export DATABASE_NAME="hospital_accounting"
```

또는 `.env` 파일을 생성하여 설정할 수 있습니다:

```env
MONGODB_URI=mongodb://localhost:27017
DATABASE_NAME=hospital_accounting
```

### 명령행 옵션

| 옵션 | 설명 | 예제 |
|------|------|------|
| `--dry-run` | 미리보기만 실행 (실제 수정하지 않음) | `--dry-run` |
| `--database <name>` | 대상 데이터베이스 이름 | `--database my_clinic` |
| `--collections <list>` | 수정할 컬렉션들 (쉼표로 구분) | `--collections transactions,expenses` |
| `--help`, `-h` | 도움말 표시 | `--help` |

### 대상 컬렉션 및 필드

기본적으로 다음 컬렉션들의 `date` 필드를 검사합니다:

- `transactions` - 거래 내역
- `expenses` - 지출 내역  
- `extraincomes` - 진료외 수입
- `cashrecords` - 현금 기록
- `consultations` - 상담 내역

### 실행 예제

#### 1. 미리보기 실행
```bash
$ node scripts/fix-timezone-data.js --dry-run

🚀 레거시 시간대 데이터 수정 스크립트 시작
📊 설정:
   MongoDB URI: mongodb://localhost:27017
   데이터베이스: hospital_accounting
   컬렉션: transactions, expenses, extraincomes, cashrecords
   모드: DRY RUN (미리보기)

🔌 MongoDB 연결 중...
✅ MongoDB 연결 성공

🔍 transactions 컬렉션에서 잘못된 시간대 데이터 검색 중...
   찾은 문서 수: 42개
   샘플 데이터:
     1. ID: 687d123456789abcdef01234
        원본: 2025-07-20T15:00:00.000Z
        수정: 2025-07-21T00:00:00.000Z
        환자: 김철수 (12345)
     ...

🔧 transactions 컬렉션 데이터 수정 시뮬레이션 중...
   DRY RUN: 42개 문서가 수정될 예정입니다.

📋 최종 결과 요약:
전체 통계:
  총 찾은 문제 데이터: 47개
  총 수정된 데이터: 47개

💡 실제 수정을 원하시면 --dry-run 옵션을 제거하고 다시 실행하세요.
```

#### 2. 실제 수정 실행
```bash
$ node scripts/fix-timezone-data.js

🚀 레거시 시간대 데이터 수정 스크립트 시작
📊 설정:
   MongoDB URI: mongodb://localhost:27017
   데이터베이스: hospital_accounting
   컬렉션: transactions, expenses, extraincomes, cashrecords
   모드: 실제 수정

...

🔧 transactions 컬렉션 데이터 수정 중...
   실제 수정된 문서 수: 42개

✅ transactions 컬렉션 수정 결과 검증 중...
   남은 잘못된 데이터: 0개
   수정 완료된 데이터: 42개

📋 최종 결과 요약:
전체 통계:
  총 찾은 문제 데이터: 47개
  총 수정된 데이터: 47개

✅ 모든 시간대 데이터 수정이 완료되었습니다!
```

### 안전 기능

1. **백업 추천**: 실행 전 데이터베이스 백업을 권장합니다.
2. **미리보기**: `--dry-run` 옵션으로 안전하게 미리 확인 가능합니다.
3. **수정 이력**: 수정된 문서에 `__timezoneFixed` 필드가 추가되어 수정 이력을 추적할 수 있습니다.
4. **검증**: 수정 후 자동으로 결과를 검증합니다.
5. **오류 처리**: 각 컬렉션별로 독립적으로 처리하여 일부 실패가 전체에 영향을 주지 않습니다.

### 주의사항

1. **백업 필수**: 실행 전 반드시 데이터베이스를 백업하세요.
2. **테스트 환경**: 가능하면 테스트 환경에서 먼저 실행해보세요.
3. **권한**: MongoDB에 읽기/쓰기 권한이 있는지 확인하세요.
4. **네트워크**: MongoDB 서버와의 안정적인 연결을 확인하세요.
5. **중복 실행**: 이미 수정된 데이터는 중복 수정되지 않지만, 안전을 위해 한 번만 실행하세요.

### 문제 해결

#### 연결 오류
```bash
# MongoDB 서버가 실행 중인지 확인
sudo systemctl status mongod

# 연결 정보 확인
mongo --host localhost --port 27017
```

#### 권한 오류
```bash
# MongoDB 사용자 권한 확인
use admin
db.runCommand({usersInfo: "your_username"})
```

#### 컬렉션 없음
스크립트는 존재하지 않는 컬렉션을 자동으로 건너뛰므로 문제없습니다.

### 지원

문제가 발생하면 다음을 확인하세요:

1. MongoDB 서버 상태
2. 네트워크 연결
3. 데이터베이스 권한
4. Node.js 및 mongodb 패키지 버전

스크립트의 자세한 로그를 확인하여 어느 단계에서 문제가 발생했는지 파악하세요.