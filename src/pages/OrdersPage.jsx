import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import './OrdersPage.css'

export default function OrdersPage({ user = null }) {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  // Firestore'dagi telegramId yoki userId bo'yicha olish
  const activeUserId = String(
    user?.telegramId || user?.id || user?.userId || '8919800652'
  )

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)

        // telegramId bo'yicha so'rov
        let q = query(
          collection(db, 'orders'),
          where('telegramId', '==', activeUserId)
        )
        let snap = await getDocs(q)

        // Agar telegramId bo'yicha topilmasa, userId bo'yicha qidirib ko'rish
        if (snap.empty) {
          q = query(
            collection(db, 'orders'),
            where('userId', '==', activeUserId)
          )
          snap = await getDocs(q)
        }

        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

        // Eng yangi buyurtmalar tepada turishi uchun saralash
        list.sort((a, b) => {
          const tA = a.createdAt?.seconds || (a.createdAt?.toDate ? a.createdAt.toDate().getTime() / 1000 : 0)
          const tB = b.createdAt?.seconds || (b.createdAt?.toDate ? b.createdAt.toDate().getTime() / 1000 : 0)
          return tB - tA
        })

        setOrders(list)
      } catch (err) {
        console.error('Buyurtmalarni yuklashda xatolik:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [activeUserId])

  // Firestore'dagi status qiymatlariga moslab chiqarish
  const renderStatus = (status) => {
    const s = (status || '').toLowerCase().trim()

    switch (s) {
      case 'bajarildi':
      case 'completed':
        return (
          <span className="status-badge status-completed">
            <i className="fa-solid fa-circle-check"></i> Bajarildi
          </span>
        )
      case 'delivering':
      case 'yetkazilmoqda':
        return (
          <span className="status-badge status-delivering">
            <i className="fa-solid fa-truck-fast"></i> Yetkazilmoqda
          </span>
        )
      case 'ready_for_pickup':
      case 'kutmoqda':
        return (
          <span className="status-badge status-pickup">
            <i className="fa-solid fa-shop"></i> Olib ketishga tayyor
          </span>
        )
      case 'cancelled':
      case 'bekor_qilindi':
        return (
          <span className="status-badge status-cancelled">
            <i className="fa-solid fa-ban"></i> Bekor qilindi
          </span>
        )
      default:
        return (
          <span className="status-badge status-preparing">
            <i className="fa-solid fa-box-open"></i> Kutilmoqda
          </span>
        )
    }
  }

  // To'lov turi matni
  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'cash_on_delivery':
        return 'Qabul qilganda naqd to‘lov'
      case 'card':
        return 'Karta orqali to‘langan'
      case 'click':
        return 'Click orqali to‘langan'
      case 'payme':
        return 'Payme orqali to‘langan'
      default:
        return 'Qabul qilganda to‘lash'
    }
  }

  // Vaqtni formatlash
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Yaqinda'
    const date = timestamp.seconds
      ? new Date(timestamp.seconds * 1000)
      : timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp)

    return date.toLocaleDateString('uz-UZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="orders-page">
      <div className="orders-header">
        <div>
          <h2>Mening xaridlarim</h2>
          <p className="orders-subtitle">Barcha buyurtmalaringiz tarixi va holati</p>
        </div>
        <span className="orders-count">{orders.length} ta buyurtma</span>
      </div>

      {loading ? (
        <div className="orders-loading">
          <i className="fa-solid fa-circle-notch fa-spin loading-spinner-icon"></i>
          <p>Xaridlar yuklanmoqda...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-orders-card">
          <div className="empty-icon-circle">
            <i className="fa-solid fa-box-archive"></i>
          </div>
          <h3>Sizda hali xaridlar yo‘q</h3>
          <p>Barcha bergan buyurtmalaringiz shu yerda saqlanadi.</p>
          <button className="start-shopping-btn" onClick={() => navigate('/')}>
            <i className="fa-solid fa-bag-shopping"></i> Xaridni boshlash
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => {
            const customer = order.customer || {}
            const isPickup = customer.deliveryType === 'pickup'

            return (
              <div key={order.id} className="order-card">
                {/* Buyurtma ID va Status */}
                <div className="order-card-header">
                  <div>
                    <span className="order-id">#{order.orderId || order.id}</span>
                    <span className="order-date">
                      <i className="fa-regular fa-clock"></i> {formatDate(order.createdAt)}
                    </span>
                  </div>
                  {renderStatus(order.status)}
                </div>

                {/* Yetkazib berish / Olib ketish punkti manzili */}
                <div className="order-delivery-info">
                  <div className="delivery-icon-box">
                    <i className={`fa-solid ${isPickup ? 'fa-store' : 'fa-location-dot'}`}></i>
                  </div>
                  <div className="delivery-text-box">
                    <span className="delivery-method-name">
                      {isPickup ? 'Olib ketish punkti' : 'Kuryer orqali yetkazish'}
                    </span>
                    <p className="delivery-address-text">
                      {isPickup
                        ? customer.pickupPoint || customer.address || 'Topshirish punkti'
                        : customer.address || 'Manzil ko‘rsatilmagan'}
                    </p>
                  </div>
                </div>

                {/* Buyurtma tovarlari */}
                <div className="order-items-scroll">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="order-item-chip">
                      <img
                        src={item.image || 'https://via.placeholder.com/60'}
                        alt={item.title || 'Mahsulot'}
                        className="order-item-img"
                      />
                      <div className="order-item-info">
                        <span className="order-item-title">{item.title}</span>
                        <div className="order-item-calc">
                          <span className="order-item-qty">{item.quantity} dona</span>
                          <span className="order-item-x">×</span>
                          <span className="order-item-unit-price">
                            {Number(item.price || 0).toLocaleString()} so‘m
                          </span>
                        </div>
                      </div>
                      <span className="order-item-row-total">
                        {(Number(item.price || 0) * (item.quantity || 1)).toLocaleString()} so‘m
                      </span>
                    </div>
                  ))}
                </div>

                {/* To'lov va umumiy summa xulosasi */}
                <div className="order-card-footer">
                  <div className="order-pay-method">
                    <i className="fa-solid fa-wallet"></i>
                    <span>{getPaymentMethodLabel(order.paymentMethod)}</span>
                  </div>
                  <div className="order-total-price">
                    <span>Jami:</span>
                    <strong>{Number(order.totalPrice || 0).toLocaleString()} so‘m</strong>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}