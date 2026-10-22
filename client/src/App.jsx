import { Route, Routes } from 'react-router-dom'
import MainPage from './pages/MainPage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderResultPage from './pages/OrderResultPage'
import MyOrdersPage from './pages/MyOrdersPage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/admin/AdminPage'
import AdminProductsPage from './pages/admin/AdminProductsPage'
import AdminOrdersPage from './pages/admin/AdminOrdersPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import SignupPage from './pages/SignupPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/products/:id" element={<ProductDetailPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/order/result" element={<OrderResultPage />} />
      <Route path="/orders" element={<MyOrdersPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/admin/products" element={<AdminProductsPage />} />
      <Route path="/admin/orders" element={<AdminOrdersPage />} />
      <Route path="/admin/users" element={<AdminUsersPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
    </Routes>
  )
}

export default App
