import { useNavigate } from 'react-router-dom'
import CartIcon from './CartIcon'
import { discountRate, formatPrice } from '../utils/product'
import './ProductCard.css'

// 상품 카드. 카드를 누르면 상세 페이지로, 장바구니 버튼은 담기만 함 (onAdd: 상품 id를 받아 장바구니에 담는 함수)
function ProductCard({ product, onAdd }) {
  const navigate = useNavigate()
  const rate = discountRate(product)
  const open = () => navigate(`/products/${product._id}`)

  return (
    <article className="pc" role="link" tabIndex={0} onClick={open} onKeyDown={(e) => e.key === 'Enter' && open()}>
      <div className="pc-thumb">
        <img src={product.image} alt={product.name} loading="lazy" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
        <button
          type="button"
          className="pc-cart"
          onClick={(e) => {
            e.stopPropagation() // 카드 클릭(상세 이동)과 구분
            onAdd(product._id)
          }}
          aria-label={`${product.name} 장바구니에 담기`}
        >
          <CartIcon size={20} />
        </button>
      </div>

      <div className="pc-info">
        <p className="pc-cat">{product.category}</p>
        <h3 className="pc-name">{product.name}</h3>
        <p className="pc-price">
          {rate > 0 && <span className="pc-rate">{rate}%</span>}
          <strong>{formatPrice(product.price)}</strong>
        </p>
        {rate > 0 && <p className="pc-list">{formatPrice(product.listPrice)}</p>}
      </div>
    </article>
  )
}

export default ProductCard
