// 상품 이미지를 실제 사진으로 교체 (scripts/data/product-photos.json: SKU -> 이미지 주소)
//   점검만 (아무것도 쓰지 않음):  node scripts/apply-product-photos.js
//   실제로 교체:                  node scripts/apply-product-photos.js --apply
//
// - 이미 같은 이미지면 건너뜀 (여러 번 실행해도 안전)
// - 서버와 같은 규칙으로 DB를 선택 (MONGODB_ATLAS_URL이 있으면 Atlas, 없으면 로컬)
require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { resolveMongoUri } = require('../config/db');
const photos = require('./data/product-photos.json');

const APPLY = process.argv.includes('--apply');
const { uri, target } = resolveMongoUri();

// 로그에는 주소 전체 대신 마지막 파일 이름만 표시
const short = (url) => (url ? url.split('/').slice(-1)[0] : '(없음)');

(async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log(`${APPLY ? '[실제 교체]' : '[점검만]'} 대상 DB: ${target} (${mongoose.connection.name})\n`);

  let changed = 0;
  let same = 0;
  const notFound = [];
  for (const [sku, image] of Object.entries(photos)) {
    const product = await Product.findOne({ sku });
    if (!product) {
      notFound.push(sku);
      continue;
    }
    if (product.image === image) {
      same += 1;
      continue;
    }
    console.log(`${sku}  ${product.name.slice(0, 30).padEnd(30)}  ${short(product.image)}  ->  ${short(image)}`);
    if (APPLY) await Product.updateOne({ _id: product._id }, { $set: { image } });
    changed += 1;
  }

  console.log(`\n${APPLY ? '교체함' : '교체 예정'}: ${changed}개 | 이미 같음: ${same}개 | DB에 없는 SKU: ${notFound.length ? notFound.join(', ') : '없음'}`);
  await mongoose.disconnect();
})().catch((err) => {
  console.error('실패:', err.message);
  process.exit(1);
});
