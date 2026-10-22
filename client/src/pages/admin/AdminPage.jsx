import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api/client'
import { ORDER_STATUS } from '../../constants/orderStatus'
import '../MainPage.css'
import './AdminPage.css'

// 주문 상태 뱃지 색: 처리가 필요한 주문(노랑), 진행 중(파랑), 완료(초록), 취소(회색)
const STATUS_CLASS = { received: 'pending', confirmed: 'pending', preparing: 'shipping', dispatched: 'shipping', shipped: 'shipping', delivered: 'done', cancelled: 'cancelled' }

const won = (n) => `₩${n.toLocaleString('ko-KR')}`
const formatDate = (iso) => new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

const CartIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
  </svg>
)
const BoxIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
    <path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z" />
    <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
  </svg>
)
const UsersIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
  </svg>
)
const TrendIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
    <path d="m23 6-9.5 9.5-5-5L1 18" />
    <path d="M17 6h6v6" />
  </svg>
)

function AdminPage() {
  const navigate = useNavigate()
  const [me, setMe] = useState(null)
  const [data, setData] = useState(null) // 대시보드 통계 (주문, 매출, 상품, 고객, 최근 주문)
  const [error, setError] = useState(null)

  useEffect(() => {
    // 어드민이 아니면 메인으로 돌려보냄 (실제 차단은 서버에서 수행)
    api
      .get('/auth/me')
      .then(({ data: user }) => {
        if (user.user_type !== 'admin') return navigate('/', { replace: true })
        setMe(user)
        return api
          .get('/stats/dashboard')
          .then((res) => setData(res.data))
          .catch(() => setError('통계를 불러오지 못했습니다.'))
      })
      .catch(() => navigate('/', { replace: true }))
  }, [navigate])

  if (!me) return <div className="shop" />

  const stats = data
    ? [
        { label: '총 주문', value: data.orders.total.toLocaleString('ko-KR'), note: `오늘 ${data.orders.today}건 · 취소 제외`, icon: <CartIcon />, tone: 'blue' },
        { label: '총 상품', value: data.products.toLocaleString('ko-KR'), note: '등록된 상품 수', icon: <BoxIcon />, tone: 'green' },
        { label: '총 고객', value: data.customers.toLocaleString('ko-KR'), note: '구매자 회원 수', icon: <UsersIcon />, tone: 'purple' },
        { label: '총 매출', value: won(data.revenue.total), note: `오늘 ${won(data.revenue.today)} · 취소/환불 제외`, icon: <TrendIcon />, tone: 'orange' },
      ]
    : []

  return (
    <div className="shop admin">
      <header className="admin-header">
        <div className="shop-inner">
          <div className="admin-brand">
            <span className="admin-brand-name">피규어박스</span>
            <span className="admin-badge">ADMIN</span>
          </div>
          <Link to="/" className="shop-btn">
            쇼핑몰로 돌아가기
          </Link>
        </div>
      </header>

      <main className="shop-main">
        <div className="shop-inner">
          <h1 className="shop-title">관리자 대시보드</h1>
          <p className="admin-lead">{me.name}님, 피규어박스 쇼핑몰 관리 시스템에 오신 것을 환영합니다.</p>

          <section className="admin-stats">
            {stats.map((s) => (
              <div key={s.label} className="admin-stat">
                <div>
                  <p className="admin-stat-label">{s.label}</p>
                  <p className="admin-stat-value">{s.value}</p>
                  <p className="admin-stat-note">{s.note}</p>
                </div>
                <span className={`admin-stat-icon ${s.tone}`}>{s.icon}</span>
              </div>
            ))}
          </section>

          <section className="admin-columns">
            <div className="admin-panel">
              <h2>빠른 작업</h2>
              <div className="admin-actions">
                <Link to="/admin/products?tab=new" className="admin-action primary">
                  + 새 상품 등록
                </Link>
                <Link to="/admin/products" className="admin-action">
                  상품 관리
                </Link>
                <Link to="/admin/orders" className="admin-action">
                  주문 관리
                </Link>
                <Link to="/admin/users" className="admin-action">
                  회원 관리
                </Link>
              </div>
            </div>

            <div className="admin-panel">
              <div className="admin-panel-head">
                <h2>최근 주문</h2>
                <Link to="/admin/orders" className="admin-more">
                  전체보기
                </Link>
              </div>

              {error && <p className="message error">{error}</p>}
              {data && data.recentOrders.length === 0 && <p className="admin-empty-text">아직 결제된 주문이 없습니다.</p>}

              <ul className="admin-orders">
                {data?.recentOrders.map((o) => (
                  <li key={o._id}>
                    <div>
                      <p className="admin-order-id">{o.orderNumber}</p>
                      <p className="admin-order-meta">{o.customerName}</p>
                      <p className="admin-order-meta">{formatDate(o.createdAt)}</p>
                    </div>
                    <div className="admin-order-right">
                      <span className={`admin-status ${STATUS_CLASS[o.status]}`}>{ORDER_STATUS[o.status]?.label || o.status}</span>
                      <p className="admin-order-amount">{won(o.totalPrice)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default AdminPage
