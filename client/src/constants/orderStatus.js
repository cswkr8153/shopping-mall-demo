// 주문 상태 (서버 models/Order.js의 STATUSES와 값이 같아야 함. 결제 대기(pending)는 고객/어드민 화면에 보이지 않음)
// 진행 순서: 결제 완료 → 주문 확인 → 상품 준비중 → 배송시작 → 배송 중 → 배송 완료 / 주문 취소
export const ORDER_STATUSES = [
  { value: 'received', label: '결제 완료', tone: 'blue' },
  { value: 'confirmed', label: '주문 확인', tone: 'blue' },
  { value: 'preparing', label: '상품 준비중', tone: 'blue' },
  { value: 'dispatched', label: '배송시작', tone: 'blue' },
  { value: 'shipped', label: '배송 중', tone: 'blue' },
  { value: 'delivered', label: '배송 완료', tone: 'green' },
  { value: 'cancelled', label: '주문 취소', tone: 'gray' },
]

export const ORDER_STATUS = Object.fromEntries(ORDER_STATUSES.map((s) => [s.value, s]))
