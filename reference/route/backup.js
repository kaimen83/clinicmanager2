const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { performBackup } = require('../scripts/backup');
const { restoreBackup, checkMongorestore, dropDatabase } = require('../scripts/restore');
const BackupLog = require('../models/BackupLog');
const path = require('path');
const fs = require('fs');
const os = require('os');
const schedule = require('node-schedule');
require('dotenv').config();

// 백업 디렉토리 설정
const getBackupDir = () => {
    if (process.platform === 'win32') {
        return process.env.BACKUP_DIR_WINDOWS || 'C:\\backup\\dropbox';
    } else {
        const unixPath = process.env.BACKUP_DIR_UNIX || 'backup/dropbox';
        // 절대 경로로 시작하는 경우
        if (unixPath.startsWith('/')) {
            return unixPath;
        }
        // 상대 경로인 경우 홈 디렉토리 기준으로 설정
        return path.join(os.homedir(), unixPath);
    }
};
const BACKUP_DIR = getBackupDir();
console.log('설정된 백업 디렉토리:', BACKUP_DIR);

const MAX_BACKUP_FILES = 15;  // 최대 백업 파일 개수
const MAX_BACKUP_SIZE_MB = 1000;  // 최대 백업 파일 크기 (MB)
let isBackupInProgress = false;  // 백업 진행 중 플래그

// 자정 자동 백업 스케줄러 설정
schedule.scheduleJob('0 0 * * *', async () => {
    console.log('자동 백업 시작 (매일 자정)');
    try {
        const backupFile = await performBackupTask();
        console.log('자동 백업 완료:', path.basename(backupFile));
    } catch (error) {
        console.error('자동 백업 실패:', error);
    }
});

// 백업 디렉토리 권한 체크
const checkBackupDirPermissions = () => {
    try {
        const testFile = path.join(BACKUP_DIR, '.test');
        fs.writeFileSync(testFile, '');
        fs.unlinkSync(testFile);
        return true;
    } catch (error) {
        console.error('백업 디렉토리 권한 체크 실패:', error);
        return false;
    }
};

// 파일 삭제 함수 (재시도 로직 포함)
const deleteFileWithRetry = async (filePath, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            fs.unlinkSync(filePath);
            return true;
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
    return false;
};

// 오래된 백업 파일 정리 함수
const cleanupOldBackups = async () => {
    try {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.endsWith('.gz'))
            .map(file => ({
                name: file,
                path: path.join(BACKUP_DIR, file),
                date: fs.statSync(path.join(BACKUP_DIR, file)).mtime,
                size: fs.statSync(path.join(BACKUP_DIR, file)).size
            }))
            .sort((a, b) => b.date - a.date);  // 최신 순으로 정렬

        // 최대 개수를 초과하는 오래된 파일들 삭제
        if (files.length > MAX_BACKUP_FILES) {
            const filesToDelete = files.slice(MAX_BACKUP_FILES);
            for (const file of filesToDelete) {
                try {
                    await deleteFileWithRetry(file.path);
                    console.log(`오래된 백업 파일 삭제: ${file.name}`);
                    
                    await BackupLog.create({
                        type: '자동삭제',
                        filename: file.name,
                        size: file.size,
                        status: '삭제됨',
                        note: '최대 백업 파일 개수 초과로 인한 자동 삭제'
                    });
                } catch (error) {
                    console.error(`파일 삭제 실패 (${file.name}):`, error);
                    await BackupLog.create({
                        type: '자동삭제',
                        filename: file.name,
                        size: file.size,
                        status: '실패',
                        error: error.message,
                        note: '파일 삭제 실패'
                    });
                }
            }
        }

        // 전체 백업 크기 체크
        const totalSize = files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024); // MB로 변환
        if (totalSize > MAX_BACKUP_SIZE_MB) {
            console.warn(`전체 백업 크기가 제한(${MAX_BACKUP_SIZE_MB}MB)을 초과: ${totalSize.toFixed(2)}MB`);
        }
    } catch (error) {
        console.error('백업 파일 정리 중 오류 발생:', error);
        throw error; // 상위에서 처리하도록 에러 전파
    }
};

// 놓친 백업 체크 및 실행
const checkMissedBackup = async () => {
    try {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.endsWith('.gz'))
            .map(file => ({
                date: fs.statSync(path.join(BACKUP_DIR, file)).mtime
            }))
            .sort((a, b) => b.date - a.date);

        if (files.length === 0) return;

        const lastBackupDate = files[0].date;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // 마지막 백업이 오늘 이전이면 백업 실행
        if (lastBackupDate < today) {
            console.log('놓친 백업 실행');
            await performBackupTask();
        }
    } catch (error) {
        console.error('놓친 백업 체크 중 오류:', error);
    }
};

// 백업 작업 실행 함수
const performBackupTask = async (progressCallback = () => {}, userId = null) => {
    if (isBackupInProgress) {
        throw new Error('다른 백업이 진행 중입니다.');
    }

    try {
        isBackupInProgress = true;

        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }

        if (!checkBackupDirPermissions()) {
            throw new Error('백업 디렉토리에 쓰기 권한이 없습니다.');
        }

        const backupFile = await performBackup(progressCallback, BACKUP_DIR);
        const fileStats = fs.statSync(backupFile);

        // 백업 로그 생성 시 performedBy 필드 조건부 설정
        const logData = {
            type: userId ? '수동' : '자동',
            filename: path.basename(backupFile),
            size: fileStats.size,
            status: '성공'
        };
        
        // performedBy는 userId가 있을 때만 설정
        if (userId) {
            logData.performedBy = userId;
        }

        await BackupLog.create(logData);

        await cleanupOldBackups();
        return backupFile;
    } finally {
        isBackupInProgress = false;
    }
};

// 서버 시작 시 놓친 백업 체크
checkMissedBackup();

// 백업 목록 조회 (로그 포함)
router.get('/list', auth, async (req, res) => {
    try {
        // 백업 디렉토리가 없는 경우에만 생성 시도
        if (!fs.existsSync(BACKUP_DIR)) {
            console.log('백업 디렉토리 생성 시도:', BACKUP_DIR);
            try {
                fs.mkdirSync(BACKUP_DIR, { recursive: true });
                console.log('백업 디렉토리 생성 성공');
            } catch (error) {
                // 디렉토리가 이미 존재하는 경우는 무시
                if (error.code !== 'EEXIST') {
                    console.error('백업 디렉토리 생성 실패:', error);
                    return res.status(500).json({ 
                        message: '백업 디렉토리를 생성할 수 없습니다. 권한을 확인해주세요.',
                        error: error.message 
                    });
                }
            }
        }

        // 디렉토리 내 파일 목록 조회
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.endsWith('.gz'))
            .map(file => ({
                name: file,
                date: fs.statSync(path.join(BACKUP_DIR, file)).mtime,
                size: fs.statSync(path.join(BACKUP_DIR, file)).size
            }))
            .sort((a, b) => b.date - a.date);

        // 각 파일의 최근 로그 정보 조회
        const filesWithLogs = await Promise.all(files.map(async file => {
            const latestLog = await BackupLog.findOne({ filename: file.name })
                .sort({ createdAt: -1 })
                .populate('performedBy', 'name');
            return {
                ...file,
                log: latestLog ? {
                    type: latestLog.type,
                    status: latestLog.status,
                    performedBy: latestLog.performedBy?.name || '알 수 없음',
                    date: latestLog.createdAt
                } : null
            };
        }));

        res.json(filesWithLogs || []);
    } catch (error) {
        console.error('백업 목록 조회 중 에러:', error);
        res.status(500).json({ message: '백업 목록을 불러오는데 실패했습니다.' });
    }
});

// 수동 백업 실행
router.post('/create', auth, async (req, res) => {
    try {
        if (req.user.role !== '관리자') {
            return res.status(403).json({ message: '권한이 없습니다.' });
        }

        // 백업 디렉토리 존재 여부 확인 및 생성
        if (!fs.existsSync(BACKUP_DIR)) {
            try {
                fs.mkdirSync(BACKUP_DIR, { recursive: true });
            } catch (error) {
                throw new Error('백업 디렉토리를 생성할 수 없습니다. 권한을 확인해주세요.');
            }
        }

        // SSE(Server-Sent Events) 설정
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        // 진행률 업데이트 함수
        const sendProgress = (percent) => {
            res.write(`data: ${JSON.stringify({ progress: percent })}\n\n`);
        };

        const backupFile = await performBackupTask(sendProgress, req.user._id);
        const fileStats = fs.statSync(backupFile);

        // 백업 로그 생성
        await BackupLog.create({
            type: '수동',
            filename: path.basename(backupFile),
            size: fileStats.size,
            status: '성공',
            performedBy: req.user._id
        });

        // 오래된 백업 파일 정리
        await cleanupOldBackups();

        // 완료 메시지 전송
        res.write(`data: ${JSON.stringify({ 
            complete: true, 
            message: '백업이 완료되었습니다.',
            file: backupFile 
        })}\n\n`);
        res.end();
    } catch (error) {
        // 실패 로그 생성
        if (error.backupFile) {
            await BackupLog.create({
                type: '수동',
                filename: path.basename(error.backupFile),
                size: 0,
                status: '실패',
                error: error.message,
                performedBy: req.user._id
            });
        }
        res.write(`data: ${JSON.stringify({ 
            error: true, 
            message: error.message || '백업 실패' 
        })}\n\n`);
        res.end();
    }
});

// 백업 파일 복원
router.post('/restore/:filename', auth, async (req, res) => {
    try {
        if (req.user.role !== '관리자') {
            return res.status(403).json({ message: '권한이 없습니다.' });
        }

        const backupFile = path.join(BACKUP_DIR, req.params.filename);
        if (!fs.existsSync(backupFile)) {
            return res.status(404).json({ message: '백업 파일을 찾을 수 없습니다.' });
        }

        // SSE 설정
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        // 진행 상태 전송 함수
        const sendStatus = (status) => {
            res.write(`data: ${JSON.stringify(status)}\n\n`);
        };

        try {
            const result = await restoreBackup(backupFile, sendStatus);

            // 복원 로그 생성
            await BackupLog.create({
                type: '복원',
                filename: req.params.filename,
                performedBy: req.user._id,
                status: '성공',
                size: fs.statSync(backupFile).size
            });

            sendStatus({ 
                complete: true,
                message: '복원이 완료되었습니다.',
                result 
            });
        } catch (error) {
            console.error('복원 실패:', error);
            
            // 실패 로그 생성
            await BackupLog.create({
                type: '복원',
                filename: req.params.filename,
                performedBy: req.user._id,
                status: '실패',
                error: error.message,
                size: fs.statSync(backupFile).size
            });

            sendStatus({ 
                error: true, 
                message: error.message || '복원 중 오류가 발생했습니다.'
            });
        }
        
        res.end();
    } catch (error) {
        console.error('복원 처리 중 오류:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                message: '복원 처리 중 오류가 발생했습니다.',
                error: error.message 
            });
        }
    }
});

// 백업 로그 조회
router.get('/logs', auth, async (req, res) => {
    try {
        if (req.user.role !== '관리자') {
            return res.status(403).json({ message: '권한이 없습니다.' });
        }

        const logs = await BackupLog.find()
            .sort({ createdAt: -1 })
            .populate('performedBy', 'name')
            .limit(100);  // 최근 100개 로그만 조회

        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: '로그 조회 실패' });
    }
});

// 데이터 초기화
router.post('/reset-data', auth, async (req, res) => {
    try {
        if (req.user.role !== '관리자') {
            return res.status(403).json({ message: '권한이 없습니다.' });
        }

        const { MONGODB_URI, MONGODB_DATABASE } = process.env;
        
        if (!MONGODB_URI || !MONGODB_DATABASE) {
            throw new Error('데이터베이스 설정이 올바르지 않습니다.');
        }

        // SSE 설정
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        // 진행 상태 전송 함수
        const sendStatus = (status) => {
            res.write(`data: ${JSON.stringify({ status })}\n\n`);
        };

        sendStatus('데이터베이스 초기화 중...');

        // 데이터베이스 초기화
        await dropDatabase(MONGODB_URI, MONGODB_DATABASE);

        // 초기화 로그 생성
        await BackupLog.create({
            type: '초기화',
            filename: 'N/A',
            size: 0,
            status: '성공',
            performedBy: req.user._id,
            note: '관리자에 의한 수동 초기화'
        });

        res.write(`data: ${JSON.stringify({ 
            complete: true,
            message: '데이터베이스가 초기화되었습니다.'
        })}\n\n`);
        res.end();
    } catch (error) {
        console.error('데이터 초기화 실패:', error);
        
        // 실패 로그 생성
        await BackupLog.create({
            type: '초기화',
            filename: 'N/A',
            size: 0,
            status: '실패',
            error: error.message,
            performedBy: req.user._id,
            note: '초기화 실패'
        });

        res.write(`data: ${JSON.stringify({ 
            error: true, 
            message: error.message || '데이터 초기화 중 오류가 발생했습니다.'
        })}\n\n`);
        res.end();
    }
});

module.exports = router; 