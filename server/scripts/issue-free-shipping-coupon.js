// 현재 가입된 모든 회원에게 배송비 무료 쿠폰을 1장씩 발급 (여러 번 실행해도 중복 발급되지 않음)
// 실행: server 폴더에서  node scripts/issue-free-shipping-coupon.js
// 신규 가입 회원은 가입할 때 자동으로 받으므로 이 스크립트가 필요 없음
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { issueToAllUsers } = require('../services/couponService');

const { resolveMongoUri } = require('../config/db');

// 서버와 같은 규칙으로 DB를 선택 (MONGODB_ATLAS_URL이 있으면 Atlas, 없으면 로컬)
const { uri: MONGODB_URI, target: DB_TARGET } = resolveMongoUri();

(async () => {
  await mongoose.connect(MONGODB_URI);
  console.log(`대상 DB: ${DB_TARGET} (${mongoose.connection.name})`);

  const { total, issued } = await issueToAllUsers();
  console.log(`회원 ${total}명 중 새로 발급: ${issued}명 (이미 보유: ${total - issued}명)`);

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
