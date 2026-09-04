import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import './OrdersPage.css'

export default function OrdersPage({ user = null }) {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const tgId = String(user?.telegramId || user?.id || '21323832')

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        const q = query(
          collection(db, 'orders'),
          where('telegramId', '==', tgId)
        )
        const snap = await getDocs(q)
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

        // Eng so'nggi buyurtmalar tepada
        list.sort((a, b) => {
          const tA = a.createdAt?.seconds || 0
          const tB = b.createdAt?.seconds || 0
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
  }, [tgId])

  // 3 xil statusni ko'rsatish
  const renderStatus = (status) => {
    switch (status) {
      case 'preparing':
        return <span className="status-badge status-preparing">📦 Yig‘ilmoqda</span>
      case 'delivering':
        return <span className="status-badge status-delivering">🛵 Yetkazilmoqda</span>
      case 'ready_for_pickup':
        return <span className="status-badge status-pickup">🏬 Olib ketish mumkin</span>
      default:
        return <span className="status-badge status-preparing">📦 Yig‘ilmoqda</span>
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return 'Hozirgina'
    const date = new Date(timestamp.seconds * 1000)
    return date.toLocaleDateString('uz-UZ', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="orders-page">
      <div className="orders-header">
        <h2>Mening xaridlarim</h2>
        <span className="orders-count">{orders.length} ta buyurtma</span>
      </div>

      {loading ? (
        <div className="orders-loading">
          <div className="spinner"></div>
          <p>Xaridlar yuklanmoqda...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-orders-card">
          <div className="empty-icon">📦</div>
          <h3>Sizda hali xaridlar yo‘q</h3>
          <p>Barcha bergan buyurtmalaringiz shu yerda saqlanadi.</p>
          <button className="start-shopping-btn" onClick={() => navigate('/')}>
            Xaridni boshlash
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-card-header">
                <div>
                  <span className="order-id">#{order.orderId || order.id}</span>
                  <span className="order-date">{formatDate(order.createdAt)}</span>
                </div>
                {renderStatus(order.status)}
              </div>

              <div className="order-delivery-type">
                <span>Yetkazish:</span>
                <strong>
                  {order.customer?.deliveryType === 'courier'
                    ? '🛵 Kuryer orqali'
                    : `🏬 Olib ketish punkti (${order.customer?.pickupPoint || 'Filial'})`}
                </strong>
              </div>

              <div className="order-items-scroll">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="order-item-chip">
                    <img
                      src={item.image || 'https://via.placeholder.com/60'}
                      alt={item.title}
                      className="order-item-img"
                    />
                    <div className="order-item-info">
                      <span className="order-item-title">{item.title}</span>
                      <span className="order-item-sub">
                        {item.quantity} dona × {Number(item.price || 0).toLocaleString()} so'm
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="order-card-footer">
                <div className="order-pay-method">
                  💵 Qabul qilganda to‘lash
                </div>
                <div className="order-total-price">
                  <span>Jami:</span>
                  <strong>{Number(order.totalPrice || 0).toLocaleString()} so'm</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}