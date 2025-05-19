import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB = process.env.MONGODB_DATABASE || '';

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI를 환경 변수에 설정해야 합니다.');
}

if (!MONGODB_DB) {
  throw new Error('MONGODB_DATABASE를 환경 변수에 설정해야 합니다.');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase() {
  // 캐시된 연결이 있으면 재사용
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // 연결 생성
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB);

  // 연결 캐싱
  cachedClient = client;
  cachedDb = db;

  return { client, db };
} 