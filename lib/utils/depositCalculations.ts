import { CardSettlementData } from '@/components/CardSettlement';

/**
 * 입금 처리 계산 유틸리티 함수들
 */

/**
 * 개별 입금액에 대한 수수료와 수수료율을 계산
 * @param salesAmount 매출금액
 * @param actualAmount 실제입금액
 * @returns 계산된 수수료 정보
 */
export function calculateFee(salesAmount: number, actualAmount: number) {
  const fee = salesAmount - actualAmount;
  const feeRate = salesAmount > 0 ? (fee / salesAmount) * 100 : 0;
  
  return {
    fee,
    feeRate: Number(feeRate.toFixed(2))
  };
}

/**
 * 입력값 검증
 * @param actualAmount 실제입금액
 * @param salesAmount 매출금액
 * @returns 검증 결과
 */
export function validateDepositAmount(actualAmount: number, salesAmount: number) {
  // 음수 또는 0 체크
  if (actualAmount <= 0) {
    return {
      isValid: false,
      message: "입금액은 0보다 큰 값을 입력해주세요."
    };
  }
  
  // 매출액보다 10% 이상 큰 경우 경고
  if (actualAmount > salesAmount * 1.1) {
    return {
      isValid: false,
      message: `입금액이 매출액보다 10% 이상 큽니다. 확인해주세요.`,
      requireConfirmation: true
    };
  }
  
  // 수수료율이 10% 이상인 경우 경고
  const feeRate = ((salesAmount - actualAmount) / salesAmount) * 100;
  if (feeRate > 10) {
    return {
      isValid: false,
      message: `수수료율이 ${feeRate.toFixed(1)}%로 매우 높습니다. 확인해주세요.`,
      requireConfirmation: true
    };
  }
  
  return { isValid: true, message: "" };
}

/**
 * 일괄처리를 위한 비율 분배 계산 (반올림 오차 제거)
 * @param items 처리할 항목들
 * @param totalActualAmount 총 실제입금액
 * @returns 각 항목별 분배 결과
 */
export function calculateBulkDistribution(
  items: CardSettlementData[], 
  totalActualAmount: number
) {
  if (items.length === 0) return [];
  
  const totalSales = items.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalFee = totalSales - totalActualAmount;
  
  // 분배 결과를 저장할 배열
  const distributions = [];
  let allocatedActual = 0;
  let allocatedFee = 0;
  
  // 첫 번째부터 n-1번째까지는 반올림 적용
  for (let i = 0; i < items.length - 1; i++) {
    const item = items[i];
    const ratio = item.totalAmount / totalSales;
    const actualAmount = Math.round(totalActualAmount * ratio);
    const fee = item.totalAmount - actualAmount;
    
    distributions.push({
      ...item,
      actualAmount,
      fee,
      feeRate: Number(((fee / item.totalAmount) * 100).toFixed(2))
    });
    
    allocatedActual += actualAmount;
    allocatedFee += fee;
  }
  
  // 마지막 항목은 나머지 모두 할당 (반올림 오차 제거)
  const lastItem = items[items.length - 1];
  const lastActual = totalActualAmount - allocatedActual;
  const lastFee = totalFee - allocatedFee;
  
  distributions.push({
    ...lastItem,
    actualAmount: lastActual,
    fee: lastFee,
    feeRate: Number(((lastFee / lastItem.totalAmount) * 100).toFixed(2))
  });
  
  return distributions;
}

/**
 * 분배 결과 검증
 * @param distributions 분배 결과
 * @param originalTotal 원래 총 매출액
 * @param actualTotal 실제 총 입금액
 * @returns 검증 결과
 */
export function validateDistribution(
  distributions: any[], 
  originalTotal: number, 
  actualTotal: number
) {
  const sumActual = distributions.reduce((sum, d) => sum + d.actualAmount, 0);
  const sumFee = distributions.reduce((sum, d) => sum + d.fee, 0);
  const sumOriginal = sumActual + sumFee;
  
  return {
    isValid: Math.abs(sumActual - actualTotal) < 0.01 && 
             Math.abs(sumOriginal - originalTotal) < 0.01,
    actualSum: sumActual,
    feeSum: sumFee,
    originalSum: sumOriginal,
    roundingError: Math.abs(sumActual - actualTotal)
  };
}

/**
 * 날짜 검증
 * @param depositDate 입금일
 * @param salesDate 매출일
 * @returns 검증 결과
 */
export function validateDepositDate(depositDate: Date, salesDate: Date) {
  const today = new Date();
  const maxFutureDate = new Date();
  maxFutureDate.setMonth(today.getMonth() + 6); // 6개월 후까지 허용
  
  // 매출일보다 이전 날짜인지 체크
  if (depositDate < salesDate) {
    return {
      isValid: false,
      message: "입금일은 매출일 이후로 설정해주세요."
    };
  }
  
  // 너무 먼 미래 날짜인지 체크
  if (depositDate > maxFutureDate) {
    return {
      isValid: false,
      message: "입금일이 너무 먼 미래로 설정되었습니다."
    };
  }
  
  // 주말인지 확인하여 경고
  const dayOfWeek = depositDate.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      isValid: true,
      warning: "입금일이 주말입니다. 은행 영업일을 확인해주세요."
    };
  }
  
  return { isValid: true, message: "" };
}

/**
 * 같은 카드사인지 확인
 * @param items 선택된 항목들
 * @returns 같은 카드사 여부
 */
export function isSameCardCompany(items: CardSettlementData[]): boolean {
  if (items.length <= 1) return true;
  
  const firstCardCompany = items[0]._id.cardCompany;
  return items.every(item => item._id.cardCompany === firstCardCompany);
}

/**
 * 숫자 입력 포맷팅 (천단위 콤마)
 * @param value 입력값
 * @returns 포맷된 문자열
 */
export function formatNumberInput(value: string): string {
  // 숫자만 추출
  const numericValue = value.replace(/[^0-9]/g, '');
  
  // 최대 길이 제한 (10억 원까지)
  if (numericValue.length > 10) {
    return value.slice(0, -1);
  }
  
  // 천 단위 콤마 추가
  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 포맷된 숫자 문자열을 숫자로 변환
 * @param formattedValue 콤마가 포함된 문자열
 * @returns 숫자값
 */
export function parseFormattedNumber(formattedValue: string): number {
  return parseInt(formattedValue.replace(/[^0-9]/g, '')) || 0;
}