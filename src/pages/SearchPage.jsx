import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import Navbar from '../components/Navbar.jsx'
import './SearchPage.css'

export default function SearchPage({ cart = [], onUpdateCart }) {
  const [searchParams] = useSearchParams()
  const queryParam = searchParams.get('q') || ''
  const navigate = useNavigate()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  // Filtr holatlari
  const [selectedCategory, setSelectedCategory] = useState('Barchasi')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  // 1. Bazadan mahsulotlarni olish
  useEffect(() => {
    const fetchAllProducts = async () => {
      setLoading(true)
      try {
        const snap = await getDocs(collection(db, 'products'))
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        setProducts(list)
      } catch (err) {
        console.error('Qidiruvda mahsulotlarni yuklashda xatolik:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAllProducts()
  }, [])

  // 2. Mavjud kategoriyalarni aniqlash
  const categories = useMemo(() => {
    const set = new Set()
    products.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    return ['Barchasi', ...Array.from(set)]
  }, [products])

  // 3. Mahsulotlarni saralash (qidiruv, kategoriya, min/max)
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const title = (item.title || item.name || '').toLowerCase()
      const category = (item.category || '').toLowerCase()
      const q = queryParam.toLowerCase().trim()

      const matchesQuery = !q || title.includes(q) || category.includes(q)
      const matchesCategory =
        selectedCategory === 'Barchasi' || item.category === selectedCategory

      const price = Number(item.price || 0)
      const matchesMin = minPrice === '' || price >= Number(minPrice)
      const matchesMax = maxPrice === '' || price <= Number(maxPrice)

      return matchesQuery && matchesCategory && matchesMin && matchesMax
    })
  }, [products, queryParam, selectedCategory, minPrice, maxPrice])

  const getItemQty = (id) => {
    const found = cart.find((c) => c.id === id)
    return found ? found.quantity : 0
  }

  return (
    <div className="search-page">
      <Navbar initialQuery={queryParam} />

      <div className="search-content">
        {/* Sarlavha */}
        <div className="search-header-info">
          <h3>
            Natijalar: <span className="highlight-text">"{queryParam}"</span>
          </h3>
          <span className="count-badge">{filteredProducts.length} ta</span>
        </div>

        {/* Filtr paneli */}
        <div className="filter-card">
          <div className="filter-title">Kategoriyalar:</div>
          <div className="category-scroll">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Min va Max narx filtri */}
          <div className="price-filter-row">
            <div className="price-input-group">
              <label>Min (so'm)</label>
              <input
                type="number"
                placeholder="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
            </div>

            <span className="price-dash">—</span>

            <div className="price-input-group">
              <label>Max (so'm)</label>
              <input
                type="number"
                placeholder="Cheksiz"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>

            {(minPrice || maxPrice || selectedCategory !== 'Barchasi') && (
              <button
                type="button"
                className="reset-filter-btn"
                onClick={() => {
                  setSelectedCategory('Barchasi')
                  setMinPrice('')
                  setMaxPrice('')
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Natijalar ro'yxati */}
        {loading ? (
          <div className="loading-state">Qidirilmoqda...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-search-box">
            <div className="empty-icon">🔎</div>
            <h4>Mahsulot topilmadi</h4>
            <p>Filtrlarni o‘zgartirib yoki boshqa so‘z bilan qidirib ko‘ring</p>
          </div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map((item) => {
              const qty = getItemQty(item.id)

              // Firestore'dagi images massivi yoki alohida imageUrl
              const displayImg =
                Array.isArray(item.images) && item.images.length > 0
                  ? item.images[0]
                  : item.imageUrl ||
                    item.image ||
                    'https://via.placeholder.com/150'

              return (
                <div key={item.id} className={`product-card ${qty > 0 ? 'in-cart' : ''}`}>
                  {qty > 0 && <span className="cart-item-badge">Savatda: {qty}</span>}

                  <div
                    className="product-clickable-area"
                    onClick={() => navigate(`/product/${item.id}`)}
                  >
                    <div className="product-img-box">
                      <img
                        src={displayImg}
                        alt={item.title || item.name}
                        className="product-img"
                      />
                    </div>

                    <div className="product-details">
                      <h4 className="product-name">{item.title || item.name}</h4>
                      <p className="product-price">
                        {Number(item.price || 0).toLocaleString()} so'm
                      </p>
                    </div>
                  </div>

                  <div className="product-card-action">
                    {qty === 0 ? (
                      <button
                        type="button"
                        className="add-cart-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          onUpdateCart(item, 1)
                        }}
                      >
                        Savatga
                      </button>
                    ) : (
                      <div className="product-qty-box" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => onUpdateCart(item, -1)}
                        >
                          −
                        </button>
                        <span className="qty-value">{qty}</span>
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => onUpdateCart(item, 1)}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}