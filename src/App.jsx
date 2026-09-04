import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import './App.css'
import Footer from './components/Footer.jsx'
import HomePage from './pages/HomePage.jsx'
import ProductDetailPage from './pages/ProductDetailPage.jsx'
import CartPage from './pages/CartPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import SearchPage from './pages/SearchPage.jsx'
import CheckoutPage from './pages/CheckoutPage.jsx'
import OrdersPage from './pages/OrdersPage.jsx'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Savatdagi tovarlar holati (localStorage bilan sinxron)
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('zipo_cart')
      return savedCart ? JSON.parse(savedCart) : []
    } catch {
      return []
    }
  })

  // Savat yangilanganida localStorage'ga saqlash
  useEffect(() => {
    localStorage.setItem('zipo_cart', JSON.stringify(cart))
  }, [cart])

  // Foydalanuvchi tizimga kirganligini tekshirish
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('zipo_user')
      if (savedUser) {
        setUser(JSON.parse(savedUser))
      }
    } catch (e) {
      console.error("Foydalanuvchi ma'lumotini olishda xatolik:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Savatga tovar qo'shish, ko'paytirish va kamaytirish
  const handleUpdateCart = (product, delta) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id)

      if (!existing && delta > 0) {
        return [...prevCart, { ...product, quantity: 1 }]
      }

      if (existing) {
        const newQty = existing.quantity + delta
        if (newQty <= 0) {
          return prevCart.filter((item) => item.id !== product.id)
        }
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: newQty } : item
        )
      }

      return prevCart
    })
  }

  // Tizimdan chiqish
  const handleLogout = () => {
    localStorage.removeItem('zipo_user')
    setUser(null)
  }

  // Boshlang'ich tekshiruv vaqtidagi yuklanish
  if (loading) {
    return (
      <div className="App auth-loading">
        <div className="spinner"></div>
      </div>
    )
  }

  // Login qilinmagan bo'lsa faqat login sahifasi ko'rsatiladi
  if (!user) {
    return (
      <div className="App">
        <LoginPage onLoginSuccess={(userData) => setUser(userData)} />
      </div>
    )
  }

  // Pastki navigatsiyada ko'rsatish uchun savatdagi jami tovarlar soni
  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0)

  return (
    <div className="App">
      <Routes>
        <Route
          path="/"
          element={<HomePage cart={cart} onUpdateCart={handleUpdateCart} />}
        />
        <Route
          path="/search"
          element={<SearchPage cart={cart} onUpdateCart={handleUpdateCart} />}
        />
        <Route
          path="/product/:id"
          element={
            <ProductDetailPage cart={cart} onUpdateCart={handleUpdateCart} />
          }
        />
        <Route
          path="/cart"
          element={<CartPage cart={cart} onUpdateCart={handleUpdateCart} />}
        />
        <Route
          path="/checkout"
          element={<CheckoutPage cart={cart} onClearCart={() => setCart([])} user={user} />}
        />
        <Route path="/orders" element={<OrdersPage user={user} />} />
        <Route
          path="/profile"
          element={
            <ProfilePage
              user={user}
              onUpdateUser={(updated) => setUser((prev) => ({ ...prev, ...updated }))}
              onLogout={() => {
                setUser(null)
                localStorage.removeItem('zipo_user')
              }}
            />
          }
        />

        {/* Yuqoridagi birorta manzilga mos kelmasa 404 chiqadi */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      <Footer cartCount={totalCartCount} />
    </div>
  )
}

export default App