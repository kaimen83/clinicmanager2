const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const os = require('os');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// 백업 파일 이름 생성 (YYYY-MM-DD.gz 형식)
function getBackupFileName() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.gz`;
}

// mongodump 명령어 존재 여부 확인
async function checkMongodump() {
    return new Promise((resolve) => {
        exec('mongodump --version', (error) => {
            resolve(!error);
        });
    });
}

// 백업 실행 함수
async function performBackup(progressCallback = null, backupDir = process.platform === 'win32' 
    ? 'C:\\backup\\dropbox' 
    : path.join(os.homedir(), 'backup', 'dropbox')) {
    
    // mongodump 명령어 체크
    if (!(await checkMongodump())) {
        throw new Error('mongodump 명령어를 찾을 수 없습니다. MongoDB Database Tools가 설치되어 있는지 확인해주세요.');
    }

    if (!fs.existsSync(backupDir)) {
        try {
            fs.mkdirSync(backupDir, { recursive: true });
        } catch (error) {
            throw new Error('백업 디렉토리를 생성할 수 없습니다. 권한을 확인해주세요.');
        }
    }

    const backupFile = path.join(backupDir, getBackupFileName());
    const { MONGODB_URI, MONGODB_DATABASE } = process.env;
    
    if (!MONGODB_URI) {
        throw new Error('MONGODB_URI 환경변수가 설정되지 않았습니다.');
    }
    
    if (!MONGODB_DATABASE) {
        throw new Error('MONGODB_DATABASE 환경변수가 설정되지 않았습니다.');
    }

    console.log('백업 시작:', new Date().toISOString());
    console.log('대상 데이터베이스:', MONGODB_DATABASE);
    console.log('백업 파일:', backupFile);
    
    return new Promise((resolve, reject) => {
        const cmd = `mongodump --uri="${MONGODB_URI}" --db=${MONGODB_DATABASE} --archive="${backupFile}" --gzip`;
        const process = exec(cmd);
        let errorOutput = '';

        // mongodump의 진행상황을 stdout으로 리다이렉트
        process.stderr.on('data', (data) => {
            // mongodump 실패 메시지만 에러로 처리
            if (data.includes('error') || data.includes('exception')) {
                errorOutput += data;
                console.error('백업 중 에러:', data);
            } else {
                // 진행상황은 일반 로그로 출력
                console.log('백업 진행상황:', data.trim());
            }
        });

        let totalSize = 0;
        let currentSize = 0;

        // 진행률 계산을 위한 임시 파일 크기 확인
        const checkProgress = setInterval(() => {
            if (fs.existsSync(backupFile)) {
                const stats = fs.statSync(backupFile);
                currentSize = stats.size;
                
                if (totalSize === 0 && currentSize > 0) {
                    totalSize = currentSize * 1.1; // 예상 최종 크기
                }

                if (totalSize > 0 && progressCallback) {
                    const progress = Math.min(Math.round((currentSize / totalSize) * 100), 99);
                    progressCallback(progress);
                }
            }
        }, 100);

        process.on('exit', (code) => {
            clearInterval(checkProgress);
            
            if (code === 0) {
                if (progressCallback) progressCallback(100);
                console.log('백업 완료:', new Date().toISOString());
                console.log('백업 파일 크기:', fs.statSync(backupFile).size, 'bytes');
                resolve(backupFile);
            } else {
                const error = new Error(`백업 실패 (코드: ${code})\n${errorOutput}`);
                console.error('백업 실패:', error);
                reject(error);
            }
        });

        process.on('error', (error) => {
            clearInterval(checkProgress);
            console.error('백업 프로세스 에러:', error);
            reject(error);
        });
    });
}

// 스크립트가 직접 실행될 때만 백업 수행
if (require.main === module) {
    performBackup()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('백업 실패:', error);
            process.exit(1);
        });
}

module.exports = { performBackup }; 