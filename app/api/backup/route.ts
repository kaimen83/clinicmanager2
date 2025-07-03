import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

// 백업 파일 이름 생성 (YYYY-MM-DD_HH-MM-SS.gz 형식)
function getBackupFileName(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `hospital_accounting_db_${year}-${month}-${day}_${hour}-${minute}-${second}.gz`;
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

// mongodump 명령어 존재 여부 확인
async function checkMongodump(): Promise<boolean> {
  try {
    await execAsync('mongodump --version');
    return true;
  } catch (error) {
    return false;
  }
}

// 백업 실행 함수 - SSE로 실시간 진행 상황 전송
export async function POST(req: NextRequest) {
  // 인증 확인
  const user = await currentUser();
  if (!user?.id) {
    return NextResponse.json(
      { error: '인증되지 않은 요청입니다.' },
      { status: 401 }
    );
  }

  // SSE 헤더 설정
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // SSE 메시지 전송 함수
      const sendMessage = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      // 백업 프로세스 실행
      (async () => {
        try {
          sendMessage({ 
            type: 'status', 
            message: '백업 프로세스를 시작합니다...',
            progress: 0 
          });

          // mongodump 명령어 체크
          sendMessage({ 
            type: 'status', 
            message: 'mongodump 도구 확인 중...',
            progress: 10 
          });

          if (!(await checkMongodump())) {
            sendMessage({ 
              type: 'error', 
              message: 'mongodump 명령어를 찾을 수 없습니다. MongoDB Database Tools가 설치되어 있는지 확인해주세요.' 
            });
            controller.close();
            return;
          }

          // 환경변수 확인
          sendMessage({ 
            type: 'status', 
            message: '환경 설정 확인 중...',
            progress: 20 
          });

          const { MONGODB_URI, MONGODB_DATABASE } = process.env;
          if (!MONGODB_URI) {
            sendMessage({ 
              type: 'error', 
              message: 'MONGODB_URI 환경변수가 설정되지 않았습니다.' 
            });
            controller.close();
            return;
          }
          if (!MONGODB_DATABASE) {
            sendMessage({ 
              type: 'error', 
              message: 'MONGODB_DATABASE 환경변수가 설정되지 않았습니다.' 
            });
            controller.close();
            return;
          }

          // 백업 디렉토리 설정 및 생성
          sendMessage({ 
            type: 'status', 
            message: '백업 디렉토리 준비 중...',
            progress: 30 
          });

          const backupDir = getBackupDir();
          if (!fs.existsSync(backupDir)) {
            try {
              fs.mkdirSync(backupDir, { recursive: true });
            } catch (error) {
              sendMessage({ 
                type: 'error', 
                message: '백업 디렉토리를 생성할 수 없습니다. 권한을 확인해주세요.' 
              });
              controller.close();
              return;
            }
          }

          // 백업 파일 경로
          const backupFileName = getBackupFileName();
          const backupFilePath = path.join(backupDir, backupFileName);

          sendMessage({ 
            type: 'status', 
            message: `백업 대상: ${MONGODB_DATABASE} 데이터베이스`,
            progress: 40 
          });

          sendMessage({ 
            type: 'status', 
            message: `백업 파일: ${backupFileName}`,
            progress: 50 
          });

          // mongodump 명령어 실행
          sendMessage({ 
            type: 'status', 
            message: 'MongoDB 데이터 백업 중...',
            progress: 60 
          });

          const cmd = `mongodump --uri="${MONGODB_URI}" --db=${MONGODB_DATABASE} --archive="${backupFilePath}" --gzip`;
          
          try {
            await execAsync(cmd, { timeout: 300000 }); // 5분 타임아웃
            
            sendMessage({ 
              type: 'status', 
              message: '백업 파일 검증 중...',
              progress: 80 
            });

            // 백업 파일 존재 확인
            if (!fs.existsSync(backupFilePath)) {
              throw new Error('백업 파일이 생성되지 않았습니다.');
            }

            const fileStats = fs.statSync(backupFilePath);
            
            sendMessage({ 
              type: 'status', 
              message: '백업 완료!',
              progress: 100 
            });

            // 성공 메시지
            sendMessage({
              type: 'success',
              message: 'hospital_accounting 데이터베이스 백업이 완료되었습니다.',
              fileName: backupFileName,
              filePath: backupFilePath,
              fileSize: fileStats.size,
              timestamp: new Date().toISOString()
            });

          } catch (error: any) {
            console.error('백업 실행 중 오류:', error);
            
            // 실패한 백업 파일이 있다면 삭제
            if (fs.existsSync(backupFilePath)) {
              try {
                fs.unlinkSync(backupFilePath);
              } catch (deleteError) {
                console.error('실패한 백업 파일 삭제 중 오류:', deleteError);
              }
            }

            sendMessage({
              type: 'error',
              message: `백업 실행 실패: ${error.message}`,
              details: error.stderr || error.message
            });
          }

        } catch (error: any) {
          console.error('백업 처리 중 오류:', error);
          sendMessage({
            type: 'error',
            message: '백업 처리 중 오류가 발생했습니다.',
            details: error.message
          });
        } finally {
          controller.close();
        }
      })();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// 백업 파일 목록 조회
export async function GET(req: NextRequest) {
  try {
    // 인증 확인
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      );
    }

    const backupDir = getBackupDir();
    
    // 백업 디렉토리가 없는 경우
    if (!fs.existsSync(backupDir)) {
      return NextResponse.json({
        success: true,
        files: [],
        message: '백업 디렉토리가 존재하지 않습니다.'
      });
    }

    // 백업 파일 목록 조회
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('hospital_accounting_db_') && file.endsWith('.gz'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.modified.getTime() - a.modified.getTime()); // 최신 순으로 정렬

    return NextResponse.json({
      success: true,
      files,
      totalFiles: files.length,
      backupDir
    });
  } catch (error: any) {
    console.error('백업 파일 목록 조회 중 오류:', error);
    return NextResponse.json(
      { error: '백업 파일 목록 조회 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
} 