import { Fragment, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api/client'
import { ORDER_STATUSES } from '../../constants/orderStatus'
import '../MainPage.css'
import './AdminPage.css'
import './AdminProductsPage.css'
import './AdminOrdersPage.css'

// 어드민 화면에서는 취소가 환불을 동반한다는 점을 드러냄
const STATUSES = ORDER_STATUSES.map((s) => (s.value === 'cancelled' ? { ...s, label: '주문 취소(환불)' } : s))
const LABEL = Object.fromEntries(STATUSES.map((s) => [s.value, s.label]))

const PAGE_SIZE = 10

const won = (n) => `₩${Number(n).toLocaleString('ko-KR')}`
const formatDate = (iso) =>
  new Date(iso).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

function AdminOrdersPage() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('') // '' = 전체
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [busyId, setBusyId] = useState(null) // 상태 변경 중인 주문
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    // 어드민이 아니면 메인으로 돌려보냄 (실제 차단은 서버에서 수행)
    api
      .get('/auth/me')
      .then(({ data }) => {
        if (data.user_type !== 'admin') return navigate('/', { replace: true })
        setReady(true)
      })
      .catch(() => navigate('/', { replace: true }))
  }, [navigate])

  useEffect(() => {
    if (!ready) return
    api
      .get('/orders/admin', { params: { page, limit: PAGE_SIZE, ...(filter && { status: filter }) } })
      .then(({ data }) => {
        if (data.orders.length === 0 && page > 1) return setPage(Math.max(data.totalPages, 1))
        setOrders(data.orders)
        setTotal(data.total)
        setTotalPages(Math.max(data.totalPages, 1))
      })
      .catch(() => setMessage('주문 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [ready, page, filter, reloadKey])

  const changeFilter = (next) => {
    setFilter(next)
    setPage(1)
    setOpenId(null)
    setMessage(null)
  }

  const changeStatus = async (order, next) => {
    if (next === order.status) return
    if (next === 'cancelled' && !window.confirm(`주문 ${order.orderNumber}을(를) 취소할까요?\n고객에게 ${won(order.totalPrice)}이(가) 환불되며, 되돌릴 수 없습니다.`)) return

    setMessage(null)
    setBusyId(order._id)
    try {
      const { data } = await api.put(`/orders/${order._id}/status`, { status: next })
      // 응답에는 주문자 정보가 없으므로 기존 값을 유지한 채 상태만 갱신
      setOrders((prev) => prev.map((o) => (o._id === data._id ? { ...o, status: data.status, updatedAt: data.updatedAt } : o)))
      if (filter && filter !== data.status) setReloadKey((k) => k + 1) // 필터에서 벗어난 주문은 목록에서 빠짐
    } catch (err) {
      setMessage(err.response?.data?.message || '상태를 변경하지 못했습니다.')
    } finally {
      setBusyId(null)
    }
  }

  if (!ready) return <div className="shop" />

  return (
    <div className="shop admin">
      <header className="admin-header">
        <div className="shop-inner">
          <div className="admin-brand">
            <Link to="/admin" className="pf-back" aria-label="대시보드로 돌아가기">
              ←
            </Link>
            <span className="admin-brand-name">주문 관리</span>
          </div>
          <Link to="/" className="shop-btn">
            쇼핑몰로 돌아가기
          </Link>
        </div>
      </header>

      <main className="shop-main">
        <div className="shop-inner">
          <div className="ao-filters">
            {[{ value: '', label: '전체' }, ...STATUSES].map((s) => (
              <button key={s.value} type="button" className={`shop-chip ${filter === s.value ? 'active' : ''}`} onClick={() => changeFilter(s.value)}>
                {s.label}
              </button>
            ))}
          </div>

          <section className="admin-panel pf-panel">
            <div className="admin-panel-head">
              <h2>주문 목록</h2>
              <span className="admin-hint">총 {total}건 (결제된 주문만)</span>
            </div>

            {message && <p className="message error">{message}</p>}

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>주문일시</th>
                    <th>주문번호</th>
                    <th>주문자</th>
                    <th>상품</th>
                    <th>결제금액</th>
                    <th>상태</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const open = openId === o._id
                    const s = o.shipping
                    return (
                      <Fragment key={o._id}>
                        <tr>
                          <td>{formatDate(o.createdAt)}</td>
                          <td>{o.orderNumber}</td>
                          <td>
                            {o.user?.name || '(탈퇴)'}
                            {o.user?.email && <span className="ao-sub">{o.user.email}</span>}
                          </td>
                          <td>
                            {o.items[0].name}
                            {o.items.length > 1 && <span className="ao-sub">외 {o.items.length - 1}종</span>}
                          </td>
                          <td>{won(o.totalPrice)}</td>
                          <td>
                            <select
                              className={`ao-status ${o.status}`}
                              value={o.status}
                              disabled={busyId === o._id || o.status === 'cancelled'}
                              onChange={(e) => changeStatus(o, e.target.value)}
                              aria-label={`주문 ${o.orderNumber} 상태`}
                            >
                              {STATUSES.map((st) => (
                                <option key={st.value} value={st.value}>
                                  {st.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <button type="button" className="shop-btn pf-edit" onClick={() => setOpenId(open ? null : o._id)}>
                              {open ? '닫기' : '상세'}
                            </button>
                          </td>
                        </tr>

                        {open && (
                          <tr className="ao-detail-row">
                            <td colSpan="7">
                              <div className="ao-detail">
                                <div>
                                  <h3>주문 상품</h3>
                                  <ul>
                                    {o.items.map((i) => (
                                      <li key={i.sku}>
                                        <span>
                                          {i.name} <em>({i.sku})</em>
                                        </span>
                                        <span>
                                          {won(i.price)} × {i.quantity}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                  <p>
                                    상품 {won(o.itemsTotal)} + 배송비 {won(o.shippingFee)}
                                    {o.couponDiscount > 0 && ` − 쿠폰 ${won(o.couponDiscount)}`} = <strong>{won(o.totalPrice)}</strong>
                                  </p>
                                </div>
                                <div>
                                  <h3>배송 정보</h3>
                                  <p>
                                    {s.recipient} ({s.phone})
                                  </p>
                                  <p>
                                    {s.zip_code && `(${s.zip_code}) `}
                                    {s.address1} {s.address2}
                                  </p>
                                  {s.memo && <p>요청사항: {s.memo}</p>}
                                  <h3>결제</h3>
                                  <p>
                                    {o.payment?.method || '-'} · {o.payment?.paidAt ? formatDate(o.payment.paidAt) : '-'}
                                    {o.payment?.receiptUrl && (
                                      <>
                                        {' '}
                                        <a href={o.payment.receiptUrl} target="_blank" rel="noreferrer">
                                          영수증
                                        </a>
                                      </>
                                    )}
                                  </p>
                                  <p className="ao-sub">현재 상태: {LABEL[o.status] || o.status}</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}

                  {!loading && orders.length === 0 && (
                    <tr>
                      <td colSpan="7" className="admin-empty">
                        해당하는 주문이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pf-pagination">
                <button type="button" className="shop-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  이전
                </button>
                <span>
                  {page} / {totalPages}
                </span>
                <button type="button" className="shop-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  다음
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default AdminOrdersPage
