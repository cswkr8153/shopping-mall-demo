// 로컬 MongoDB의 데이터를 Atlas로 복사 (로컬 데이터는 그대로 두고, Atlas에 이미 있는 문서는 덮어쓰지 않음)
//
//   점검만 (아무것도 쓰지 않음):  node scripts/migrate-local-to-atlas.js
//   실제로 복사:                  node scripts/migrate-local-to-atlas.js --apply
//
// - 문서의 _id를 그대로 유지하므로 회원/상품/주문/쿠폰 사이의 연결이 끊기지 않음
// - 이미 같은 _id가 Atlas에 있으면 건너뜀 (여러 번 실행해도 안전)
// - 이메일/SKU/쿠폰 코드/주문번호가 같은데 _id가 다른 문서가 Atlas에 있으면 충돌로 보고 건너뜀
require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const mongoose = require('mongoose');
const { LOCAL_URI } = require('../config/db');

const ATLAS_URI = (process.env.MONGODB_ATLAS_URL || '').trim();
const APPLY = process.argv.includes('--apply');

// 복사 순서 (회원 -> 상품 -> 쿠폰 -> 회원 쿠폰 -> 장바구니 -> 주문). 목록에 없는 컬렉션은 뒤에 이어서 복사
const ORDER = ['users', 'products', 'coupons', 'usercoupons', 'carts', 'orders'];
// 컬렉션별로 중복되면 안 되는 값 (unique 인덱스와 같음)
const UNIQUE_KEY = { users: 'email', products: 'sku', coupons: 'code', orders: 'orderNumber' };
const BATCH = 500;

const idKey = (id) => String(id);

(async () => {
  if (!ATLAS_URI) throw new Error('MONGODB_ATLAS_URL이 비어 있습니다. 옮길 대상(Atlas)이 없습니다.');

  const local = await mongoose.createConnection(LOCAL_URI).asPromise();
  const atlas = await mongoose.createConnection(ATLAS_URI, { serverSelectionTimeoutMS: 15000 }).asPromise();
  console.log(`${APPLY ? '[실제 복사]' : '[점검만 - 아무것도 쓰지 않음]'}  로컬 (${local.name})  ->  Atlas (${atlas.name})\n`);

  const names = (await local.db.listCollections().toArray()).map((c) => c.name).filter((n) => !n.startsWith('system.'));
  names.sort((a, b) => (ORDER.indexOf(a) === -1 ? 99 : ORDER.indexOf(a)) - (ORDER.indexOf(b) === -1 ? 99 : ORDER.indexOf(b)));

  const summary = [];
  for (const name of names) {
    const src = local.db.collection(name);
    const dst = atlas.db.collection(name);

    const docs = await src.find({}).toArray();
    const existingIds = new Set((await dst.find({ _id: { $in: docs.map((d) => d._id) } }, { projection: { _id: 1 } }).toArray()).map((d) => idKey(d._id)));
    let toInsert = docs.filter((d) => !existingIds.has(idKey(d._id)));

    // 같은 이메일/SKU/코드/주문번호가 다른 _id로 이미 Atlas에 있으면 충돌
    const conflicts = [];
    const key = UNIQUE_KEY[name];
    if (key && toInsert.length > 0) {
      const values = toInsert.map((d) => d[key]).filter((v) => v !== undefined);
      const clash = await dst.find({ [key]: { $in: values } }, { projection: { _id: 1, [key]: 1 } }).toArray();
      const clashValues = new Set(clash.map((c) => String(c[key])));
      toInsert = toInsert.filter((d) => {
        if (clashValues.has(String(d[key]))) {
          conflicts.push(`${key}=${d[key]}`);
          return false;
        }
        return true;
      });
    }

    let inserted = 0;
    let failed = 0;
    if (APPLY) {
      for (let i = 0; i < toInsert.length; i += BATCH) {
        const chunk = toInsert.slice(i, i + BATCH);
        try {
          const res = await dst.insertMany(chunk, { ordered: false });
          inserted += res.insertedCount;
        } catch (err) {
          inserted += err.result?.insertedCount ?? err.insertedCount ?? 0;
          failed += err.writeErrors?.length ?? chunk.length;
          console.error(`  ! ${name}: ${err.message.split('\n')[0]}`);
        }
      }
    }

    summary.push({ name, local: docs.length, already: existingIds.size, conflicts, willInsert: toInsert.length, inserted, failed });
  }

  console.log('컬렉션'.padEnd(14), '로컬'.padStart(5), 'Atlas에 이미 있음'.padStart(18), '충돌'.padStart(5), APPLY ? '복사됨'.padStart(7) + '실패'.padStart(5) : '복사 예정'.padStart(9));
  for (const s of summary) {
    console.log(s.name.padEnd(14), String(s.local).padStart(5), String(s.already).padStart(18), String(s.conflicts.length).padStart(5), APPLY ? String(s.inserted).padStart(7) + String(s.failed).padStart(5) : String(s.willInsert).padStart(9));
    for (const c of s.conflicts) console.log(`   - 충돌(건너뜀): ${c}`);
  }

  if (APPLY) {
    // 서버가 쓰는 인덱스(이메일/SKU 중복 방지 등)가 Atlas에도 있도록 보장
    await mongoose.disconnect();
    await mongoose.connect(ATLAS_URI, { serverSelectionTimeoutMS: 15000 });
    for (const file of ['User', 'Product', 'Coupon', 'UserCoupon', 'Cart', 'Order']) await require(`../models/${file}`).createIndexes();
    console.log('\n인덱스 확인 완료');
  } else {
    console.log('\n점검만 했습니다. 실제로 복사하려면:  node scripts/migrate-local-to-atlas.js --apply');
  }

  await Promise.all([local.close(), atlas.close(), mongoose.disconnect()]);
})().catch((err) => {
  console.error('실패:', err.message);
  process.exit(1);
});
