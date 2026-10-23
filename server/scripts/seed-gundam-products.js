// 건담 모델 샘플 상품을 DB에 등록 (scripts/data/gundam-products.json)
//   점검만 (아무것도 쓰지 않음):  node scripts/seed-gundam-products.js
//   실제로 등록:                  node scripts/seed-gundam-products.js --apply
//
// - 같은 SKU의 상품이 이미 있으면 건너뜀 (직접 고친 상품을 덮어쓰지 않으므로 여러 번 실행해도 안전)
// - 서버와 같은 규칙으로 DB를 선택 (MONGODB_ATLAS_URL이 있으면 Atlas, 없으면 로컬)
require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { resolveMongoUri } = require('../config/db');
const products = require('./data/gundam-products.json');

const APPLY = process.argv.includes('--apply');
const { uri, target } = resolveMongoUri();

(async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log(`${APPLY ? '[실제 등록]' : '[점검만]'} 대상 DB: ${target} (${mongoose.connection.name})`);

  const existing = new Set((await Product.find({ sku: { $in: products.map((p) => p.sku.toUpperCase()) } }, 'sku')).map((p) => p.sku));
  const toCreate = products.filter((p) => !existing.has(p.sku.toUpperCase()));
  console.log(`데이터 ${products.length}개 중 이미 등록됨 ${products.length - toCreate.length}개, 새로 등록할 것 ${toCreate.length}개`);

  if (APPLY) {
    let created = 0;
    for (const p of toCreate) {
      await Product.create(p); // 스키마 검증 적용. 순서대로 만들어 createdAt이 번호 순이 됨
      created += 1;
    }
    console.log(`등록 완료: ${created}개 (현재 전체 상품 ${await Product.countDocuments()}개)`);
  }

  await mongoose.disconnect();
})().catch((err) => {
  console.error('실패:', err.message);
  process.exit(1);
});
