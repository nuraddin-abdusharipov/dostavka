import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import './HomePage.css'
import Navbar from '../components/Navbar.jsx'

const shuffleArray = (array) => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function HomePage({ cart = [], onUpdateCart }) {
  const navigate = useNavigate()

  const [activeIdx, setActiveIdx] = useState(0)
  const [banners, setBanners] = useState([])
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingBanners, setLoadingBanners] = useState(true)

  const getItemQty = (productId) => {
    const found = cart.find((item) => item.id === productId)
    return found ? found.quantity : 0
  }

  // 1. Reklamalarni Firestore'dan olish (faqat faollari va Firestore maydonlari bo'yicha)
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'banners'))
        const items = querySnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((banner) => banner.isActive !== false) // Faol bannerlar

        setBanners(shuffleArray(items).slice(0, 5))
      } catch (error) {
        console.error('Reklamalarni yuklashda xatolik:', error)
      } finally {
        setLoadingBanners(false)
      }
    }

    fetchBanners()
  }, [])

  // 2. Mahsulotlarni Firestore'dan olish
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'products'))
        const items = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setProducts(shuffleArray(items).slice(0, 20))
      } catch (error) {
        console.error('Tovarlarni yuklashda xatolik:', error)
      } finally {
        setLoadingProducts(false)
      }
    }

    fetchProducts()
  }, [])

  // Slayder aylanishi
  useEffect(() => {
    if (banners.length <= 1) return

    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev === banners.length - 1 ? 0 : prev + 1))
    }, 3500)

    return () => clearInterval(timer)
  }, [banners])

  return (
    <div className="HomePage">
      <Navbar />
      <div className="home-content">
        {/* Reklama Slayderi */}
        {!loadingBanners && banners.length > 0 && (
          <div className="ad-slider-wrapper">
            <div className="ad-slider">
              <div
                className="ad-track"
                style={{ transform: `translateX(-${activeIdx * 100}%)` }}
              >
                {banners.map((banner) => {
                  // Firestore'dagi gradient / background maydonini olish
                  const bannerBg =
                    banner.gradient ||
                    banner.background ||
                    'linear-gradient(135deg, #7C3AED, #5B21B6)'

                  return (
                    <div
                      key={banner.id}
                      className="ad-slide"
                      style={{ background: bannerBg }}
                    >
                      <div className="ad-content">
                        {banner.category && (
                          <span className="ad-tag">{banner.category}</span>
                        )}
                        <h3 className="ad-title">{banner.title}</h3>
                        {banner.description && (
                          <p className="ad-desc">{banner.description}</p>
                        )}
                      </div>

                      <div className="ad-image-box">
                        <img
                          src={
                            banner.imageUrl ||
                            banner.image ||
                            'https://via.placeholder.com/150'
                          }
                          alt={banner.title}
                          className="ad-banner-img"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {banners.length > 1 && (
                <div className="ad-indicators">
                  {banners.map((_, idx) => (
                    <span
                      key={idx}
                      className={`indicator ${
                        activeIdx === idx ? 'active' : ''
                      }`}
                      onClick={() => setActiveIdx(idx)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mahsulotlar Ro'yxati */}
        <div className="products-section">
          <div className="section-title-wrap">
            <h2 className="section-heading">Tavsiya etilgan tovarlar</h2>
            <span className="products-badge">Tasodifiy tanlov</span>
          </div>

          {loadingProducts ? (
            <div className="loading-state">Tovarlar yuklanmoqda...</div>
          ) : products.length === 0 ? (
            <div className="empty-state">Hozircha mahsulotlar mavjud emas</div>
          ) : (
            <div className="products-grid">
              {products.map((item) => {
                const qty = getItemQty(item.id)

                // Firestore'dagi images massividan birinchi rasmni olish
                const displayImg =
                  Array.isArray(item.images) && item.images.length > 0
                    ? item.images[0]
                    : item.imageUrl ||
                      item.image ||
                      'https://via.placeholder.com/150'

                return (
                  <div
                    key={item.id}
                    className={`product-card ${qty > 0 ? 'in-cart' : ''}`}
                  >
                    {/* Savatdagi soni (badge) */}
                    {qty > 0 && (
                      <span className="cart-item-badge">Savatda: {qty}</span>
                    )}

                    {/* Bosilganda mahsulot sahifasiga o'tadi */}
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
                        <h4 className="product-name">
                          {item.title || item.name}
                        </h4>
                        <p className="product-price">
                          {Number(item.price || 0).toLocaleString()} so'm
                        </p>
                      </div>
                    </div>

                    {/* Savat boshqaruvchisi: - qty + hammasi bitta qatorda */}
                    <div className="product-card-action">
                      {qty === 0 ? (
                        <button
                          className="add-cart-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            onUpdateCart(item, 1)
                          }}
                        >
                          Savatga
                        </button>
                      ) : (
                        <div
                          className="product-qty-box"
                          onClick={(e) => e.stopPropagation()}
                        >
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
    </div>
  )
}

export default HomePage