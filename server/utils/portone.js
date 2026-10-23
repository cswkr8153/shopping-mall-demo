// 포트원(아임포트) V1 REST API 호출. 키는 서버 환경변수에서만 읽음
const BASE_URL = 'https://api.iamport.kr';

let cachedToken = null; // { value, expiresAt(ms) }

const call = async (path, { method = 'GET', body, token } = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
};

const getAccessToken = async () => {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60 * 1000) return cachedToken.value;

  const { PORTONE_API_KEY, PORTONE_API_SECRET } = process.env;
  if (!PORTONE_API_KEY || !PORTONE_API_SECRET) throw new Error('PORTONE_API_KEY / PORTONE_API_SECRET 환경변수가 없습니다.');

  const { json } = await call('/users/getToken', {
    method: 'POST',
    body: { imp_key: PORTONE_API_KEY, imp_secret: PORTONE_API_SECRET },
  });
  if (json.code !== 0 || !json.response?.access_token) {
    throw new Error(`포트원 인증 실패: ${json.message || '알 수 없는 오류'}`);
  }
  cachedToken = { value: json.response.access_token, expiresAt: json.response.expired_at * 1000 };
  return cachedToken.value;
};

// 결제 단건 조회. 없으면 null
// 테스트(샌드박스) 결제는 include_sandbox=true 를 붙여야 조회됨. 운영에서는 테스트 결제를 인정하면 안 되므로
// 개발 환경에서만 PORTONE_INCLUDE_SANDBOX=true 로 켤 것
exports.getPayment = async (impUid) => {
  const token = await getAccessToken();
  const query = process.env.PORTONE_INCLUDE_SANDBOX === 'true' ? '?include_sandbox=true' : '';
  const { json } = await call(`/payments/${encodeURIComponent(impUid)}${query}`, { token });
  if (json.code !== 0) return null;
  return json.response;
};

// 주문번호(merchant_uid)로 "결제 완료"된 결제의 결제 번호(imp_uid)를 찾음. 없으면 null
// 주의: 이 조회는 테스트(샌드박스) 결제도 플래그 없이 찾아주므로, 찾은 imp_uid는 반드시 getPayment로 다시 검증해서 써야 함
exports.findPaidImpUid = async (merchantUid) => {
  const token = await getAccessToken();
  const { json } = await call(`/payments/find/${encodeURIComponent(merchantUid)}/paid`, { token });
  return json.code === 0 && json.response?.imp_uid ? json.response.imp_uid : null;
};

// 결제 전체 취소(환불). 성공하면 취소된 결제 정보를 반환
exports.cancelPayment = async (impUid, reason) => {
  const token = await getAccessToken();
  const { json } = await call('/payments/cancel', { method: 'POST', token, body: { imp_uid: impUid, reason } });
  if (json.code !== 0) throw new Error(json.message || '결제 취소에 실패했습니다.');
  return json.response;
};
