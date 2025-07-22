#!/usr/bin/env node

/**
 * 레거시 시간대 데이터 수정 스크립트
 * 
 * 이 스크립트는 잘못 저장된 한국 시간대 데이터를 수정합니다.
 * 문제: KST 자정(00:00)이 UTC 15:00 전날로 저장된 경우
 * 해결: 올바른 UTC 00:00:00으로 변경
 * 
 * 사용법:
 *   node fix-timezone-data.js
 *   node fix-timezone-data.js --dry-run    # 미리보기만 (실제 수정하지 않음)
 *   node fix-timezone-data.js --database your_db_name
 */

const { MongoClient } = require('mongodb');

// 설정 (환경변수 또는 기본값)
const CONFIG = {
  // MongoDB 연결 URL (환경변수 또는 직접 설정)
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  
  // 데이터베이스 이름 (환경변수 또는 직접 설정)
  DATABASE_NAME: process.env.DATABASE_NAME || 'hospital_accounting',
  
  // 수정 대상 컬렉션들
  COLLECTIONS: ['transactions', 'expenses', 'extraincomes', 'cashrecords', 'consultations'],
  
  // 날짜 필드명 (컬렉션별로 다를 수 있음)
  DATE_FIELDS: {
    transactions: 'date',
    expenses: 'date', 
    extraincomes: 'date',
    cashrecords: 'date',
    consultations: 'date'
  }
};

/**
 * 명령행 인수 파싱
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    database: CONFIG.DATABASE_NAME,
    collections: CONFIG.COLLECTIONS,
    help: false
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--database':
        if (i + 1 < args.length) {
          options.database = args[++i];
        }
        break;
      case '--collections':
        if (i + 1 < args.length) {
          options.collections = args[++i].split(',');
        }
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }
  
  return options;
}

/**
 * 도움말 표시
 */
function showHelp() {
  console.log(`
레거시 시간대 데이터 수정 스크립트

사용법:
  node fix-timezone-data.js [옵션]

옵션:
  --dry-run                미리보기만 실행 (실제 수정하지 않음)
  --database <name>        대상 데이터베이스 이름 (기본값: hospital_accounting)
  --collections <list>     수정할 컬렉션들 (쉼표로 구분, 기본값: 모든 컬렉션)
  --help, -h              이 도움말 표시

환경변수:
  MONGODB_URI             MongoDB 연결 URL (기본값: mongodb://localhost:27017)
  DATABASE_NAME           데이터베이스 이름 (기본값: hospital_accounting)

예제:
  node fix-timezone-data.js --dry-run
  node fix-timezone-data.js --database my_clinic_db
  node fix-timezone-data.js --collections transactions,expenses
  MONGODB_URI="mongodb://user:pass@localhost:27017" node fix-timezone-data.js
`);
}

/**
 * 날짜가 15:00:00 패턴인지 확인
 */
function isIncorrectTimezonePattern(date) {
  if (!date || !(date instanceof Date)) return false;
  return date.getUTCHours() === 15 && 
         date.getUTCMinutes() === 0 && 
         date.getUTCSeconds() === 0;
}

/**
 * 15:00:00 UTC를 다음날 00:00:00 UTC로 수정
 */
function fixTimezone(date) {
  if (!isIncorrectTimezonePattern(date)) return date;
  
  const correctedDate = new Date(date);
  correctedDate.setUTCDate(correctedDate.getUTCDate() + 1);
  correctedDate.setUTCHours(0, 0, 0, 0);
  
  return correctedDate;
}

/**
 * 컬렉션에서 잘못된 시간대 데이터 찾기
 */
async function findIncorrectData(db, collectionName, dateField) {
  console.log(`\n🔍 ${collectionName} 컬렉션에서 잘못된 시간대 데이터 검색 중...`);
  
  const collection = db.collection(collectionName);
  
  // 15:00:00 패턴의 데이터 찾기
  const pipeline = [
    {
      $match: {
        [dateField]: { $exists: true }
      }
    },
    {
      $addFields: {
        hour: { $hour: `$${dateField}` },
        minute: { $minute: `$${dateField}` },
        second: { $second: `$${dateField}` }
      }
    },
    {
      $match: {
        hour: 15,
        minute: 0,
        second: 0
      }
    },
    {
      $project: {
        [dateField]: 1,
        hour: 1,
        minute: 1,
        second: 1,
        // 추가 컨텍스트 필드들
        ...(collectionName === 'transactions' && { patientName: 1, chartNumber: 1 }),
        ...(collectionName === 'expenses' && { description: 1, amount: 1 }),
        ...(collectionName === 'extraincomes' && { description: 1, amount: 1 }),
        ...(collectionName === 'cashrecords' && { type: 1, amount: 1 })
      }
    }
  ];
  
  const results = await collection.aggregate(pipeline).toArray();
  
  console.log(`   찾은 문서 수: ${results.length}개`);
  
  if (results.length > 0) {
    // 샘플 데이터 표시
    console.log('   샘플 데이터:');
    results.slice(0, 3).forEach((doc, index) => {
      const originalDate = doc[dateField];
      const fixedDate = fixTimezone(originalDate);
      console.log(`     ${index + 1}. ID: ${doc._id}`);
      console.log(`        원본: ${originalDate.toISOString()}`);
      console.log(`        수정: ${fixedDate.toISOString()}`);
      if (doc.patientName) console.log(`        환자: ${doc.patientName} (${doc.chartNumber})`);
      if (doc.description) console.log(`        설명: ${doc.description}`);
    });
    if (results.length > 3) {
      console.log(`     ... 그 외 ${results.length - 3}개`);
    }
  }
  
  return results;
}

/**
 * 잘못된 데이터 수정
 */
async function fixIncorrectData(db, collectionName, dateField, documents, dryRun = false) {
  if (documents.length === 0) return 0;
  
  console.log(`\n🔧 ${collectionName} 컬렉션 데이터 ${dryRun ? '수정 시뮬레이션' : '수정'} 중...`);
  
  const collection = db.collection(collectionName);
  let updatedCount = 0;
  
  // 배치 업데이트를 위한 bulk operations
  const bulkOperations = documents.map(doc => {
    const originalDate = doc[dateField];
    const fixedDate = fixTimezone(originalDate);
    
    return {
      updateOne: {
        filter: { _id: doc._id },
        update: { 
          $set: { 
            [dateField]: fixedDate,
            // 수정 이력 추가
            __timezoneFixed: {
              at: new Date(),
              from: originalDate,
              to: fixedDate,
              script: 'fix-timezone-data.js'
            }
          }
        }
      }
    };
  });
  
  if (dryRun) {
    console.log(`   DRY RUN: ${bulkOperations.length}개 문서가 수정될 예정입니다.`);
    updatedCount = bulkOperations.length;
  } else {
    if (bulkOperations.length > 0) {
      const result = await collection.bulkWrite(bulkOperations);
      updatedCount = result.modifiedCount;
      console.log(`   실제 수정된 문서 수: ${updatedCount}개`);
    }
  }
  
  return updatedCount;
}

/**
 * 수정 결과 검증
 */
async function verifyFix(db, collectionName, dateField) {
  console.log(`\n✅ ${collectionName} 컬렉션 수정 결과 검증 중...`);
  
  const collection = db.collection(collectionName);
  
  // 15:00:00 패턴이 남아있는지 확인
  const remainingIncorrect = await collection.countDocuments({
    $expr: {
      $and: [
        { $eq: [{ $hour: `$${dateField}` }, 15] },
        { $eq: [{ $minute: `$${dateField}` }, 0] },
        { $eq: [{ $second: `$${dateField}` }, 0] }
      ]
    }
  });
  
  // 수정된 문서 수 확인
  const fixedCount = await collection.countDocuments({
    '__timezoneFixed': { $exists: true }
  });
  
  console.log(`   남은 잘못된 데이터: ${remainingIncorrect}개`);
  console.log(`   수정 완료된 데이터: ${fixedCount}개`);
  
  return { remainingIncorrect, fixedCount };
}

/**
 * 메인 실행 함수
 */
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  console.log('🚀 레거시 시간대 데이터 수정 스크립트 시작');
  console.log(`📊 설정:`);
  console.log(`   MongoDB URI: ${CONFIG.MONGODB_URI}`);
  console.log(`   데이터베이스: ${options.database}`);
  console.log(`   컬렉션: ${options.collections.join(', ')}`);
  console.log(`   모드: ${options.dryRun ? 'DRY RUN (미리보기)' : '실제 수정'}`);
  
  let client;
  
  try {
    // MongoDB 연결
    console.log('\n🔌 MongoDB 연결 중...');
    client = new MongoClient(CONFIG.MONGODB_URI);
    await client.connect();
    
    const db = client.db(options.database);
    console.log('✅ MongoDB 연결 성공');
    
    let totalFound = 0;
    let totalFixed = 0;
    const summary = {};
    
    // 각 컬렉션 처리
    for (const collectionName of options.collections) {
      const dateField = CONFIG.DATE_FIELDS[collectionName] || 'date';
      
      try {
        // 컬렉션 존재 확인
        const collections = await db.listCollections({ name: collectionName }).toArray();
        if (collections.length === 0) {
          console.log(`⚠️  컬렉션 '${collectionName}'이 존재하지 않습니다. 건너뜁니다.`);
          continue;
        }
        
        // 잘못된 데이터 찾기
        const incorrectDocs = await findIncorrectData(db, collectionName, dateField);
        totalFound += incorrectDocs.length;
        
        // 데이터 수정
        const fixedCount = await fixIncorrectData(db, collectionName, dateField, incorrectDocs, options.dryRun);
        totalFixed += fixedCount;
        
        // 결과 검증 (실제 수정한 경우만)
        if (!options.dryRun && incorrectDocs.length > 0) {
          const verification = await verifyFix(db, collectionName, dateField);
          summary[collectionName] = {
            found: incorrectDocs.length,
            fixed: fixedCount,
            remaining: verification.remainingIncorrect,
            totalFixed: verification.fixedCount
          };
        } else {
          summary[collectionName] = {
            found: incorrectDocs.length,
            fixed: fixedCount,
            remaining: 0,
            totalFixed: 0
          };
        }
        
      } catch (error) {
        console.error(`❌ 컬렉션 '${collectionName}' 처리 중 오류:`, error.message);
        continue;
      }
    }
    
    // 최종 요약
    console.log('\n📋 최종 결과 요약:');
    console.log('='.repeat(60));
    
    let hasIssues = false;
    
    for (const [collectionName, stats] of Object.entries(summary)) {
      console.log(`${collectionName}:`);
      console.log(`  찾은 문제 데이터: ${stats.found}개`);
      console.log(`  수정된 데이터: ${stats.fixed}개`);
      if (!options.dryRun) {
        console.log(`  남은 문제 데이터: ${stats.remaining}개`);
        console.log(`  총 수정 완료: ${stats.totalFixed}개`);
        if (stats.remaining > 0) hasIssues = true;
      }
      console.log('');
    }
    
    console.log(`전체 통계:`);
    console.log(`  총 찾은 문제 데이터: ${totalFound}개`);
    console.log(`  총 수정된 데이터: ${totalFixed}개`);
    
    if (options.dryRun) {
      console.log('\n💡 실제 수정을 원하시면 --dry-run 옵션을 제거하고 다시 실행하세요.');
    } else if (hasIssues) {
      console.log('\n⚠️  일부 데이터가 수정되지 않았습니다. 로그를 확인해주세요.');
      process.exit(1);
    } else if (totalFixed > 0) {
      console.log('\n✅ 모든 시간대 데이터 수정이 완료되었습니다!');
    } else {
      console.log('\n✅ 수정이 필요한 데이터가 없습니다. 모든 데이터가 정상입니다.');
    }
    
  } catch (error) {
    console.error('❌ 스크립트 실행 중 오류 발생:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB 연결 종료');
    }
  }
}

// 스크립트가 직접 실행될 때만 main 함수 실행
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  isIncorrectTimezonePattern,
  fixTimezone,
  CONFIG
};