import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { isLoggedIn } from '../context/CartContext'
import { ORDER_STATUS } from '../constants/orderStatus'
import './MainPage.css'
import './MyOrdersPage.css'

const STATUS = ORDER_STATUS

// 상태별 탭 (value가 주문 상태와 같음, all은 전체)
const TABS = [{ value: 'all', label: '전체' }, ...Object.entries(STATUS).map(([value, { label }]) => ({ value, label }))]

// 상품 준비가 시작되기 전까지만 고객이 취소할 수 있음 (서버도 같은 규칙으로 검사)
const CANCELLABLE = ['received', 'confirmed']

const won = (n) => `₩${Number(n).toLocaleString('ko-KR')}`

const formatDate = (iso) =>
  new Date(iso).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

function MyOrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [tab, setTab] = useState('all') // 선택한 상태 탭
  const [openId, setOpenId] = useState(null) // 상세를 펼친 주문
  const [cancellingId, setCancellingId] = useState(null) // 취소 요청 중인 주문
  const [cancelError, setCancelError] = useState(null) // { id, message }

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login', { replace: true })
      return
    }
    api
      .get('/orders')
      .then(({ data }) => {
        setOrders(data)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [navigate])

  const changeTab = (next) => {
    setTab(next)
    setOpenId(null)
    setCancelError(null)
  }

  // 탭별 주문 수와 현재 탭의 주문 목록
  const counts = Object.fromEntries(TABS.map((t) => [t.value, t.value === 'all' ? orders.length : orders.filter((o) => o.status === t.value).length]))
  const visible = tab === 'all' ? orders : orders.filter((o) => o.status === tab)

  const handleCancel = async (order) => {
    if (!window.confirm(`주문 ${order.orderNumber}을(를) 취소할까요?\n결제하신 ${won(order.totalPrice)}이(가) 환불됩니다.`)) return

    setCancelError(null)
    setCancellingId(order._id)
    try {
      const { data } = await api.put(`/orders/${order._id}/cancel`)
      setOrders((prev) => prev.map((o) => (o._id === data._id ? data : o)))
    } catch (err) {
      setCancelError({ id: order._id, message: err.response?.data?.message || '주문을 취소하지 못했습니다.' })
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="shop">
      <Navbar />

      <main className="shop-main">
        <div className="shop-inner mo-wrap">
          <h1 className="shop-title">내 주문</h1>
          {status === 'ready' && <p className="shop-count">총 {orders.length}건</p>}

          {status === 'loading' && <p className="mo-state">주문 내역을 불러오는 중...</p>}
          {status === 'error' && <p className="mo-state">주문 내역을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>}

          {status === 'ready' && orders.length > 0 && (
            <div className="mo-tabs" role="tablist">
              {TABS.map((t) => (
                <button key={t.value} type="button" role="tab" aria-selected={tab === t.value} className={tab === t.value ? 'active' : ''} onClick={() => changeTab(t.value)}>
                  {t.label}
                  <span className="mo-tab-count">{counts[t.value]}</span>
                </button>
              ))}
            </div>
          )}

          {status === 'ready' && orders.length === 0 && (
            <div className="mo-state">
              <p>아직 주문 내역이 없습니다.</p>
              <Link to="/" className="shop-btn">
                쇼핑하러 가기
              </Link>
            </div>
          )}

          {status === 'ready' && orders.length > 0 && visible.length === 0 && (
            <p className="mo-state">&apos;{TABS.find((t) => t.value === tab).label}&apos; 상태의 주문이 없습니다.</p>
          )}

          {status === 'ready' && visible.length > 0 && (
            <ul className="mo-list">
              {visible.map((o) => {
                const st = STATUS[o.status] || { label: o.status, tone: 'gray' }
                const open = openId === o._id
                const first = o.items[0]
                const count = o.items.reduce((s, i) => s + i.quantity, 0)
                const s = o.shipping

                return (
                  <li key={o._id} className="mo-card">
                    <div className="mo-head">
                      <div>
                        <p className="mo-date">{formatDate(o.createdAt)}</p>
                        <p className="mo-no">주문번호 {o.orderNumber}</p>
                      </div>
                      <span className={`mo-badge ${st.tone}`}>{st.label}</span>
                    </div>

                    <div className="mo-summary">
                      <div className="mo-thumb">
                        <img src={first.image} alt="" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
                      </div>
                      <div className="mo-summary-text">
                        <p className="mo-name">{first.name}</p>
                        <p className="mo-meta">{o.items.length > 1 ? `외 ${o.items.length - 1}종 · 총 ${count}개` : `${count}개`}</p>
                      </div>
                      <strong className="mo-total">{won(o.totalPrice)}</strong>
                    </div>

                    <button type="button" className="mo-toggle" onClick={() => setOpenId(open ? null : o._id)} aria-expanded={open}>
                      {open ? '상세 닫기' : '상세 보기'}
                    </button>

                    {open && (
                      <div className="mo-detail">
                        <ul className="mo-items">
                          {o.items.map((i) => (
                            <li key={i.sku}>
                              <div className="mo-thumb small">
                                <img src={i.image} alt="" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
                              </div>
                              <div className="mo-summary-text">
                                <p className="mo-name">{i.name}</p>
                                <p className="mo-meta">
                                  {won(i.price)} × {i.quantity}
                                </p>
                              </div>
                              <span>{won(i.price * i.quantity)}</span>
                            </li>
                          ))}
                        </ul>

                        <dl className="mo-dl">
                          <div>
                            <dt>상품 금액</dt>
                            <dd>{won(o.itemsTotal)}</dd>
                          </div>
                          <div>
                            <dt>배송비</dt>
                            <dd>{o.shippingFee === 0 ? '무료' : won(o.shippingFee)}</dd>
                          </div>
                          {o.couponDiscount > 0 && (
                            <div className="mo-discount">
                              <dt>쿠폰 할인{o.coupon?.name ? ` (${o.coupon.name})` : ''}</dt>
                              <dd>−{won(o.couponDiscount)}</dd>
                            </div>
                          )}
                          <div className="mo-sum">
                            <dt>결제 금액</dt>
                            <dd>{won(o.totalPrice)}</dd>
                          </div>
                        </dl>

                        <dl className="mo-dl">
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
                          {o.payment?.paidAt && (
                            <div>
                              <dt>결제 일시</dt>
                              <dd>{formatDate(o.payment.paidAt)}</dd>
                            </div>
                          )}
                        </dl>

                        {cancelError?.id === o._id && <p className="message error">{cancelError.message}</p>}

                        <div className="mo-buttons">
                          {o.payment?.receiptUrl && (
                            <a href={o.payment.receiptUrl} target="_blank" rel="noreferrer" className="shop-btn mo-receipt">
                              영수증 보기
                            </a>
                          )}
                          {/* 상품 준비가 시작되기 전(결제 완료, 주문 확인)에만 취소할 수 있고, 취소하면 결제 금액이 환불됨 */}
                          {CANCELLABLE.includes(o.status) && (
                            <button type="button" className="shop-btn mo-cancel" onClick={() => handleCancel(o)} disabled={cancellingId === o._id}>
                              {cancellingId === o._id ? '취소 중...' : '주문 취소'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default MyOrdersPage
