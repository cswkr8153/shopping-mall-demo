// 가격 표시: 62,000원
export const formatPrice = (n) => `${Number(n).toLocaleString('ko-KR')}원`

// 정가 대비 할인율(%). 정가가 없거나 판매가 이상이면 0
export const discountRate = (p) => (p.listPrice != null && p.listPrice > p.price ? Math.round((1 - p.price / p.listPrice) * 100) : 0)
