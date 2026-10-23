import { Link } from 'react-router-dom'
import LogoMark from './LogoMark'
import { CATEGORIES } from '../constants/categories'
import './Footer.css'

function Footer() {
  return (
    <footer className="ft">
      <div className="shop-inner">
        <div className="ft-cols">
          <div className="ft-brand">
            <p className="ft-logo">
              <LogoMark />
              피규어박스
            </p>
            <p className="ft-desc">건담 프라모델과 완성품을 한곳에서 만나보세요.</p>
          </div>

          <div>
            <h4>쇼핑</h4>
            <ul>
              <li>
                <Link to="/?view=all">전체 상품</Link>
              </li>
              {CATEGORIES.map((c) => (
                <li key={c}>
                  <Link to={`/?category=${encodeURIComponent(c)}`}>{c}</Link>
                </li>
              ))}
              <li>
                <Link to="/?view=sale">특가</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4>마이 쇼핑</h4>
            <ul>
              <li>
                <Link to="/orders">내 주문</Link>
              </li>
              <li>
                <Link to="/cart">장바구니</Link>
              </li>
              <li>
                <Link to="/login">로그인</Link>
              </li>
              <li>
                <Link to="/signup">회원가입</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4>배송 안내</h4>
            <ul className="ft-plain">
              <li>10만원 이상 구매 시 무료배송</li>
              <li>10만원 미만 배송비 3,000원</li>
              <li>회원가입 시 배송비 무료 쿠폰 1장 지급</li>
              <li>상품 준비 전까지 주문 취소 가능</li>
            </ul>
          </div>
        </div>

        <p className="ft-note">
          본 사이트는 포트폴리오용 데모 쇼핑몰이며, 실제 상품 판매나 배송이 이루어지지 않습니다. 상품 정보와 가격은 예시입니다.
        </p>
        <p className="ft-copy">© 2026 피규어박스 (Demo). All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer
