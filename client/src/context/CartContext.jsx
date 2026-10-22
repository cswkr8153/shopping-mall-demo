import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import api from '../api/client'

const EMPTY_CART = { items: [], totalQuantity: 0, totalPrice: 0 }

const CartContext = createContext(null)

export const isLoggedIn = () => Boolean(localStorage.getItem('token'))

// 서버 에러 메시지를 꺼내 Error로 던짐
const toError = (err) => new Error(err.response?.data?.message || '서버에 연결할 수 없습니다.')

export function CartProvider({ children }) {
  const [cart, setCart] = useState(EMPTY_CART)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef()

  const showToast = useCallback((message) => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 1800)
  }, [])

  // 로그인 상태면 서버에서 장바구니를 불러오고, 아니면 비움
  const loadCart = useCallback(async () => {
    if (!isLoggedIn()) {
      setCart(EMPTY_CART)
      return
    }
    try {
      const { data } = await api.get('/cart')
      setCart(data)
    } catch {
      setCart(EMPTY_CART)
    }
  }, [])

  useEffect(() => {
    loadCart()
  }, [loadCart])

  const addToCart = async (productId, quantity = 1) => {
    try {
      const { data } = await api.post('/cart/items', { productId, quantity })
      setCart(data)
      showToast('장바구니에 담았습니다.')
    } catch (err) {
      throw toError(err)
    }
  }

  const updateItem = async (productId, quantity) => {
    try {
      const { data } = await api.put(`/cart/items/${productId}`, { quantity })
      setCart(data)
    } catch (err) {
      throw toError(err)
    }
  }

  const removeItem = async (productId) => {
    try {
      const { data } = await api.delete(`/cart/items/${productId}`)
      setCart(data)
    } catch (err) {
      throw toError(err)
    }
  }

  const clearCart = () => setCart(EMPTY_CART)

  return (
    <CartContext.Provider value={{ cart, loadCart, addToCart, updateItem, removeItem, clearCart, showToast }}>
      {children}
      {toast && (
        <div className="shop-toast" role="status">
          {toast}
        </div>
      )}
    </CartContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext)
