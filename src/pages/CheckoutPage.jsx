import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import './CheckoutPage.css'

// 5 ta tayyor filial
const PICKUP_POINTS = [
  { id: 1, name: 'Urganch Markaziy filiali', address: 'Al-Xorazmiy ko‘chasi, 24-uy', coords: [41.5565, 60.6312] },
  { id: 2, name: 'Xiva Ichan Qal\'a filiali', address: 'Pahlavon Mahmud ko‘chasi, 10-uy', coords: [41.3783, 60.3639] },
  { id: 3, name: 'Urganch Darital filiali', address: 'Xonqa ko‘chasi, 12-A uy', coords: [41.5421, 60.6210] },
  { id: 4, name: 'Xonqa filiali', address: 'Mustaqillik ko‘chasi, 5-uy', coords: [41.4682, 60.7715] },
  { id: 5, name: 'Shovot filiali', address: 'Turkiston ko‘chasi, 45-uy', coords: [41.6588, 60.3012] },
]

export default function CheckoutPage({ cart = [], onClearCart, user = null }) {
  const navigate = useNavigate()

  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || user?.telegramId || '+998')

  // Yetkazib berish turi: 'courier' (+30,000) yoki 'pickup' (+5,000)
  const [deliveryType, setDeliveryType] = useState('courier')
  const [selectedPickup, setSelectedPickup] = useState(PICKUP_POINTS[0])
  const [address, setAddress] = useState('')
  const [courierCoords, setCourierCoords] = useState([41.5565, 60.6312])

  // Xarita ref'lari
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const courierMarkerRef = useRef(null)
  const pickupMarkersRef = useRef([])

  // Promokod boshqaruvi
  const [promoInput, setPromoInput] = useState('')
  const [appliedPromo, setAppliedPromo] = useState(null)
  const [promoError, setPromoError] = useState('')
  const [checkingPromo, setCheckingPromo] = useState(false)

  const [loading, setLoading] = useState(false)
  const [successOrder, setSuccessOrder] = useState(null)

  // Hisob-kitob
  const itemsPrice = cart.reduce(
    (acc, item) => acc + Number(item.price || 0) * item.quantity,
    0
  )
  const totalCount = cart.reduce((acc, item) => acc + item.quantity, 0)
  const deliveryFee = deliveryType === 'courier' ? 30000 : 5000
  const discountAmount = appliedPromo ? Number(appliedPromo.discount || 0) : 0
  const finalPrice = Math.max(0, itemsPrice + deliveryFee - discountAmount)

  // Xaritani boshqarish (Kuryer va Filial uchun bitta moslashuvchan logika)
  useEffect(() => {
    const L = window.L
    if (!L || !mapContainerRef.current) return

    // Xarita hali yaratilmagan bo'lsa uni ishga tushirish
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView(
        deliveryType === 'courier' ? courierCoords : selectedPickup.coords,
        deliveryType === 'courier' ? 14 : 11
      )

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map)

      mapInstanceRef.current = map

      // Xarita bosilganda faqat kuryer rejimida marker ko'chadi
      map.on('click', (e) => {
        if (deliveryType === 'courier') {
          const { lat, lng } = e.latlng
          setCourierCoords([lat, lng])
          if (courierMarkerRef.current) {
            courierMarkerRef.current.setLatLng([lat, lng])
          }
        }
      })
    }

    const map = mapInstanceRef.current

    // Oldingi markerlarni tozalash
    if (courierMarkerRef.current) {
      map.removeLayer(courierMarkerRef.current)
      courierMarkerRef.current = null
    }
    pickupMarkersRef.current.forEach((m) => map.removeLayer(m))
    pickupMarkersRef.current = []

    if (deliveryType === 'courier') {
      // Kuryer rejimi: bitta harakatlanuvchi marker
      map.setView(courierCoords, 14)
      const marker = L.marker(courierCoords).addTo(map)
      courierMarkerRef.current = marker
    } else {
      // Filial rejimi: barcha 5 ta filialga marker qo'yish
      map.setView(selectedPickup.coords, 12)

      PICKUP_POINTS.forEach((point) => {
        const isSelected = point.id === selectedPickup.id

        // Filial markeri
        const marker = L.marker(point.coords).addTo(map)
        marker.bindPopup(`<b>${point.name}</b><br/>${point.address}`)

        if (isSelected) {
          marker.openPopup()
        }

        // Marker bosilganda ushbu filialni tanlash
        marker.on('click', () => {
          setSelectedPickup(point)
          map.panTo(point.coords)
          marker.openPopup()
        })

        pickupMarkersRef.current.push(marker)
      })
    }

    setTimeout(() => {
      map.invalidateSize()
    }, 200)
  }, [deliveryType])

  // Ro'yxatdan filial tanlanganda xaritani unga qaratish
  const handleSelectPickup = (point) => {
    setSelectedPickup(point)
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(point.coords, 14, { animate: true })
      // Popuplarni yangilash
      pickupMarkersRef.current.forEach((m, idx) => {
        if (PICKUP_POINTS[idx].id === point.id) {
          m.openPopup()
        }
      })
    }
  }

  // GPS joylashuv (kuryer uchun)
  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newCoords = [pos.coords.latitude, pos.coords.longitude]
          setCourierCoords(newCoords)
          if (mapInstanceRef.current && courierMarkerRef.current) {
            mapInstanceRef.current.setView(newCoords, 15)
            courierMarkerRef.current.setLatLng(newCoords)
          }
        },
        () => alert('Joylashuvingizni aniqlab bo‘lmadi. Xaritadan qo‘lda tanlang.')
      )
    }
  }

  // Promokod tekshiruvi
  const handleCheckPromo = async () => {
    const cleanCode = promoInput.trim().toUpperCase()
    if (!cleanCode) return

    setCheckingPromo(true)
    setPromoError('')

    try {
      const q = query(collection(db, 'promocodes'), where('code', '==', cleanCode))
      const snap = await getDocs(q)

      if (snap.empty) {
        setPromoError('Bunday promokod topilmadi yoki muddati tugagan!')
        setAppliedPromo(null)
        return
      }

      const promoDoc = snap.docs[0]
      const data = promoDoc.data()

      const minRequired = Number(data.startsWith || data.minAmount || 0)
      if (itemsPrice < minRequired) {
        setPromoError(
          `Ushbu promokod faqat ${minRequired.toLocaleString()} so'mdan yuqori xaridlar uchun amal qiladi!`
        )
        setAppliedPromo(null)
        return
      }

      const discount = Number(data.discount || 0)
      setAppliedPromo({
        id: promoDoc.id,
        code: cleanCode,
        discount: discount,
      })
      setPromoError('')
    } catch (err) {
      console.error('Promokod tekshirishda xatolik:', err)
      setPromoError('Promokodni tekshirishda xatolik yuz berdi.')
    } finally {
      setCheckingPromo(false)
    }
  }

  // Buyurtma yuborish
  const handleOrderSubmit = async (e) => {
    e.preventDefault()

    if (!cart.length) {
      alert("Savatingiz bo'sh!")
      navigate('/')
      return
    }

    if (!name.trim() || !phone.trim()) {
      alert('Ism va telefon raqamingizni kiriting!')
      return
    }

    if (deliveryType === 'courier' && !address.trim()) {
      alert('Kuryer yetkazishi uchun manzilni kiriting!')
      return
    }

    setLoading(true)

    try {
      const tgId = String(user?.telegramId || user?.id || '21323832')

      const ordersQ = query(collection(db, 'orders'), where('telegramId', '==', tgId))
      const userOrdersSnap = await getDocs(ordersQ)
      const nextIndex = userOrdersSnap.size + 1
      const formattedIndex = String(nextIndex).padStart(4, '0')
      const customOrderId = `${tgId}-${formattedIndex}`

      const orderData = {
        orderId: customOrderId,
        telegramId: tgId,
        userId: user?.id || tgId,
        customer: {
          name: name.trim(),
          phone: phone.trim(),
          deliveryType,
          address: deliveryType === 'courier' ? address.trim() : selectedPickup.address,
          pickupPoint: deliveryType === 'pickup' ? selectedPickup.name : null,
          location:
            deliveryType === 'courier'
              ? { lat: courierCoords[0], lng: courierCoords[1] }
              : { lat: selectedPickup.coords[0], lng: selectedPickup.coords[1] },
        },
        items: cart.map((item) => ({
          id: item.id,
          title: item.title || item.name,
          price: Number(item.price || 0),
          quantity: item.quantity,
          image: (Array.isArray(item.images) && item.images[0]) || item.imageUrl || item.image || '',
        })),
        itemsPrice,
        deliveryFee,
        discountAmount,
        promoCode: appliedPromo?.code || null,
        totalPrice: finalPrice,
        totalCount,
        paymentMethod: 'cash_on_delivery',
        status: 'pending',
        createdAt: serverTimestamp(),
      }

      await setDoc(doc(db, 'orders', customOrderId), orderData)

      // Promokod bazadan o'chiriladi
      if (appliedPromo?.id) {
        try {
          await deleteDoc(doc(db, 'promocodes', appliedPromo.id))
        } catch (delErr) {
          console.error("Promokodni o'chirishda xatolik:", delErr)
        }
      }

      if (onClearCart) onClearCart()
      setSuccessOrder({ id: customOrderId, total: finalPrice })
    } catch (err) {
      console.error('Buyurtma berishda xatolik:', err)
      alert("Xatolik yuz berdi. Qaytadan urinib ko'ring.")
    } finally {
      setLoading(false)
    }
  }

  if (successOrder) {
    return (
      <div className="checkout-page center-box">
        <div className="success-card">
          <div className="success-icon">🎉</div>
          <h2>Buyurtmangiz qabul qilindi!</h2>
          <div className="order-id-badge">ID: {successOrder.id}</div>
          <p>Tez orada operatorimiz siz bilan bog'lanadi.</p>
          <div className="order-summary-mini">
            <span>To‘lov summasi:</span>
            <strong>{successOrder.total.toLocaleString()} so'm</strong>
          </div>
          <button className="done-btn" onClick={() => navigate('/')}>
            Bosh sahifaga qaytish
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="checkout-page">
      <div className="detail-header">
        <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
          &larr;
        </button>
        <h3 className="header-title">Rasmiylashtirish</h3>
        <div style={{ width: 32 }}></div>
      </div>

      <form className="checkout-content" onSubmit={handleOrderSubmit}>
        {/* Mijoz ma'lumotlari */}
        <div className="checkout-card">
          <h4 className="card-title">Mijoz ma'lumotlari</h4>
          <div className="form-group">
            <label>Ismingiz *</label>
            <input
              type="text"
              placeholder="Ismingizni kiriting"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Telefon raqamingiz *</label>
            <input
              type="tel"
              placeholder="+998 90 123 45 67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Yetkazib berish usuli */}
        <div className="checkout-card">
          <h4 className="card-title">Yetkazib berish usuli</h4>
          <div className="delivery-type-grid">
            <div
              className={`delivery-type-card ${deliveryType === 'courier' ? 'active' : ''}`}
              onClick={() => setDeliveryType('courier')}
            >
              <div className="type-icon">🛵</div>
              <div className="type-title">Kuryer orqali</div>
              <div className="type-price">+30,000 so'm</div>
              <span className="type-desc">Eshigingizgacha yetkazib beriladi</span>
            </div>

            <div
              className={`delivery-type-card ${deliveryType === 'pickup' ? 'active' : ''}`}
              onClick={() => setDeliveryType('pickup')}
            >
              <div className="type-icon">🏬</div>
              <div className="type-title">Olib ketish punkti</div>
              <div className="type-price">+5,000 so'm</div>
              <span className="type-desc">Filialdan o‘zingiz olasiz</span>
            </div>
          </div>

          {/* Umumiy Xarita Bloki */}
          <div className="form-group">
            <div className="map-header-row">
              <label>
                {deliveryType === 'courier'
                  ? 'Yetkazish manzilini xaritada belgilang *'
                  : 'Xaritadagi filiallar (markerni bosib tanlang) *'}
              </label>
              {deliveryType === 'courier' && (
                <button type="button" className="geo-locate-btn" onClick={handleGetLocation}>
                  📍 Mening joyim
                </button>
              )}
            </div>
            <div className="leaflet-map-wrapper">
              <div ref={mapContainerRef} className="native-leaflet-map" />
            </div>
          </div>

          {deliveryType === 'courier' ? (
            /* Kuryer uchun qo'shimcha aniq manzil yozish */
            <div className="form-group" style={{ marginTop: '10px' }}>
              <label>Aniq manzil (mo‘ljal, ko‘cha, uy raqami) *</label>
              <textarea
                rows="2"
                placeholder="Masalan: Al-Xorazmiy ko'chasi 15-uy"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>
          ) : (
            /* Filial uchun 5 ta filial ro'yxati */
            <div className="pickup-fields">
              <label className="field-subtitle">Mavjud filiallar ro‘yxati:</label>
              <div className="pickup-list">
                {PICKUP_POINTS.map((point) => (
                  <div
                    key={point.id}
                    className={`pickup-item ${selectedPickup.id === point.id ? 'selected' : ''}`}
                    onClick={() => handleSelectPickup(point)}
                  >
                    <input
                      type="radio"
                      name="pickup_point"
                      checked={selectedPickup.id === point.id}
                      onChange={() => handleSelectPickup(point)}
                    />
                    <div className="pickup-info">
                      <strong>{point.name}</strong>
                      <span>{point.address}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Promokod bo'limi */}
        <div className="checkout-card">
          <h4 className="card-title">Promokod</h4>
          <div className="promo-input-wrapper">
            <input
              type="text"
              placeholder="Promokodni kiriting"
              value={promoInput}
              disabled={appliedPromo !== null}
              onChange={(e) => {
                setPromoInput(e.target.value)
                setPromoError('')
              }}
            />
            {promoInput.trim() && !appliedPromo && (
              <button
                type="button"
                className="promo-btn check"
                onClick={handleCheckPromo}
                disabled={checkingPromo}
              >
                {checkingPromo ? '...' : 'Tekshirish'}
              </button>
            )}
            {appliedPromo && (
              <button
                type="button"
                className="promo-btn remove"
                onClick={() => {
                  setAppliedPromo(null)
                  setPromoInput('')
                }}
              >
                Bekor qilish
              </button>
            )}
          </div>

          {promoError && <p className="promo-msg error">{promoError}</p>}
          {appliedPromo && (
            <p className="promo-msg success">
              ✅ Promokod faollashdi: -{appliedPromo.discount.toLocaleString()} so'm chegirma!
            </p>
          )}
        </div>

        {/* To'lov usuli */}
        <div className="checkout-card">
          <h4 className="card-title">To'lov usuli</h4>
          <div className="single-payment-box">
            <span className="pay-badge">💵</span>
            <div className="pay-text">
              <strong>Qabul qilganda to'lash</strong>
              <span>Buyurtmani qabul qilib olganingizdan keyin naqd yoki karta orqali to'laysiz.</span>
            </div>
          </div>
        </div>

        {/* Hisob-kitob */}
        <div className="checkout-card summary-card">
          <h4 className="card-title">Hisob-kitob</h4>
          <div className="summary-line">
            <span>Mahsulotlar ({totalCount} dona):</span>
            <span>{itemsPrice.toLocaleString()} so'm</span>
          </div>
          <div className="summary-line">
            <span>Yetkazish ({deliveryType === 'courier' ? 'Kuryer' : 'Filial'}):</span>
            <span>+{deliveryFee.toLocaleString()} so'm</span>
          </div>

          {appliedPromo && (
            <div className="summary-line discount-line">
              <span>Promokod chegirmasi:</span>
              <span>-{discountAmount.toLocaleString()} so'm</span>
            </div>
          )}

          <div className="summary-total">
            <span>Yakuniy summa:</span>
            <span className="final-price-text">{finalPrice.toLocaleString()} so'm</span>
          </div>
        </div>

        <button type="submit" className="submit-order-btn" disabled={loading || cart.length === 0}>
          {loading ? 'Buyurtma rasmiylashtirilmoqda...' : `Buyurtmani tasdiqlash (${finalPrice.toLocaleString()} so'm)`}
        </button>
      </form>
    </div>
  )
}