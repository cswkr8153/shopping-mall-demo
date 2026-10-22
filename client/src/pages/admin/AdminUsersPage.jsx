import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api/client'
import '../MainPage.css'
import './AdminPage.css'
import './AdminProductsPage.css'
import './AdminUsersPage.css'

const TYPES = [
  { value: 'customer', label: '구매자' },
  { value: 'seller', label: '판매자' },
  { value: 'admin', label: '어드민' },
]
const LABEL = Object.fromEntries(TYPES.map((t) => [t.value, t.label]))

const PAGE_SIZE = 10

const formatDate = (iso) => new Date(iso).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

function AdminUsersPage() {
  const navigate = useNavigate()
  const [me, setMe] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | customer | seller | admin
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [message, setMessage] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    // 어드민이 아니면 메인으로 돌려보냄 (실제 차단은 서버에서 수행)
    api
      .get('/auth/me')
      .then(({ data }) => {
        if (data.user_type !== 'admin') return navigate('/', { replace: true })
        setMe(data)
        return api.get('/users').then((res) => setUsers(res.data))
      })
      .catch(() => navigate('/', { replace: true }))
      .finally(() => setLoading(false))
  }, [navigate])

  const counts = useMemo(
    () => ({ all: users.length, ...Object.fromEntries(TYPES.map((t) => [t.value, users.filter((u) => u.user_type === t.value).length])) }),
    [users],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((u) => (filter === 'all' || u.user_type === filter) && (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)))
  }, [users, filter, query])

  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1)
  const currentPage = Math.min(page, totalPages)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const changeFilter = (next) => {
    setFilter(next)
    setPage(1)
  }

  const changeType = async (user, next) => {
    if (next === user.user_type) return
    if (next === 'admin' && !window.confirm(`${user.name}(${user.email}) 님에게 어드민 권한을 부여할까요?\n회원, 상품, 주문을 모두 관리할 수 있게 됩니다.`)) return

    setMessage(null)
    setNotice(null)
    setBusyId(user._id)
    try {
      const { data } = await api.put(`/users/${user._id}`, { user_type: next })
      setUsers((prev) => prev.map((u) => (u._id === data._id ? data : u)))
      setNotice(`${data.name} 님의 유형을 '${LABEL[data.user_type]}'(으)로 변경했습니다.`)
    } catch (err) {
      setMessage(err.response?.data?.message || '유형을 변경하지 못했습니다.')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (user) => {
    if (!window.confirm(`${user.name}(${user.email}) 회원을 삭제할까요?\n장바구니와 쿠폰도 함께 삭제되며, 되돌릴 수 없습니다.`)) return

    setMessage(null)
    setNotice(null)
    setBusyId(user._id)
    try {
      await api.delete(`/users/${user._id}`)
      setUsers((prev) => prev.filter((u) => u._id !== user._id))
      setNotice(`${user.name} 회원을 삭제했습니다.`)
    } catch (err) {
      setMessage(err.response?.data?.message || '삭제하지 못했습니다.')
    } finally {
      setBusyId(null)
    }
  }

  if (!me) return <div className="shop" />

  return (
    <div className="shop admin">
      <header className="admin-header">
        <div className="shop-inner">
          <div className="admin-brand">
            <Link to="/admin" className="pf-back" aria-label="대시보드로 돌아가기">
              ←
            </Link>
            <span className="admin-brand-name">회원 관리</span>
          </div>
          <Link to="/" className="shop-btn">
            쇼핑몰로 돌아가기
          </Link>
        </div>
      </header>

      <main className="shop-main">
        <div className="shop-inner">
          <div className="au-toolbar">
            <div className="au-filters">
              {[{ value: 'all', label: '전체' }, ...TYPES].map((t) => (
                <button key={t.value} type="button" className={`shop-chip ${filter === t.value ? 'active' : ''}`} onClick={() => changeFilter(t.value)}>
                  {t.label} {counts[t.value]}
                </button>
              ))}
            </div>
            <input
              type="search"
              className="au-search"
              placeholder="이름 또는 이메일 검색"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              aria-label="회원 검색"
            />
          </div>

          <section className="admin-panel pf-panel">
            <div className="admin-panel-head">
              <h2>회원 목록</h2>
              <span className="admin-hint">{filtered.length === users.length ? `총 ${users.length}명` : `${filtered.length}명 / 전체 ${users.length}명`}</span>
            </div>

            {notice && <p className="message success">{notice}</p>}
            {message && <p className="message error">{message}</p>}

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>이메일</th>
                    <th>유형</th>
                    <th>가입일</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((u) => {
                    const self = u._id === me._id
                    return (
                      <tr key={u._id}>
                        <td>
                          {u.name}
                          {self && <span className="au-me">나</span>}
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <select
                            className={`au-type ${u.user_type}`}
                            value={u.user_type}
                            disabled={self || busyId === u._id}
                            title={self ? '본인의 권한은 변경할 수 없습니다.' : undefined}
                            onChange={(e) => changeType(u, e.target.value)}
                            aria-label={`${u.name} 회원 유형`}
                          >
                            {TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>{formatDate(u.createdAt)}</td>
                        <td>
                          {!self && (
                            <button type="button" className="shop-btn admin-delete" disabled={busyId === u._id} onClick={() => handleDelete(u)}>
                              삭제
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}

                  {!loading && visible.length === 0 && (
                    <tr>
                      <td colSpan="5" className="admin-empty">
                        {users.length === 0 ? '회원이 없습니다.' : '조건에 맞는 회원이 없습니다.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pf-pagination">
                <button type="button" className="shop-btn" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                  이전
                </button>
                <span>
                  {currentPage} / {totalPages}
                </span>
                <button type="button" className="shop-btn" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
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

export default AdminUsersPage
