const IMP_CODE = import.meta.env.VITE_PORTONE_IMP_CODE
// KG이니시스 일반결제. 포트원 콘솔에서 채널을 따로 지정했다면 .env의 VITE_PORTONE_PG로 바꿀 수 있음
const PG = import.meta.env.VITE_PORTONE_PG || 'html5_inicis'

export const isPortOneConfigured = Boolean(IMP_CODE)

// 포트원 결제창(window.IMP는 index.html의 SDK 스크립트가 제공)을 띄우고 결과를 돌려줌
// PC는 콜백으로 결과가 오고, 모바일은 결제 후 m_redirect_url 페이지로 이동함
export function requestPayment({ order, buyer }) {
  return new Promise((resolve, reject) => {
    if (!window.IMP) {
      reject(new Error('결제 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.'))
      return
    }
    if (!isPortOneConfigured) {
      reject(new Error('결제 설정이 필요합니다. client/.env의 VITE_PORTONE_IMP_CODE를 확인하세요.'))
      return
    }

    const IMP = window.IMP
    IMP.init(IMP_CODE)

    const first = order.items[0]
    const name = order.items.length > 1 ? `${first.name} 외 ${order.items.length - 1}건` : first.name

    IMP.request_pay(
      {
        pg: PG,
        pay_method: 'card',
        merchant_uid: order.orderNumber, // 주문번호 = 결제 건의 고유번호
        name,
        amount: order.totalPrice,
        buyer_name: buyer.name,
        buyer_tel: buyer.tel,
        buyer_email: buyer.email,
        buyer_addr: buyer.addr,
        buyer_postcode: buyer.postcode,
        m_redirect_url: `${window.location.origin}/order/result`,
      },
      (rsp) => resolve(rsp), // { success, imp_uid, merchant_uid, error_msg, ... }
    )
  })
}
