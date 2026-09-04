import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import './ProductDetailPage.css'

export default function ProductDetailPage({ cart = [], onUpdateCart }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)
  const [activeImageIdx, setActiveImageIdx] = useState(0)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Savatga qo'shiladigan miqdor
  const [buyQuantity, setBuyQuantity] = useState(1)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setActiveImageIdx(0)
    setBuyQuantity(1)

    const fetchProductAndRelated = async () => {
      setLoading(true)
      try {
        // 1. Joriy tovar ma'lumotlari
        const docRef = doc(db, 'products', id)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const currentProd = { id: docSnap.id, ...docSnap.data() }
          setProduct(currentProd)

          // 2. Tavsiya etiladigan boshqa tovarlar
          const querySnapshot = await getDocs(collection(db, 'products'))
          const allOther = querySnapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((d) => d.id !== id)

          const shuffled = allOther.sort(() => 0.5 - Math.random()).slice(0, 8)
          setRelatedProducts(shuffled)
        } else {
          setError("Mahsulot topilmadi")
        }
      } catch (err) {
        console.error("Xatolik:", err)
        setError("Ma'lumotni yuklashda xatolik yuz berdi")
      } finally {
        setLoading(false)
      }
    }

    fetchProductAndRelated()
  }, [id])

  if (loading) {
    return (
      <div className="product-detail-page loading-center">
        <div className="spinner"></div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="product-detail-page center-box">
        <p>{error || "Mahsulot topilmadi"}</p>
        <button className="back-btn" onClick={() => navigate(-1)}>Orqaga qaytish</button>
      </div>
    )
  }

  // Rasmlar massivini aniqlash
  const imageList = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [product.imageUrl || product.image || 'https://via.placeholder.com/400']

  // Joriy mahsulot savatda bormi-yo'qmi
  const inCartItem = cart.find((item) => item.id === product.id)
  const currentCartQty = inCartItem ? inCartItem.quantity : 0

  const getItemQty = (productId) => {
    const found = cart.find((item) => item.id === productId)
    return found ? found.quantity : 0
  }

  return (
    <div className="product-detail-page">
      {/* Tepa navigatsiya */}
      <div className="detail-header">
        <button className="icon-btn" onClick={() => navigate(-1)}>
          &larr;
        </button>
        <h3 className="header-title">Mahsulot tafsiloti</h3>
        <div style={{ width: 32 }}></div>
      </div>

      {/* 1:1 formatdagi rasm */}
      <div className="detail-image-box">
        <img
          src={imageList[activeImageIdx]}
          alt={product.title || product.name}
          className="detail-image"
        />
      </div>

      {/* Miniatyuralar */}
      {imageList.length > 1 && (
        <div className="image-thumbnails-wrapper">
          <div className="image-thumbnails">
            {imageList.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt="thumbnail"
                className={`thumbnail-item ${activeImageIdx === idx ? 'active' : ''}`}
                onClick={() => setActiveImageIdx(idx)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Asosiy ma'lumotlar bloki */}
      <div className="detail-info-card">
        <div className="price-tag">
          {Number(product.price || 0).toLocaleString()} so'm
        </div>
        <h1 className="detail-name">{product.title || product.name}</h1>

        <div className="badge-row">
          {product.category && (
            <span className="detail-category">{product.category}</span>
          )}
          {product.stock !== undefined && (
            <span className="stock-badge">
              {Number(product.stock) > 0 ? `Qoldiq: ${product.stock} ta` : 'Mavjud emas'}
            </span>
          )}
        </div>

        <div className="divider"></div>

        {/* Tavsif */}
        <h4 className="section-subtitle">Tavsif</h4>
        <p className="detail-desc">
          {product.description || product.desc || "Ushbu mahsulot uchun batafsil tavsif kiritilmagan."}
        </p>

        {/* Xususiyatlar */}
        {product.characteristics && Object.keys(product.characteristics).length > 0 && (
          <div className="characteristics-box">
            <h4 className="section-subtitle">Xususiyatlari</h4>
            <ul>
              {Object.entries(product.characteristics).map(([key, value]) => (
                <li key={key}>
                  <span className="spec-key">{key}:</span>
                  <span className="spec-val">{value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* SAVATGA QO'SHISH TUGMASI - TAVSIFDAN SO'NG O'Z O'RNIDA */}
        <div className="inline-cart-action-area">
          {currentCartQty === 0 ? (
            <div className="add-cart-action-group">
              <div className="initial-qty-picker">
                <button
                  type="button"
                  className="qty-step-btn"
                  onClick={() => setBuyQuantity((prev) => Math.max(1, prev - 1))}
                >
                  −
                </button>
                <span className="qty-step-val">{buyQuantity}</span>
                <button
                  type="button"
                  className="qty-step-btn"
                  onClick={() => setBuyQuantity((prev) => prev + 1)}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className="add-to-cart-full"
                onClick={() => onUpdateCart(product, buyQuantity)}
              >
                <i className="fa-solid fa-cart-shopping"></i>
                <span>Savatga qo'shish</span>
              </button>
            </div>
          ) : (
            <div className="qty-control-full">
              <button
                type="button"
                className="ctrl-btn"
                onClick={() => onUpdateCart(product, -1)}
              >
                −
              </button>
              <div className="ctrl-center-text">
                <span className="ctrl-qty">{currentCartQty} ta</span>
                <span className="ctrl-subtext">savatda bor</span>
              </div>
              <button
                type="button"
                className="ctrl-btn"
                onClick={() => onUpdateCart(product, 1)}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tavsiya etiladigan boshqa mahsulotlar */}
      {relatedProducts.length > 0 && (
        <div className="related-section">
          <div className="section-title-wrap">
            <h3 className="related-heading">Sizga yoqishi mumkin</h3>
            <span className="related-sub">O‘xshash tovarlar</span>
          </div>

          <div className="products-grid">
            {relatedProducts.map((relItem) => {
              const relQty = getItemQty(relItem.id)
              const relImg = Array.isArray(relItem.images) && relItem.images.length > 0
                ? relItem.images[0]
                : (relItem.imageUrl || relItem.image || 'https://via.placeholder.com/150')

              return (
                <div key={relItem.id} className={`product-card ${relQty > 0 ? 'in-cart' : ''}`}>
                  {relQty > 0 && <span className="cart-item-badge">Savatda: {relQty}</span>}

                  <div
                    className="product-clickable-area"
                    onClick={() => navigate(`/product/${relItem.id}`)}
                  >
                    <div className="product-img-box">
                      <img
                        src={relImg}
                        alt={relItem.title || relItem.name}
                        className="product-img"
                      />
                    </div>

                    <div className="product-details">
                      <h4 className="product-name">{relItem.title || relItem.name}</h4>
                      <p className="product-price">
                        {Number(relItem.price || 0).toLocaleString()} so'm
                      </p>
                    </div>
                  </div>

                  <div className="product-card-action">
                    {relQty === 0 ? (
                      <button
                        className="add-cart-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          onUpdateCart(relItem, 1)
                        }}
                      >
                        Savatga
                      </button>
                    ) : (
                      <div className="product-qty-box" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="qty-btn"
                          onClick={() => onUpdateCart(relItem, -1)}
                        >
                          −
                        </button>
                        <span className="qty-value">{relQty}</span>
                        <button
                          className="qty-btn"
                          onClick={() => onUpdateCart(relItem, 1)}
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
        </div>
      )}
    </div>
  )
}