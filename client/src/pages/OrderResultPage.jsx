import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import Navbar from '../components/Navbar'
import { useCart } from '../context/CartContext'
import './MainPage.css'
import './OrderResultPage.css'

const won = (n) => `₩${Number(n).toLocaleString('ko-KR')}`

// 주문 페이지에서 넘어온 결과(state) 또는 모바일 결제 후 돌아온 주소(?imp_uid=...&merchant_uid=...&imp_success=...)를 보여줌
//   state: { status: 'success', order } | { status: 'fail', message, orderNumber, amount, lines, retry }
function OrderResultPage() {
  const { state } = useLocation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { loadCart } = useCart()
  const verifying = useRef(false)

  const impUid = params.get('imp_uid')
  const merchantUid = params.get('merchant_uid')
  const fromRedirect = !state?.status && Boolean(impUid && merchantUid)

  const [result, setResult] = useState(() => {
    if (state?.status) return state
    if (fromRedirect && (params.get('imp_success') ?? params.get('success')) === 'false') {
      return { status: 'fail', message: params.get('error_msg') || '결제가 완료되지 않았습니다.', orderNumber: merchantUid }
    }
    if (fromRedirect) return { status: 'loading' }
    return null
  })

  useEffect(() => {
    if (!result) {
      navigate('/', { replace: true }) // 잘못 들어온 경우
      return
    }
    loadCart() // 장바구니 상태를 서버 기준으로 다시 불러옴 (성공하면 비워지고, 실패하면 그대로)

    // 모바일 결제 후 돌아온 경우: 서버에서 결제를 확인
    if (result.status === 'loading' && !verifying.current) {
      verifying.current = true
      api
        .post('/orders/payment/complete', { imp_uid: impUid, merchant_uid: merchantUid })
        .then(({ data }) => {
          setResult({ status: 'success', order: data })
          loadCart()
        })
        .catch((err) => {
          setResult({
            status: 'fail',
            message: err.response?.data?.message || '결제를 확인하지 못했습니다.',
            orderNumber: merchantUid,
          })
        })
    }
  }, [result, navigate, loadCart, impUid, merchantUid])

  if (!result) return null

  return (
    <div className="shop">
      <Navbar />

      <main className="shop-main">
        <div className="or-wrap">
          {result.status === 'loading' && <p className="or-loading">결제를 확인하는 중입니다...</p>}
          {result.status === 'success' && <Success order={result.order} />}
          {result.status === 'fail' && <Failure result={result} onRetry={() => navigate('/checkout', { state: result.retry })} />}
        </div>
      </main>
    </div>
  )
}

function Items({ lines }) {
  return (
    <ul className="or-items">
      {lines.map((l, i) => (
        <li key={l.sku || l.name + i}>
          <div className="or-thumb">
            <img src={l.image} alt="" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
            <span>{l.quantity}</span>
          </div>
          <div className="or-item-info">
            <p className="or-item-name">{l.name}</p>
            <p className="or-item-price">{won(l.price)}</p>
          </div>
          <strong>{won(l.price * l.quantity)}</strong>
        </li>
      ))}
    </ul>
  )
}

function Success({ order }) {
  const s = order.shipping
  return (
    <section className="or-card">
      <div className="or-mark success">✓</div>
      <h1>결제가 완료되었습니다</h1>
      <p className="or-sub">주문번호 {order.orderNumber}</p>

      <Items lines={order.items} />

      <dl className="or-sums">
        <div>
          <dt>상품 금액</dt>
          <dd>{won(order.itemsTotal)}</dd>
        </div>
        <div>
          <dt>배송비</dt>
          <dd>{order.shippingFee === 0 ? '무료' : won(order.shippingFee)}</dd>
        </div>
        {order.couponDiscount > 0 && (
          <div className="or-discount">
            <dt>쿠폰 할인{order.coupon?.name ? ` (${order.coupon.name})` : ''}</dt>
            <dd>−{won(order.couponDiscount)}</dd>
          </div>
        )}
        <div className="or-total">
          <dt>결제 금액</dt>
          <dd>{won(order.totalPrice)}</dd>
        </div>
      </dl>

      <dl className="or-info">
        <div>
          <dt>받는 사람</dt>
          <dd>
            {s.recipient} ({s.phone})
          </dd>
        </div>
        <div>
          <dt>배송지</dt>
          <dd>
            {s.zip_code && `(${s.zip_code}) `}
            {s.address1} {s.address2}
          </dd>
        </div>
        {s.memo && (
          <div>
            <dt>배송 요청사항</dt>
            <dd>{s.memo}</dd>
          </div>
        )}
      </dl>

      <div className="or-actions">
        {order.payment?.receiptUrl && (
          <a href={order.payment.receiptUrl} target="_blank" rel="noreferrer" className="shop-btn or-btn">
            영수증 보기
          </a>
        )}
        <Link to="/" className="or-primary">
          쇼핑 계속하기
        </Link>
      </div>
    </section>
  )
}

function Failure({ result, onRetry }) {
  const { message, orderNumber, amount, lines } = result
  return (
    <section className="or-card">
      <div className="or-mark fail">✕</div>
      <h1>결제에 실패했습니다</h1>
      <p className="or-reason">{message}</p>

      <p className="or-keep">결제가 이루어지지 않았고, 장바구니의 상품은 그대로 유지됩니다.</p>

      {lines?.length > 0 && (
        <>
          <h2 className="or-h2">주문하려던 상품</h2>
          <Items lines={lines} />
        </>
      )}

      <dl className="or-info">
        {orderNumber && (
          <div>
            <dt>주문번호</dt>
            <dd>{orderNumber}</dd>
          </div>
        )}
        {amount != null && (
          <div>
            <dt>결제 시도 금액</dt>
            <dd>{won(amount)}</dd>
          </div>
        )}
      </dl>

      <div className="or-actions">
        <Link to="/cart" className="shop-btn or-btn">
          장바구니 보기
        </Link>
        {result.retry !== undefined && (
          <button type="button" className="or-primary" onClick={onRetry}>
            다시 결제하기
          </button>
        )}
        {result.retry === undefined && (
          <Link to="/" className="or-primary">
            쇼핑 계속하기
          </Link>
        )}
      </div>
    </section>
  )
}

export default OrderResultPage
