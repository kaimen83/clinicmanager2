import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI 환경 변수가 설정되지 않았습니다.');
}

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DATABASE || 'clinicmanager';

/**
 * 전역 변수 타입 정의
 */
interface CachedMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// 타입 정의를 전역으로 확장
declare global {
  // eslint-disable-next-line no-var
  var mongoose: CachedMongoose | undefined;
}

/**
 * 전역 변수로 mongoose 연결 상태를 유지
 */
let cached: CachedMongoose = (global as any).mongoose || {
  conn: null,
  promise: null,
};

// global.mongoose가 없으면 초기화
if (!global.mongoose) {
  global.mongoose = cached;
}

/**
 * 데이터베이스에 연결하고 연결 객체를 반환
 */
export async function connectToMongoose() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: MONGODB_DB,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// mongoose 모델이 제대로 작동하도록 하는 함수
export default async function dbConnect() {
  await connectToMongoose();
} 