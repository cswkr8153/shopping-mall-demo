import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../api/client'
import { isCloudinaryConfigured, openImageUploader } from '../../utils/cloudinary'
import '../MainPage.css'
import './AdminPage.css'
import './AdminProductsPage.css'

const CATEGORIES = ['완성품', '조립제품', '기타']
const EMPTY_FORM = { sku: '', name: '', price: '', listPrice: '', category: '', image: '', description: '' }

const won = (n) => `₩${Number(n).toLocaleString('ko-KR')}`

function AdminProductsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'new' ? 'new' : 'list'

  const [ready, setReady] = useState(false)
  const [products, setProducts] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(null) // 수정 중인 상품 (없으면 새 상품 등록)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState(null)
  const [notice, setNotice] = useState(null)
  const [loading, setLoading] = useState(false)

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

  // 상품 목록은 서버에서 2개씩 나눠서 받아옴
  useEffect(() => {
    if (!ready) return
    api
      .get('/products', { params: { page } })
      .then(({ data }) => {
        // 마지막 페이지의 상품을 모두 지운 경우 앞 페이지로 이동
        if (data.products.length === 0 && page > 1) return setPage(Math.max(data.totalPages, 1))
        setProducts(data.products)
        setTotal(data.total)
        setTotalPages(Math.max(data.totalPages, 1))
      })
      .catch(() => setMessage('상품 목록을 불러오지 못했습니다.'))
  }, [ready, page, reloadKey])

  const setTab = (next) => setParams(next === 'new' ? { tab: 'new' } : {})

  // 새 상품 등록 폼 열기
  const startCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setMessage(null)
    setTab('new')
  }

  // 선택한 상품의 값을 폼에 채워서 수정 모드로 열기
  const startEdit = (product) => {
    setEditing(product)
    setForm({
      sku: product.sku,
      name: product.name,
      price: String(product.price),
      listPrice: product.listPrice != null ? String(product.listPrice) : '',
      category: product.category,
      image: product.image,
      description: product.description || '',
    })
    setErrors({})
    setMessage(null)
    setNotice(null)
    setTab('new')
  }

  const closeForm = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setMessage(null)
    setTab('list')
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleUpload = () => {
    openImageUploader({
      onSuccess: (url) => {
        setForm((prev) => ({ ...prev, image: url }))
        setErrors((prev) => ({ ...prev, image: undefined }))
      },
      onError: (msg) => setErrors((prev) => ({ ...prev, image: msg })),
    })
  }

  const validate = () => {
    const next = {}
    if (!form.sku.trim()) next.sku = 'SKU를 입력해주세요.'
    if (!form.name.trim()) next.name = '상품명을 입력해주세요.'
    if (form.price === '') next.price = '판매가격을 입력해주세요.'
    else if (Number(form.price) < 0) next.price = '판매가격은 0 이상이어야 합니다.'
    if (form.listPrice !== '' && Number(form.listPrice) < 0) next.listPrice = '정가는 0 이상이어야 합니다.'
    if (!form.category) next.category = '카테고리를 선택해주세요.'
    if (!form.image) next.image = '메인 이미지를 업로드해주세요.'
    return next
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)

    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      price: Number(form.price),
      category: form.category,
      image: form.image,
      description: form.description.trim(),
    }
    // 정가를 비우면 수정 시 값이 지워지도록 null을 보냄 (등록 시에는 생략)
    if (form.listPrice !== '') payload.listPrice = Number(form.listPrice)
    else if (editing) payload.listPrice = null

    setLoading(true)
    try {
      if (editing) {
        const { data } = await api.put(`/products/${editing._id}`, payload)
        setNotice(`'${data.name}' 상품이 수정되었습니다.`)
      } else {
        const { data } = await api.post('/products', payload)
        setPage(1)
        setNotice(`'${data.name}' 상품이 등록되었습니다.`)
      }
      setReloadKey((k) => k + 1)
      setEditing(null)
      setForm(EMPTY_FORM)
      setTab('list')
    } catch (err) {
      const data = err.response?.data
      if (err.response?.status === 409) setErrors({ sku: data.message })
      else if (data?.errors) setErrors(data.errors)
      setMessage(data?.message || '서버에 연결할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (product) => {
    if (!window.confirm(`'${product.name}' 상품을 삭제할까요?`)) return
    setNotice(null)
    try {
      await api.delete(`/products/${product._id}`)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setMessage(err.response?.data?.message || '삭제하지 못했습니다.')
    }
  }

  if (!ready) return <div className="shop" />

  const field = (name, label, control, hint) => (
    <div className="pf-field">
      <label htmlFor={`pf-${name}`}>{label}</label>
      {control}
      {hint && <p className="pf-hint">{hint}</p>}
      {errors[name] && <p className="error">{errors[name]}</p>}
    </div>
  )

  return (
    <div className="shop admin">
      <header className="admin-header">
        <div className="shop-inner">
          <div className="admin-brand">
            <Link to="/admin" className="pf-back" aria-label="대시보드로 돌아가기">
              ←
            </Link>
            <span className="admin-brand-name">상품 관리</span>
          </div>
          <button type="button" className="pf-new-btn" onClick={startCreate}>
            + 새 상품 등록
          </button>
        </div>
      </header>

      <main className="shop-main">
        <div className="shop-inner">
          <div className="pf-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'list'} className={tab === 'list' ? 'active' : ''} onClick={() => setTab('list')}>
              상품 목록
            </button>
            <button type="button" role="tab" aria-selected={tab === 'new'} className={tab === 'new' ? 'active' : ''} onClick={() => setTab('new')}>
              {editing ? '상품 수정' : '상품 등록'}
            </button>
          </div>

          {tab === 'list' ? (
            <section className="admin-panel pf-panel">
              <div className="admin-panel-head">
                <h2>상품 목록</h2>
                <span className="admin-hint">총 {total}개</span>
              </div>

              {notice && <p className="message success">{notice}</p>}
              {message && <p className="message error">{message}</p>}

              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>이미지</th>
                      <th>SKU</th>
                      <th>상품명</th>
                      <th>카테고리</th>
                      <th>판매가격</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p._id}>
                        <td>
                          <img className="pf-thumb" src={p.image} alt="" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
                        </td>
                        <td>{p.sku}</td>
                        <td>{p.name}</td>
                        <td>{p.category}</td>
                        <td>
                          {won(p.price)}
                          {p.listPrice != null && <span className="pf-list-price">{won(p.listPrice)}</span>}
                        </td>
                        <td className="pf-row-actions">
                          <button type="button" className="shop-btn pf-edit" onClick={() => startEdit(p)}>
                            수정
                          </button>
                          <button type="button" className="shop-btn admin-delete" onClick={() => handleDelete(p)}>
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan="6" className="admin-empty">
                          등록된 상품이 없습니다.
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
          ) : (
            <form className="admin-panel pf-panel" onSubmit={handleSubmit} noValidate>
              <h2>{editing ? '상품 수정' : '새 상품 등록'}</h2>

              <div className="pf-grid">
                <div className="pf-col">
                  {field(
                    'sku',
                    'SKU',
                    <input id="pf-sku" name="sku" className={`pf-input ${errors.sku ? 'invalid' : ''}`} placeholder="예: HG-RX78-2 (중복 불가)" value={form.sku} onChange={handleChange} />,
                  )}
                  {field(
                    'name',
                    '상품명',
                    <input id="pf-name" name="name" className={`pf-input ${errors.name ? 'invalid' : ''}`} placeholder="상품명을 입력하세요" value={form.name} onChange={handleChange} />,
                  )}

                  <div className="pf-row">
                    {field(
                      'price',
                      '판매가격',
                      <input id="pf-price" name="price" type="number" min="0" className={`pf-input ${errors.price ? 'invalid' : ''}`} placeholder="0" value={form.price} onChange={handleChange} />,
                    )}
                    {field(
                      'listPrice',
                      '정가 (선택)',
                      <input id="pf-listPrice" name="listPrice" type="number" min="0" className={`pf-input ${errors.listPrice ? 'invalid' : ''}`} placeholder="0" value={form.listPrice} onChange={handleChange} />,
                    )}
                  </div>

                  {field(
                    'category',
                    '카테고리',
                    <select id="pf-category" name="category" className={`pf-input ${errors.category ? 'invalid' : ''}`} value={form.category} onChange={handleChange}>
                      <option value="">카테고리 선택</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>,
                  )}
                </div>

                <div className="pf-col">
                  {field(
                    'description',
                    '상품 설명 (선택)',
                    <textarea id="pf-description" name="description" className="pf-input pf-textarea" placeholder="상품에 대한 자세한 설명을 입력하세요" value={form.description} onChange={handleChange} />,
                  )}
                  {field(
                    'image',
                    '메인 이미지',
                    <div className="pf-upload">
                      {form.image ? (
                        <img className="pf-preview" src={form.image} alt="메인 이미지 미리보기" />
                      ) : (
                        <div className={`pf-preview pf-preview-empty ${errors.image ? 'invalid' : ''}`}>미리보기</div>
                      )}
                      <div className="pf-upload-actions">
                        <button type="button" className="shop-btn" onClick={handleUpload} disabled={!isCloudinaryConfigured}>
                          {form.image ? '이미지 변경' : '이미지 업로드'}
                        </button>
                        {form.image && (
                          <button type="button" className="shop-btn" onClick={() => setForm((prev) => ({ ...prev, image: '' }))}>
                            삭제
                          </button>
                        )}
                      </div>
                    </div>,
                    isCloudinaryConfigured
                      ? 'png, jpg, webp, gif 형식 / 최대 5MB'
                      : 'Cloudinary 설정이 필요합니다. client/.env에 VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET을 입력하고 개발 서버를 다시 시작하세요.',
                  )}
                </div>
              </div>

              {message && <p className="message error">{message}</p>}

              <div className="pf-actions">
                <button type="button" className="shop-btn" onClick={closeForm}>
                  취소
                </button>
                <button type="submit" className="pf-submit" disabled={loading}>
                  {loading ? (editing ? '저장 중...' : '등록 중...') : editing ? '수정 저장' : '상품 등록'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}

export default AdminProductsPage
