#!/usr/bin/env node

// 환자분석 최적화 스크립트
// 사용법: node scripts/optimize-patient-analysis.js

const https = require('https');

const HOST = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3001';

async function makeRequest(endpoint, data) {
  return new Promise((resolve, reject) => {
    // Add automation key to data
    const dataWithAuth = { ...data, automationKey: 'optimize-patient-analysis-2024' };
    const postData = JSON.stringify(dataWithAuth);
    const url = new URL(endpoint, HOST);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-automation-key': 'optimize-patient-analysis-2024'
      }
    };

    const client = url.protocol === 'https:' ? https : require('http');
    
    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: result });
        } catch (error) {
          reject(new Error(`JSON 파싱 오류: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

async function optimizeIndexes() {
  console.log('🔧 MongoDB 인덱스 최적화 시작...');
  
  try {
    const response = await makeRequest('/api/admin/optimize-indexes', {});
    
    if (response.status === 200) {
      console.log('✅ 인덱스 최적화 완료');
      console.log('📊 결과:', response.data.results);
      console.log('📋 현재 인덱스:', response.data.currentIndexes);
    } else {
      console.error('❌ 인덱스 최적화 실패:', response.data.error);
    }
  } catch (error) {
    console.error('❌ 인덱스 최적화 중 오류:', error.message);
  }
}

async function generateSummaryData() {
  console.log('📊 요약 데이터 생성 시작...');
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  
  const periods = [
    // 현재 월, 직전 월, 전년 동월
    { periodType: 'month', year: currentYear, month: currentMonth },
    { periodType: 'month', year: currentYear, month: currentMonth - 1 === 0 ? 12 : currentMonth - 1 },
    { periodType: 'month', year: currentYear - 1, month: currentMonth },
    
    // 현재 분기, 직전 분기, 전년 동분기
    { periodType: 'quarter', year: currentYear, quarter: currentQuarter },
    { periodType: 'quarter', year: currentYear, quarter: currentQuarter - 1 === 0 ? 4 : currentQuarter - 1 },
    { periodType: 'quarter', year: currentYear - 1, quarter: currentQuarter },
    
    // 현재 연도, 직전 연도
    { periodType: 'year', year: currentYear },
    { periodType: 'year', year: currentYear - 1 }
  ];
  
  for (const period of periods) {
    try {
      console.log(`📋 ${period.periodType} ${period.year}${period.month ? `-${period.month}` : ''}${period.quarter ? `-Q${period.quarter}` : ''} 처리 중...`);
      
      const response = await makeRequest('/api/patient-analysis/generate-summary', {
        ...period,
        force: true
      });
      
      if (response.status === 200) {
        console.log(`✅ ${period.periodType} 요약 데이터 생성 완료`);
      } else {
        console.error(`❌ ${period.periodType} 요약 데이터 생성 실패:`, response.data.error);
      }
      
      // API 부하 방지를 위한 지연
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ ${period.periodType} 요약 데이터 생성 중 오류:`, error.message);
    }
  }
}

async function main() {
  console.log('🚀 환자분석 최적화 스크립트 시작');
  console.log(`🌐 대상 서버: ${HOST}`);
  
  await optimizeIndexes();
  console.log('');
  await generateSummaryData();
  
  console.log('');
  console.log('🎉 환자분석 최적화 완료!');
  console.log('💡 이제 환자분석 페이지가 더 빠르게 로드됩니다.');
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 스크립트 실행 중 치명적 오류:', error);
    process.exit(1);
  });
}

module.exports = { optimizeIndexes, generateSummaryData };