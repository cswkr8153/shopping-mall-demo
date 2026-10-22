import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { openAddressSearch } from '../utils/daumPostcode'
import { requestPayment } from '../utils/portone'
import { isLoggedIn, useCart } from '../context/CartContext'
import './MainPage.css'
import './CheckoutPage.css'

// 서버(orderController)의 배송비 규칙과 같아야 함 (실제 금액 계산은 서버가 다시 함)
const FREE_SHIPPING_FROM = 100000
const SHIPPING_FEE = 3000

const STEPS = ['배송 정보', '주문 확인', '주문 완료']
const EMPTY_FORM = { recipient: '', phone: '', zip_code: '', address1: '', address2: '', memo: '' }

const won = (n) => `₩${n.toLocaleString('ko-KR')}`

const TruckIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
)

function CheckoutPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { cart, loadCart } = useCart()

  // 상세 페이지에서 '바로 구매'로 온 경우 state.items, 장바구니에서 온 경우 없음
  const directItems = state?.items
  const [directLines, setDirectLines] = useState([])
  const [ready, setReady] = useState(false)

  const [step, setStep] = useState(1)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [order, setOrder] = useState(null) // 결제 대기 중이거나 결제 완료된 주문
  const [me, setMe] = useState(null)
  const [paidUid, setPaidUid] = useState(null) // 결제는 끝났지만 서버 확인이 아직 안 된 결제 번호
  const [coupons, setCoupons] = useState([]) // 사용 가능한 내 쿠폰
  const [couponId, setCouponId] = useState('') // 선택한 쿠폰 (없으면 '')

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login', { replace: true })
      return
    }

    api
      .get('/coupons/my')
      .then(({ data }) => setCoupons(data))
      .catch(() => {})

    // 받는 사람 기본값: 로그인한 회원 이름
    api
      .get('/auth/me')
      .then(({ data }) => {
        setMe(data)
        setForm((prev) => (prev.recipient ? prev : { ...prev, recipient: data.name }))
      })
      .catch(() => {})

    if (directItems?.length) {
      Promise.all(directItems.map((i) => api.get(`/products/${i.productId}`)))
        .then((responses) => setDirectLines(responses.map((res, idx) => ({ product: res.data, quantity: directItems[idx].quantity }))))
        .catch(() => setMessage('상품 정보를 불러오지 못했습니다.'))
        .finally(() => setReady(true))
    } else {
      loadCart().finally(() => setReady(true))
    }
  }, [navigate, directItems, loadCart])

  const lines = directItems?.length ? directLines : cart.items
  const itemsTotal = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0)
  const shippingFee = itemsTotal === 0 || itemsTotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE
  const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0)

  // 배송비 무료 쿠폰: 배송비가 있을 때만 적용되고, 할인액은 배송비만큼 (서버가 같은 규칙으로 다시 계산)
  const selectedCoupon = shippingFee > 0 ? coupons.find((c) => c._id === couponId) : undefined
  const couponDiscount = selectedCoupon ? shippingFee : 0

  // 오른쪽 요약에 보여줄 값 (미리 계산한 금액. 실제 결제 금액은 서버가 확정)
  const view = {
    count: totalQuantity,
    itemsTotal,
    shippingFee,
    couponDiscount,
    couponName: selectedCoupon?.name,
    total: itemsTotal + shippingFee - couponDiscount,
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  // 주소 검색 창에서 고른 주소를 채우고, 상세 주소 입력으로 이동
  const searchAddress = () => {
    openAddressSearch({
      onComplete: ({ zipCode, address }) => {
        setForm((prev) => ({ ...prev, zip_code: zipCode, address1: address }))
        setErrors((prev) => ({ ...prev, address1: undefined }))
        setTimeout(() => document.getElementById('co-address2')?.focus(), 0)
      },
      onError: (msg) => setErrors((prev) => ({ ...prev, address1: msg })),
    })
  }

  const validate = () => {
    const next = {}
    if (!form.recipient.trim()) next.recipient = '받는 사람을 입력해주세요.'
    if (!form.phone.trim()) next.phone = '연락처를 입력해주세요.'
    else if (!/^[0-9+\-()\s]{9,}$/.test(form.phone.trim())) next.phone = '연락처 형식이 올바르지 않습니다.'
    if (!form.address1.trim()) next.address1 = '주소 검색으로 주소를 선택해주세요.'
    return next
  }

  const goReview = (e) => {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length === 0) {
      setMessage(null)
      setStep(2)
    }
  }

  // 쿠폰을 바꾸면 금액이 달라지므로, 이미 만들어 둔 결제 대기 주문은 취소(쿠폰 반환)하고 새로 만듦
  const handleCouponChange = (nextId) => {
    if (order?.status === 'pending') {
      api.put(`/orders/${order._id}/cancel`).catch(() => {})
      setOrder(null)
    }
    setCouponId(nextId)
  }

  // 배송 정보를 고치러 돌아가면, 만들어 둔 결제 대기 주문은 취소하고 새로 만듦
  const backToShipping = () => {
    if (order?.status === 'pending') api.put(`/orders/${order._id}/cancel`).catch(() => {})
    setOrder(null)
    setMessage(null)
    setStep(1)
  }

  // 1) 결제 대기 주문 생성 → 2) 포트원 결제창 → 3) 서버가 결제를 검증하고 주문 확정
  const placeOrder = async () => {
    setSubmitting(true)
    setMessage(null)
    try {
      // 결제창을 닫았다가 다시 시도하는 경우를 위해, 이미 만든 결제 대기 주문은 재사용
      let pending = order
      if (!pending) {
        const payload = { shipping: form }
        if (directItems?.length) payload.items = directItems
        if (selectedCoupon) payload.userCouponId = selectedCoupon._id
        pending = (await api.post('/orders', payload)).data
        setOrder(pending)
      }

      // 이미 결제는 끝났는데 서버 확인만 실패했던 경우에는 결제창을 다시 띄우지 않고 확인만 다시 요청 (중복 결제 방지)
      let impUid = paidUid
      if (!impUid) {
        const result = await requestPayment({
          order: pending,
          buyer: {
            name: form.recipient,
            tel: form.phone,
            email: me?.email,
            addr: `${form.address1} ${form.address2}`.trim(),
            postcode: form.zip_code,
          },
        })
        if (!result.success) {
          // 결제 실패/취소: 결제 대기 주문은 취소(쿠폰 반환)하고, 실패 결과 페이지로 이동. 장바구니는 그대로 유지됨
          api.put(`/orders/${pending._id}/cancel`).catch(() => {})
          navigate('/order/result', {
            state: {
              status: 'fail',
              message: result.error_msg || '결제가 취소되었습니다.',
              orderNumber: pending.orderNumber,
              amount: pending.totalPrice,
              lines: pending.items,
              retry: directItems?.length ? { items: directItems } : null, // 다시 결제하기: 같은 상품으로 주문 페이지로
            },
          })
          return
        }
        impUid = result.imp_uid
        setPaidUid(impUid)
      }

      const { data } = await api.post('/orders/payment/complete', {
        imp_uid: impUid,
        merchant_uid: pending.orderNumber,
      })
      navigate('/order/result', { state: { status: 'success', order: data }, replace: true })
    } catch (err) {
      const data = err.response?.data
      if (!paidUid && err.response?.status === 400 && data?.errors) {
        setOrder(null)
        setStep(1) // 배송지 입력 오류면 입력 단계로 복귀
      }
      setMessage(data?.message || err.message || '서버에 연결할 수 없습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const field = (name, label, props = {}) => (
    <div className="co-field">
      <label htmlFor={`co-${name}`}>{label}</label>
      <input id={`co-${name}`} name={name} className={`co-input ${errors[name] ? 'invalid' : ''}`} value={form[name]} onChange={handleChange} {...props} />
      {errors[name] && <p className="error">{errors[name]}</p>}
    </div>
  )

  const empty = ready && lines.length === 0

  return (
    <div className="shop">
      <header className="co-header">
        <div className="shop-inner">
          <button type="button" className="co-back" onClick={() => navigate(-1)} aria-label="뒤로 가기">
            ←
          </button>
          <h1>주문하기</h1>
          <span />
        </div>
      </header>

      <main className="shop-main">
        <div className="shop-inner">
          <ol className="co-steps">
            {STEPS.map((label, i) => (
              <li key={label} className={step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}>
                <span>{i + 1}</span>
                {label}
              </li>
            ))}
          </ol>

          {!ready && <p className="co-state">불러오는 중...</p>}

          {empty && (
            <div className="co-state">
              <p>주문할 상품이 없습니다.</p>
              <Link to="/" className="shop-btn">
                쇼핑하러 가기
              </Link>
            </div>
          )}

          {ready && !empty && (
            <div className="co-layout">
              <section className="co-panel">
                {step === 1 && (
                  <form onSubmit={goReview} noValidate>
                    <h2>
                      <TruckIcon /> 배송 정보
                    </h2>

                    {field('recipient', '받는 사람', { placeholder: '홍길동', autoComplete: 'name' })}
                    {field('phone', '연락처', { placeholder: '010-1234-5678', autoComplete: 'tel', inputMode: 'tel' })}

                    <div className="co-zip-row">
                      {field('zip_code', '우편번호', { placeholder: '우편번호', readOnly: true, onClick: searchAddress })}
                      <button type="button" className="shop-btn co-search" onClick={searchAddress}>
                        주소 검색
                      </button>
                    </div>
                    {field('address1', '주소', { placeholder: '주소 검색 버튼을 눌러 선택하세요', readOnly: true, onClick: searchAddress })}
                    {field('address2', '상세 주소 (선택)', { placeholder: '동, 호수 등', autoComplete: 'address-line2' })}
                    {field('memo', '배송 요청사항 (선택)', { placeholder: '문 앞에 놓아주세요' })}

                    {message && <p className="message error">{message}</p>}

                    <button type="submit" className="co-primary">
                      다음: 주문 확인
                    </button>
                  </form>
                )}

                {step === 2 && (
                  <div>
                    <h2>주문 확인</h2>

                    <dl className="co-review">
                      <div>
                        <dt>받는 사람</dt>
                        <dd>{form.recipient}</dd>
                      </div>
                      <div>
                        <dt>연락처</dt>
                        <dd>{form.phone}</dd>
                      </div>
                      <div>
                        <dt>주소</dt>
                        <dd>
                          {form.zip_code && `(${form.zip_code}) `}
                          {form.address1} {form.address2}
                        </dd>
                      </div>
                      {form.memo && (
                        <div>
                          <dt>배송 요청사항</dt>
                          <dd>{form.memo}</dd>
                        </div>
                      )}
                      {selectedCoupon && (
                        <div>
                          <dt>쿠폰</dt>
                          <dd>
                            {selectedCoupon.name} (−{won(couponDiscount)})
                          </dd>
                        </div>
                      )}
                      <div>
                        <dt>결제 수단</dt>
                        <dd>신용·체크카드 (KG이니시스 결제창)</dd>
                      </div>
                    </dl>

                    {message && <p className="message error">{message}</p>}
                    {paidUid && (
                      <p className="message error">
                        결제는 완료되었지만 주문 확인에 실패했습니다. 다시 결제하지 마시고 아래 &apos;결제 확인 다시 시도&apos;를 눌러주세요.
                      </p>
                    )}

                    <div className="co-actions">
                      <button type="button" className="shop-btn" onClick={backToShipping} disabled={submitting || Boolean(paidUid)}>
                        이전
                      </button>
                      <button type="button" className="co-primary" onClick={placeOrder} disabled={submitting}>
                        {submitting ? '진행 중...' : paidUid ? '결제 확인 다시 시도' : `${won(view.total)} 결제하기`}
                      </button>
                    </div>
                  </div>
                )}

              </section>

              <aside className="co-summary">
                <h2>주문 요약</h2>

                <ul className="co-items">
                  {lines.map(({ product, quantity }) => (
                    <li key={product._id}>
                      <div className="co-thumb">
                        <img src={product.image} alt="" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
                        <span className="co-qty">{quantity}</span>
                      </div>
                      <div>
                        <p className="co-item-name">{product.name}</p>
                        <p className="co-item-price">
                          {won(product.price)}
                          {product.listPrice != null && product.listPrice > product.price && <span>{won(product.listPrice)}</span>}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="co-coupon">
                    <label htmlFor="co-coupon-select">쿠폰</label>
                    <select
                      id="co-coupon-select"
                      className="co-input"
                      value={couponId}
                      onChange={(e) => handleCouponChange(e.target.value)}
                      disabled={submitting || Boolean(paidUid) || coupons.length === 0 || shippingFee === 0}
                    >
                      <option value="">{coupons.length === 0 ? '사용 가능한 쿠폰이 없습니다' : '쿠폰 사용 안 함'}</option>
                      {coupons.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {coupons.length > 0 && shippingFee === 0 && <p className="co-coupon-hint">배송비가 이미 무료라 쿠폰을 사용할 수 없어요.</p>}
                </div>

                <dl className="co-sums">
                  <div>
                    <dt>상품 금액 ({view.count}개)</dt>
                    <dd>{won(view.itemsTotal)}</dd>
                  </div>
                  <div>
                    <dt>배송비</dt>
                    <dd>{view.shippingFee === 0 ? '무료' : won(view.shippingFee)}</dd>
                  </div>
                  {view.couponDiscount > 0 && (
                    <div className="co-discount">
                      <dt>쿠폰 할인{view.couponName ? ` (${view.couponName})` : ''}</dt>
                      <dd>−{won(view.couponDiscount)}</dd>
                    </div>
                  )}
                </dl>

                <div className="co-total">
                  <span>총 금액</span>
                  <strong>{won(view.total)}</strong>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default CheckoutPage
