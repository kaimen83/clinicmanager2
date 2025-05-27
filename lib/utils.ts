import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 한국 시간(KST)으로 Date 객체를 생성하거나 변환하는 유틸리티 함수들
 */

// 현재 시간을 한국 시간으로 반환
export function getCurrentKstDate(): Date {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (9 * 60 * 60 * 1000)); // UTC+9 (한국 시간)
}

// Date 객체 또는 날짜 문자열을 한국 시간으로 변환
export function toKstDate(date: Date | string | number | null | undefined): Date {
  if (!date) return getCurrentKstDate();
  
  const parsedDate = date instanceof Date ? date : new Date(date);
  
  // 이미 한국 시간으로 입력된 날짜 문자열인 경우 (YYYY-MM-DD 형태)
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day); // 로컬 시간으로 생성
  }
  
  // UTC 시간을 한국 시간으로 변환
  const utc = parsedDate.getTime() + (parsedDate.getTimezoneOffset() * 60000);
  return new Date(utc + (9 * 60 * 60 * 1000)); // UTC+9 (한국 시간)
}

// Date 객체를 ISO 문자열(YYYY-MM-DD)로 변환 (한국 시간 기준으로 정확히 처리)
export function toISODateString(date: Date | string | number | null | undefined): string {
  const kstDate = toKstDate(date);
  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Date 객체를 한국 로컬 형식으로 변환 (YYYY년 MM월 DD일)
export function toKoreanDateString(
  date: Date | string | number | null | undefined, 
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
): string {
  if (!date) return '';
  const kstDate = toKstDate(date);
  return kstDate.toLocaleDateString('ko-KR', options);
}

// Date 객체를 생성 (MongoDB와의 호환성을 위해)
export function createNewDate(): Date {
  return getCurrentKstDate();
}
