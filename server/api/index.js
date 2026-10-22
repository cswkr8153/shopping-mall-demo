// Vercel 서버리스 함수 진입점: Express 앱을 그대로 내보냄 (모든 요청은 vercel.json의 rewrites로 이 함수에 모임)
module.exports = require('../index');
