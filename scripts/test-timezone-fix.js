#!/usr/bin/env node

/**
 * 시간대 수정 로직 테스트 스크립트
 * 
 * fix-timezone-data.js의 주요 함수들을 테스트합니다.
 */

const { isIncorrectTimezonePattern, fixTimezone, CONFIG } = require('./fix-timezone-data');

console.log('🧪 시간대 수정 로직 테스트 시작\n');

// 테스트 케이스들
const testCases = [
  {
    name: '잘못된 패턴: 2025-07-20T15:00:00.000Z (전날 15시)',
    input: new Date('2025-07-20T15:00:00.000Z'),
    expectedCorrection: new Date('2025-07-21T00:00:00.000Z'),
    shouldBeIncorrect: true
  },
  {
    name: '올바른 패턴: 2025-07-21T00:00:00.000Z (자정)',
    input: new Date('2025-07-21T00:00:00.000Z'),
    expectedCorrection: new Date('2025-07-21T00:00:00.000Z'),
    shouldBeIncorrect: false
  },
  {
    name: '다른 시간: 2025-07-21T09:30:00.000Z (오전 9시 30분)',
    input: new Date('2025-07-21T09:30:00.000Z'),
    expectedCorrection: new Date('2025-07-21T09:30:00.000Z'),
    shouldBeIncorrect: false
  },
  {
    name: '15시이지만 분/초가 다름: 2025-07-20T15:30:15.000Z',
    input: new Date('2025-07-20T15:30:15.000Z'),
    expectedCorrection: new Date('2025-07-20T15:30:15.000Z'),
    shouldBeIncorrect: false
  },
  {
    name: '다른 날 15시 정각: 2025-06-15T15:00:00.000Z',
    input: new Date('2025-06-15T15:00:00.000Z'),
    expectedCorrection: new Date('2025-06-16T00:00:00.000Z'),
    shouldBeIncorrect: true
  },
  {
    name: 'null 값',
    input: null,
    expectedCorrection: null,
    shouldBeIncorrect: false
  },
  {
    name: 'undefined 값',
    input: undefined,
    expectedCorrection: undefined,
    shouldBeIncorrect: false
  }
];

let passedTests = 0;
let totalTests = testCases.length;

// 각 테스트 케이스 실행
testCases.forEach((testCase, index) => {
  console.log(`📋 테스트 ${index + 1}: ${testCase.name}`);
  console.log(`   입력: ${testCase.input ? testCase.input.toISOString() : testCase.input}`);
  
  let testPassed = true;
  
  try {
    // 잘못된 패턴 감지 테스트
    const isIncorrect = isIncorrectTimezonePattern(testCase.input);
    console.log(`   잘못된 패턴 감지: ${isIncorrect} (예상: ${testCase.shouldBeIncorrect})`);
    
    if (isIncorrect !== testCase.shouldBeIncorrect) {
      console.log(`   ❌ 패턴 감지 실패`);
      testPassed = false;
    }
    
    // 날짜 수정 테스트
    const corrected = fixTimezone(testCase.input);
    console.log(`   수정 결과: ${corrected ? corrected.toISOString() : corrected}`);
    console.log(`   예상 결과: ${testCase.expectedCorrection ? testCase.expectedCorrection.toISOString() : testCase.expectedCorrection}`);
    
    // 결과 비교
    const resultsMatch = (corrected === null && testCase.expectedCorrection === null) ||
                        (corrected === undefined && testCase.expectedCorrection === undefined) ||
                        (corrected && testCase.expectedCorrection && 
                         corrected.getTime() === testCase.expectedCorrection.getTime());
    
    if (!resultsMatch) {
      console.log(`   ❌ 수정 결과 불일치`);
      testPassed = false;
    }
    
    if (testPassed) {
      console.log(`   ✅ 테스트 통과`);
      passedTests++;
    }
    
  } catch (error) {
    console.log(`   ❌ 테스트 중 오류: ${error.message}`);
    testPassed = false;
  }
  
  console.log('');
});

// 테스트 결과 요약
console.log('📊 테스트 결과 요약:');
console.log(`   통과: ${passedTests}/${totalTests}`);
console.log(`   실패: ${totalTests - passedTests}/${totalTests}`);

if (passedTests === totalTests) {
  console.log('🎉 모든 테스트가 통과했습니다!');
} else {
  console.log('⚠️ 일부 테스트가 실패했습니다. 코드를 확인해주세요.');
  process.exit(1);
}

// 설정 검증
console.log('\n⚙️ 설정 검증:');
console.log(`   MongoDB URI: ${CONFIG.MONGODB_URI}`);
console.log(`   데이터베이스: ${CONFIG.DATABASE_NAME}`);
console.log(`   컬렉션들: ${CONFIG.COLLECTIONS.join(', ')}`);
console.log(`   날짜 필드 매핑:`);
Object.entries(CONFIG.DATE_FIELDS).forEach(([collection, field]) => {
  console.log(`     ${collection}: ${field}`);
});

console.log('\n✅ 모든 검증이 완료되었습니다!');

// 실제 사용법 안내
console.log('\n💡 사용법:');
console.log('   미리보기: node fix-timezone-data.js --dry-run');
console.log('   실제 수정: node fix-timezone-data.js');
console.log('   도움말: node fix-timezone-data.js --help');