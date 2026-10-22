require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { resolveMongoUri } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5001;
// MONGODB_ATLAS_URL이 있으면 Atlas, 없으면 로컬 MongoDB 사용
const { uri: MONGODB_URI, target: DB_TARGET } = resolveMongoUri();

// CORS: 운영(production)에서는 CLIENT_URL(쉼표로 여러 개 가능)에 적힌 주소에서 온 요청만 허용
// 개발 중에는 프록시/포트가 바뀌어도 동작하도록 제한하지 않음
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean);
const restrictOrigins = process.env.NODE_ENV === 'production' && allowedOrigins.length > 0;
if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  console.warn('[cors] CLIENT_URL이 설정되지 않아 모든 출처의 요청을 허용합니다. 운영에서는 클라이언트 주소를 설정하세요.');
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (restrictOrigins && origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ message: '허용되지 않은 출처의 요청입니다.' });
  }
  next();
});
app.use(cors());
app.use(express.json());

// 상태 확인용 (DB 연결 없이 응답)
app.get(['/', '/api'], (req, res) => {
  res.json({ message: 'Shopping mall API is running' });
});

// DB 연결은 요청이 올 때 한 번만 만들고 재사용 (서버리스에서는 함수가 요청마다 깨어나므로 필요)
let connecting = null;
const connectDB = () => {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!connecting) {
    // maxPoolSize: 서버리스는 인스턴스가 여러 개 뜨므로 연결 수를 작게 제한 (Atlas 무료 플랜은 연결 수 한도가 있음)
    connecting = mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000, maxPoolSize: 10 }).catch((err) => {
      connecting = null; // 실패하면 다음 요청에서 다시 시도
      throw err;
    });
  }
  return connecting;
};

app.use(async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error(`MongoDB connection error (${DB_TARGET}):`, err.message);
    res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' });
  }
});

app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/stats', require('./routes/stats'));

// 없는 주소와 처리되지 않은 오류도 JSON으로 응답 (프론트엔드가 message를 읽음)
app.use((_req, res) => {
  res.status(404).json({ message: '요청한 주소를 찾을 수 없습니다.' });
});
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: '요청 형식이 올바르지 않습니다.' });
  console.error(err);
  res.status(500).json({ message: '서버 오류가 발생했습니다.' });
});

// 직접 실행(node index.js, npm run dev)할 때만 포트를 열고, Vercel에서는 app만 내보내서 함수가 처리
if (require.main === module) {
  connectDB()
    .then(() => {
      console.log(`MongoDB connected (${DB_TARGET}: ${mongoose.connection.name})`);
      app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
    })
    .catch((err) => {
      console.error(`MongoDB connection error (${DB_TARGET}):`, err.message);
      process.exit(1);
    });
}

module.exports = app;
