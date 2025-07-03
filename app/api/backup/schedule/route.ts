import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import * as cron from 'node-cron';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

// 전역 상태 관리 (메모리 기반)
const globalState = {
  isBackupInProgress: false,
  isScheduleActive: false,
  scheduledTask: null as cron.ScheduledTask | null,
  lastScheduleTime: null as Date | null
};

// 서버 재시작 시에도 스케줄 복원
if (typeof global !== 'undefined') {
  if (!(global as any).backupScheduleState) {
    (global as any).backupScheduleState = globalState;
  }
}

// 백업 파일 이름 생성
function getBackupFileName(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `hospital_accounting_db_auto_${year}-${month}-${day}.gz`;
}

// 백업 디렉토리 경로 설정
function getBackupDir(): string {
  if (process.platform === 'win32') {
    return process.env.BACKUP_DIR_WINDOWS || 'C:\\backup\\dropbox';
  } else {
    const unixPath = process.env.BACKUP_DIR_UNIX || 'backup/dropbox';
    if (unixPath.startsWith('/')) {
      return unixPath;
    }
    return path.join(os.homedir(), unixPath);
  }
}

// 오래된 백업 파일 정리
async function cleanupOldBackups(): Promise<void> {
  try {
    const backupDir = getBackupDir();
    const maxBackupFiles = 30; // 최대 30개 백업 파일 유지
    
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('hospital_accounting_db_') && file.endsWith('.gz'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        date: fs.statSync(path.join(backupDir, file)).mtime
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // 최신 순으로 정렬

    // 최대 개수를 초과하는 오래된 파일들 삭제
    if (files.length > maxBackupFiles) {
      const filesToDelete = files.slice(maxBackupFiles);
      for (const file of filesToDelete) {
        try {
          fs.unlinkSync(file.path);
          console.log(`오래된 백업 파일 삭제: ${file.name}`);
        } catch (error) {
          console.error(`파일 삭제 실패 (${file.name}):`, error);
        }
      }
    }
  } catch (error) {
    console.error('백업 파일 정리 중 오류:', error);
  }
}

// 전역 상태 가져오기
function getGlobalState() {
  return (global as any).backupScheduleState || globalState;
}

// 자동 백업 실행 함수
async function performAutoBackup(): Promise<void> {
  const state = getGlobalState();
  
  if (state.isBackupInProgress) {
    console.log('다른 백업이 진행 중입니다.');
    return;
  }

  try {
    state.isBackupInProgress = true;
    console.log('자동 백업 시작:', new Date().toISOString());

    const { MONGODB_URI, MONGODB_DATABASE } = process.env;
    if (!MONGODB_URI || !MONGODB_DATABASE) {
      throw new Error('MongoDB 환경변수가 설정되지 않았습니다.');
    }

    // 백업 디렉토리 설정 및 생성
    const backupDir = getBackupDir();
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 오늘 날짜로 백업 파일이 이미 있는지 확인
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayPrefix = `hospital_accounting_db_auto_${todayStr}`;
    
    const existingFiles = fs.readdirSync(backupDir)
      .filter(file => file.startsWith(todayPrefix) && file.endsWith('.gz'));
    
    if (existingFiles.length > 0) {
      console.log('오늘 자동 백업이 이미 존재합니다:', existingFiles[0]);
      return;
    }

    // 백업 파일 경로
    const backupFileName = getBackupFileName();
    const backupFilePath = path.join(backupDir, backupFileName);

    // mongodump 명령어 실행 - 전체 데이터베이스 백업
    const cmd = `mongodump --uri="${MONGODB_URI}" --db=${MONGODB_DATABASE} --archive="${backupFilePath}" --gzip`;
    
    await execAsync(cmd, { timeout: 300000 }); // 5분 타임아웃
    
    // 백업 파일 존재 확인
    if (!fs.existsSync(backupFilePath)) {
      throw new Error('백업 파일이 생성되지 않았습니다.');
    }

    const fileStats = fs.statSync(backupFilePath);
    console.log('자동 백업 완료:', new Date().toISOString());
    console.log('백업 파일:', backupFileName);
    console.log('파일 크기:', fileStats.size, 'bytes');

    // 오래된 백업 파일 정리
    await cleanupOldBackups();

  } catch (error: any) {
    console.error('자동 백업 실패:', error);
  } finally {
    state.isBackupInProgress = false;
  }
}

// 스케줄 시작
export async function POST(req: NextRequest) {
  try {
    // 인증 확인
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      );
    }

    const state = getGlobalState();
    const body = await req.json();
    const { action, schedule } = body;

    if (action === 'start') {
      // 기존 스케줄이 있다면 중지
      if (state.scheduledTask) {
        state.scheduledTask.stop();
        state.scheduledTask = null;
      }

      // 새 스케줄 시작 (기본값: 매일 새벽 2시)
      const cronSchedule = schedule || '0 2 * * *';
      
      state.scheduledTask = cron.schedule(cronSchedule, async () => {
        await performAutoBackup();
      }, {
        timezone: 'Asia/Seoul'
      });
      
      state.isScheduleActive = true;
      state.lastScheduleTime = new Date();

      console.log(`자동 백업 스케줄 시작: ${cronSchedule}`);
      
      return NextResponse.json({
        success: true,
        message: '자동 백업 스케줄이 시작되었습니다.',
        schedule: cronSchedule,
        timezone: 'Asia/Seoul',
        isScheduled: true
      });

    } else if (action === 'stop') {
      if (state.scheduledTask) {
        state.scheduledTask.stop();
        state.scheduledTask = null;
        state.isScheduleActive = false;
        console.log('자동 백업 스케줄 중지');
        
        return NextResponse.json({
          success: true,
          message: '자동 백업 스케줄이 중지되었습니다.',
          isScheduled: false
        });
      } else {
        return NextResponse.json({
          success: true,
          message: '실행 중인 스케줄이 없습니다.',
          isScheduled: false
        });
      }

    } else if (action === 'status') {
      const isScheduled = state.scheduledTask !== null && state.isScheduleActive;
      return NextResponse.json({
        success: true,
        isScheduled: isScheduled,
        isBackupInProgress: state.isBackupInProgress,
        lastScheduleTime: state.lastScheduleTime,
        nextRun: isScheduled ? 'Next run calculated by cron' : null
      });

    } else {
      return NextResponse.json(
        { error: '잘못된 액션입니다. (start, stop, status 중 하나를 선택하세요)' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('스케줄 관리 중 오류:', error);
    return NextResponse.json(
      { error: '스케줄 관리 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

// 스케줄 상태 조회
export async function GET(_req: NextRequest) {
  try {
    // 인증 확인
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      );
    }

    const state = getGlobalState();
    const isScheduled = state.scheduledTask !== null && state.isScheduleActive;

    return NextResponse.json({
      success: true,
      isScheduled: isScheduled,
      isBackupInProgress: state.isBackupInProgress,
      backupDir: getBackupDir(),
      lastScheduleTime: state.lastScheduleTime
    });

  } catch (error: any) {
    console.error('스케줄 상태 조회 중 오류:', error);
    return NextResponse.json(
      { error: '스케줄 상태 조회 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}