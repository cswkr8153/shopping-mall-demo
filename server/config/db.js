const LOCAL_URI = 'mongodb://127.0.0.1:27017/shopping-mall-demo';

exports.LOCAL_URI = LOCAL_URI;

// MongoDB 주소 결정: MONGODB_ATLAS_URL을 기본으로 사용하고, 값이 없거나 비어 있으면 로컬 주소를 사용
// 서버(index.js)와 스크립트가 같은 DB를 보도록 이 함수를 함께 사용할 것
// target은 로그에 표시할 용도 (주소에는 비밀번호가 들어 있으므로 주소 자체는 출력하지 않음)
exports.resolveMongoUri = (env = process.env) => {
  const atlasUrl = (env.MONGODB_ATLAS_URL || '').trim();
  return atlasUrl ? { uri: atlasUrl, target: 'Atlas' } : { uri: LOCAL_URI, target: '로컬' };
};
