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

  const [popupBanner, setPopupBanner] = useState(null)
  const [showPopup, setShowPopup] = useState(false)

  const getItemQty = (productId) => {
    const found = cart.find((item) => item.id === productId)
    return found ? found.quantity : 0
  }

  // 1. Bannerlarni yuklash
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'banners'))
        const items = querySnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((banner) => banner.isActive !== false)

        const shuffled = shuffleArray(items)
        setBanners(shuffled.slice(0, 5))

        const alreadySeen = sessionStorage.getItem('uzum_popup_shown')
        if (!alreadySeen && shuffled.length > 0) {
          setPopupBanner(shuffled[0])
          setShowPopup(true)
          sessionStorage.setItem('uzum_popup_shown', 'true')
        }
      } catch (error) {
        console.error('Reklamalarni yuklashda xatolik:', error)
      } finally {
        setLoadingBanners(false)
      }
    }

    fetchBanners()
  }, [])

  // 2. Mahsulotlarni olish
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'products'))
        const items = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setProducts(shuffleArray(items))
      } catch (error) {
        console.error('Tovarlarni yuklashda xatolik:', error)
      } finally {
        setLoadingProducts(false)
      }
    }

    fetchProducts()
  }, [])

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev === banners.length - 1 ? 0 : prev + 1))
    }, 3800)
    return () => clearInterval(timer)
  }, [banners])

  const handleActionClick = () => {
    setShowPopup(false)
    if (popupBanner?.targetUrl) {
      navigate(popupBanner.targetUrl)
    } else if (popupBanner?.productId) {
      navigate(`/product/${popupBanner.productId}`)
    }
  }

  return (
    <div className="HomePage">
      <Navbar />

      {/* --- UZUM STORIES POPUP --- */}
      {showPopup && popupBanner && (
        <div className="uzum-story-fullscreen">
          <img
            src={
              popupBanner.imageUrl ||
              popupBanner.image ||
              'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&auto=format&fit=crop'
            }
            alt={popupBanner.title || 'Mavsumiy reklama'}
            className="uzum-story-bg-img"
          />
          <div className="uzum-story-gradient-overlay"></div>
          <div className="uzum-story-topbar">
            <div className="uzum-story-bar-track">
              <div className="uzum-story-bar-fill"></div>
            </div>
            <button
              type="button"
              className="uzum-story-close"
              onClick={() => setShowPopup(false)}
              aria-label="Yopish"
            >
              ✕
            </button>
          </div>

          <div className="uzum-story-content">
            <h1 className="uzum-story-headline">
              {popupBanner.title || 'Yangi mavsum — yangi obrazlar'}
            </h1>
            <p className="uzum-story-subline">
              {popupBanner.description || 'Kiyim, poyabzal va aksessuarlar hamyonbop narxlarda'}
            </p>
          </div>

          <div className="uzum-story-bottom">
            <button
              type="button"
              className="uzum-story-btn"
              onClick={handleActionClick}
            >
              {popupBanner.buttonText || 'Xaridlarga'}
            </button>
          </div>
        </div>
      )}

      {/* --- CONTENT --- */}
      <div className="home-content">
        {/* Banner Slayderi */}
        {!loadingBanners && banners.length > 0 && (
          <div className="ad-slider-wrapper">
            <div className="ad-slider">
              <div
                className="ad-track"
                style={{ transform: `translateX(-${activeIdx * 100}%)` }}
              >
                {banners.map((banner) => {
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

        {/* Servis Afzalliklari */}
        <div className="perks-strip">
          <div className="perk-box">
            <span className="perk-icon-circle">
              <i className="fa-solid fa-truck-fast"></i>
            </span>
            <span className="perk-title">Tezkor yetkazish</span>
            <span className="perk-sub">O‘zbekiston bo‘ylab</span>
          </div>
          <div className="perk-box">
            <span className="perk-icon-circle">
              <i className="fa-solid fa-shield-halved"></i>
            </span>
            <span className="perk-title">Xavfsiz xarid</span>
            <span className="perk-sub">100% kafolatlangan</span>
          </div>
          <div className="perk-box">
            <span className="perk-icon-circle">
              <i className="fa-solid fa-credit-card"></i>
            </span>
            <span className="perk-title">Oson to‘lov</span>
            <span className="perk-sub">Naqd yoki karta</span>
          </div>
        </div>

        {/* Mahsulotlar Ro'yxati */}
        <div className="products-section">
          <div className="section-title-wrap">
            <div className="title-left">
              <h2 className="section-heading">Ommabop mahsulotlar</h2>
              <span className="section-subtext">
                Siz uchun saralangan maxsus takliflar
              </span>
            </div>
            <span className="products-badge">{products.length} ta</span>
          </div>

          {loadingProducts ? (
            <div className="products-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="product-skeleton-card">
                  <div className="skeleton-img"></div>
                  <div className="skeleton-line full"></div>
                  <div className="skeleton-line short"></div>
                  <div className="skeleton-btn"></div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon-wrap">
                <i className="fa-solid fa-box-open"></i>
              </span>
              <h4>Mahsulotlar mavjud emas</h4>
              <p>Tez orada yangi tovarlar qo‘shiladi</p>
            </div>
          ) : (
            <div className="products-grid">
              {products.map((item) => {
                const qty = getItemQty(item.id)
                const displayImg =
                  Array.isArray(item.images) && item.images.length > 0
                    ? item.images[0]
                    : item.imageUrl ||
                      item.image ||
                      'https://via.placeholder.com/150'

                // Chegirma hisob-kitoblari (Firestore ma'lumotlari bo'yicha)
                const hasDiscount = Number(item.discount || 0) > 0 || Number(item.discountPrice || 0) > 0
                const finalPrice = Number(item.discountPrice || item.price || 0)
                const oldPrice = Number(item.price || 0)
                const discountPercent = item.discount || (oldPrice > finalPrice ? Math.round(((oldPrice - finalPrice) / oldPrice) * 100) : null)
                const isOutOfStock = Number(item.stock || 0) <= 0

                return (
                  <div
                    key={item.id}
                    className={`product-card ${qty > 0 ? 'in-cart' : ''}`}
                  >
                    {/* Chegirma foizi belgisi */}
                    {hasDiscount && discountPercent && (
                      <span className="product-discount-badge">
                        -{discountPercent}%
                      </span>
                    )}

                    {/* Savatdagi soni */}
                    {qty > 0 && (
                      <span className="cart-item-badge">
                        <i className="fa-solid fa-cart-shopping"></i> {qty}
                      </span>
                    )}

                    <div
                      className="product-clickable-area"
                      onClick={() => navigate(`/product/${item.id}`)}
                    >
                      <div className="product-img-box">
                        <img
                          src={displayImg}
                          alt={item.title || item.name}
                          className="product-img"
                          loading="lazy"
                        />
                      </div>

                      <div className="product-details">
                        <h4 className="product-name">
                          {item.title || item.name}
                        </h4>

                        {/* Chegirma va Yakuniy Narx Bloki */}
                        <div className="product-price-row">
                          {hasDiscount && oldPrice > finalPrice && (
                            <span className="product-old-price">
                              {oldPrice.toLocaleString()} so‘m
                            </span>
                          )}
                          <div className="product-price-flex">
                            <span className="product-price">
                              {finalPrice.toLocaleString()}{' '}
                              <small>so‘m</small>
                            </span>
                            {/* Qolgan ombor soni (stock) */}
                            {Number(item.stock) < 10 && Number(item.stock) > 0 && (
                              <span className="stock-warning">
                                Faqat {item.stock} ta qoldi
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="product-card-action">
                      {isOutOfStock ? (
                        <button className="add-cart-btn disabled-btn" disabled>
                          Tugagan
                        </button>
                      ) : qty === 0 ? (
                        <button
                          className="add-cart-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Savatga chegirmali narx (finalPrice) bilan qo'shish
                            onUpdateCart({ ...item, price: finalPrice }, 1)
                          }}
                        >
                          <i className="fa-solid fa-basket-shopping"></i> Savatga
                        </button>
                      ) : (
                        <div
                          className="product-qty-box"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => onUpdateCart({ ...item, price: finalPrice }, -1)}
                          >
                            <i className="fa-solid fa-minus"></i>
                          </button>
                          <span className="qty-value">{qty}</span>
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => {
                              if (qty >= (item.stock || 9999)) {
                                alert(`Kechirasiz, omborda faqat ${item.stock} ta tovar bor!`)
                                return
                              }
                              onUpdateCart({ ...item, price: finalPrice }, 1)
                            }}
                          >
                            <i className="fa-solid fa-plus"></i>
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