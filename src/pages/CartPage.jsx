import { useNavigate } from 'react-router-dom'
import './CartPage.css'

export default function CartPage({ cart = [], onUpdateCart }) {
  const navigate = useNavigate()

  // Savatdagi barcha tovarlarning umumiy summasi
  const totalPrice = cart.reduce(
    (acc, item) => acc + Number(item.price || 0) * item.quantity,
    0
  )

  // Jami tovarlar soni
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0)

  return (
    <div className="cart-page">
      {/* Sarlavha qismi */}
      <div className="page-header">
        <h2>Savat</h2>
        {cart.length > 0 && (
          <span className="cart-badge">{totalItemsCount} ta tovar</span>
        )}
      </div>

      {cart.length === 0 ? (
        /* Savat bo'sh bo'lgandagi ko'rinish */
        <div className="empty-cart-box">
          <div className="empty-cart-icon">🛒</div>
          <h3>Savatingiz hozircha bo‘sh</h3>
          <p>O‘zingizga yoqqan tovarlarni savatga qo‘shing</p>
          <button className="go-shopping-btn" onClick={() => navigate('/')}>
            Xaridni boshlash
          </button>
        </div>
      ) : (
        /* Savatda tovarlar bo'lgandagi ko'rinish */
        <div className="cart-content">
          <div className="cart-list">
            {cart.map((item) => {
              // Firestore'dagi images massividan birinchi rasmni to'g'ri olish
              const displayImg =
                Array.isArray(item.images) && item.images.length > 0
                  ? item.images[0]
                  : item.imageUrl ||
                    item.image ||
                    'https://via.placeholder.com/150'

              return (
                <div key={item.id} className="cart-item">
                  {/* Rasmga bosilganda mahsulot sahifasiga o'tish */}
                  <img
                    src={displayImg}
                    alt={item.title || item.name}
                    className="cart-item-img"
                    onClick={() => navigate(`/product/${item.id}`)}
                  />

                  <div className="cart-item-info">
                    <h4
                      className="item-name"
                      onClick={() => navigate(`/product/${item.id}`)}
                    >
                      {item.title || item.name}
                    </h4>
                    <p className="item-price">
                      {Number(item.price || 0).toLocaleString()} so'm
                    </p>

                    <div className="cart-item-bottom">
                      {/* - 1 + Boshqaruvchisi */}
                      <div className="qty-control">
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => onUpdateCart(item, -1)}
                        >
                          −
                        </button>
                        <span className="qty-number">{item.quantity}</span>
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => onUpdateCart(item, 1)}
                        >
                          +
                        </button>
                      </div>

                      {/* Tovarning o'zining jami summasi */}
                      <span className="item-total-cost">
                        {(Number(item.price || 0) * item.quantity).toLocaleString()}{' '}
                        so'm
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pastki hisob-kitob bloki */}
          <div className="cart-summary-card">
            <div className="summary-row">
              <span className="summary-label">Jami tovarlar:</span>
              <span className="summary-value">{totalItemsCount} dona</span>
            </div>
            <div className="summary-row total-row">
              <span>Umumiy summa:</span>
              <span className="total-price-text">
                {totalPrice.toLocaleString()} so'm
              </span>
            </div>

            {/* Bosilganda /checkout sahifasiga o'tkazish */}
            <button
              type="button"
              className="checkout-btn"
              onClick={() => navigate('/checkout')}
            >
              Buyurtma berish
            </button>
          </div>
        </div>
      )}
    </div>
  )
}