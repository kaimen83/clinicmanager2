# MongoDB 연결 문제 해결 가이드

## Windows 환경에서 MongoDB 연결 오류 해결

### 🚨 **일반적인 오류 메시지들**

#### 1. `connect ECONNREFUSED ::1:27017`
**원인**: IPv6 주소로 연결 시도했지만 MongoDB가 응답하지 않음

**해결책**:
```powershell
# IPv4 주소 명시적 사용
$env:MONGODB_URI="mongodb://127.0.0.1:27017"
node fix-timezone-data.js --dry-run
```

#### 2. `MongoServerSelectionError`
**원인**: MongoDB 서비스가 실행되지 않음

**해결책**:
```powershell
# MongoDB 서비스 시작
Start-Service MongoDB
# 또는
net start MongoDB
```

### 🔍 **단계별 진단 및 해결**

#### **1단계: MongoDB 서비스 상태 확인**
```powershell
# 서비스 상태 확인
Get-Service -Name MongoDB

# 상태별 대응:
# Running - 정상 실행 중
# Stopped - 시작 필요
# 서비스 없음 - MongoDB 미설치
```

#### **2단계: MongoDB 프로세스 확인**
```powershell
# MongoDB 프로세스 확인
Get-Process mongod

# 프로세스가 없으면 서비스 시작
Start-Service MongoDB
```

#### **3단계: 포트 사용 확인**
```powershell
# 27017 포트 사용 확인
netstat -an | findstr :27017

# LISTENING 상태면 MongoDB가 실행 중
# 아무것도 나오지 않으면 MongoDB 미실행
```

#### **4단계: MongoDB 설치 확인**
```powershell
# MongoDB 설치 경로 확인
where mongod

# 설치되지 않은 경우 설치
# https://www.mongodb.com/try/download/community
```

### 🛠️ **환경별 연결 설정**

#### **로컬 MongoDB (기본 설치)**
```powershell
$env:MONGODB_URI="mongodb://127.0.0.1:27017"
$env:DATABASE_NAME="hospital_accounting"
```

#### **MongoDB with Authentication**
```powershell
$env:MONGODB_URI="mongodb://username:password@127.0.0.1:27017"
$env:DATABASE_NAME="hospital_accounting"
```

#### **MongoDB Atlas (클라우드)**
```powershell
$env:MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net"
$env:DATABASE_NAME="hospital_accounting"
```

#### **Docker MongoDB**
```powershell
# Docker 컨테이너 시작
docker run -d -p 27017:27017 --name mongodb mongo:latest

# 환경변수 설정
$env:MONGODB_URI="mongodb://127.0.0.1:27017"
```

### 📋 **완전한 해결 체크리스트**

1. **[ ]** MongoDB 서비스 실행 확인
   ```powershell
   Get-Service -Name MongoDB
   ```

2. **[ ]** 포트 27017 리스닝 확인
   ```powershell
   netstat -an | findstr :27017
   ```

3. **[ ]** IPv4 주소로 연결 시도
   ```powershell
   $env:MONGODB_URI="mongodb://127.0.0.1:27017"
   ```

4. **[ ]** MongoDB Compass로 연결 테스트
   - 연결 문자열: `mongodb://127.0.0.1:27017`

5. **[ ]** 스크립트 실행
   ```powershell
   node fix-timezone-data.js --dry-run
   ```

### 🔧 **MongoDB 서비스 관리 명령어**

```powershell
# 서비스 시작
Start-Service MongoDB
net start MongoDB

# 서비스 중지
Stop-Service MongoDB
net stop MongoDB

# 서비스 재시작
Restart-Service MongoDB

# 서비스 상태 확인
Get-Service -Name MongoDB
sc query MongoDB
```

### ❌ **여전히 연결되지 않는 경우**

1. **Windows Defender/방화벽 확인**
   ```powershell
   # MongoDB 포트 허용
   netsh advfirewall firewall add rule name="MongoDB" dir=in action=allow protocol=TCP localport=27017
   ```

2. **MongoDB 로그 확인**
   ```
   기본 위치: C:\Program Files\MongoDB\Server\7.0\log\mongod.log
   ```

3. **MongoDB 설정 파일 확인**
   ```
   기본 위치: C:\Program Files\MongoDB\Server\7.0\bin\mongod.cfg
   ```

4. **대안: MongoDB Compass 사용**
   - MongoDB Compass에서 GUI로 데이터 확인
   - 필요시 수동으로 데이터 수정

### 💡 **권장 해결 순서**

1. `Get-Service -Name MongoDB` 실행
2. 서비스가 중지되어 있으면 `Start-Service MongoDB`
3. `$env:MONGODB_URI="mongodb://127.0.0.1:27017"` 설정
4. `node fix-timezone-data.js --dry-run` 실행
5. 여전히 문제가 있으면 MongoDB Compass로 연결 테스트

대부분의 경우 MongoDB 서비스 시작과 IPv4 주소 명시로 해결됩니다!