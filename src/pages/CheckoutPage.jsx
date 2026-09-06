import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection,
  doc,
  getDocs,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  writeBatch,
  increment,
} from 'firebase/firestore'
import { db } from '../firebase'
import './CheckoutPage.css'

// Firestore'da branches bo'sh bo'lsa zaxira filiallar
const DEFAULT_BRANCHES = [
  { id: '1', name: 'Urganch Markaziy filiali', address: 'Al-Xorazmiy ko‘chasi, 24-uy', coords: [41.5565, 60.6312] },
  { id: '2', name: 'Xiva Ichan Qal\'a filiali', address: 'Pahlavon Mahmud ko‘chasi, 10-uy', coords: [41.3783, 60.3639] },
  { id: '3', name: 'Urganch Darital filiali', address: 'Xonqa ko‘chasi, 12-A uy', coords: [41.5421, 60.6210] },
  { id: '4', name: 'Xonqa filiali', address: 'Mustaqillik ko‘chasi, 5-uy', coords: [41.4682, 60.7715] },
  { id: '5', name: 'Shovot filiali', address: 'Turkiston ko‘chasi, 45-uy', coords: [41.6588, 60.3012] },
]

export default function CheckoutPage({ cart = [], onClearCart, user = null }) {
  const navigate = useNavigate()

  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || user?.telegramId || '+998')

  // Filiallar (Firestore'dan olinadi)
  const [branches, setBranches] = useState(DEFAULT_BRANCHES)
  const [selectedPickup, setSelectedPickup] = useState(DEFAULT_BRANCHES[2]) // Standart: Urganch Darital

  // Yetkazib berish turi
  const [deliveryType, setDeliveryType] = useState('courier')
  const [courierCoords, setCourierCoords] = useState([41.5565, 60.6312])
  const [address, setAddress] = useState("Xaritada belgilangan manzil (41.5565, 60.6312)")

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

  // 1. Filiallarni Firestore'dan yuklash
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const snap = await getDocs(collection(db, 'branches'))
        if (!snap.empty) {
          const list = snap.docs.map((d) => {
            const data = d.data()
            return {
              id: d.id,
              name: data.name || data.title || 'Filial',
              address: data.address || '',
              coords: Array.isArray(data.coords)
                ? data.coords
                : [data.lat || data.location?.lat, data.lng || data.location?.lng],
            }
          }).filter((b) => b.coords && b.coords[0] && b.coords[1])

          if (list.length > 0) {
            setBranches(list)
            setSelectedPickup(list[0])
          }
        }
      } catch (err) {
        console.error('Filiallarni yuklashda xatolik:', err)
      }
    }

    fetchBranches()
  }, [])

  // Hisob-kitoblar
  const itemsPrice = cart.reduce(
    (acc, item) => acc + Number(item.price || 0) * item.quantity,
    0
  )
  const totalCount = cart.reduce((acc, item) => acc + item.quantity, 0)
  const deliveryFee = deliveryType === 'courier' ? 30000 : 5000
  const discountAmount = appliedPromo ? Number(appliedPromo.discount || 0) : 0
  const finalPrice = Math.max(0, itemsPrice + deliveryFee - discountAmount)

  // Leaflet xaritasini boshqarish
  useEffect(() => {
    const L = window.L
    if (!L || !mapContainerRef.current) return

    if (!mapInstanceRef.current) {
      const initialCenter =
        deliveryType === 'courier' ? courierCoords : selectedPickup?.coords || [41.5421, 60.6210]

      const map = L.map(mapContainerRef.current).setView(
        initialCenter,
        deliveryType === 'courier' ? 14 : 12
      )

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map)

      mapInstanceRef.current = map

      map.on('click', (e) => {
        if (deliveryType === 'courier') {
          const lat = Number(e.latlng.lat.toFixed(5))
          const lng = Number(e.latlng.lng.toFixed(5))
          setCourierCoords([lat, lng])
          setAddress(`Xaritada belgilangan manzil (${lat}, ${lng})`)
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
      map.setView(courierCoords, 14)
      const marker = L.marker(courierCoords).addTo(map)
      courierMarkerRef.current = marker
    } else {
      if (selectedPickup?.coords) {
        map.setView(selectedPickup.coords, 12)
      }

      // Xaritada barcha filiallarni joylashtirish
      branches.forEach((point) => {
        if (!point.coords) return
        const isSelected = selectedPickup?.id === point.id
        const marker = L.marker(point.coords).addTo(map)
        marker.bindPopup(`<b>${point.name}</b><br/>${point.address}`)

        if (isSelected) {
          marker.openPopup()
        }

        // Faqat xaritadan tanlanadi
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
  }, [deliveryType, branches])

  // GPS Mening joyim
  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(5))
          const lng = Number(pos.coords.longitude.toFixed(5))
          const newCoords = [lat, lng]
          setCourierCoords(newCoords)
          setAddress(`Mening geolokatsiyam (${lat}, ${lng})`)
          if (mapInstanceRef.current && courierMarkerRef.current) {
            mapInstanceRef.current.setView(newCoords, 15)
            courierMarkerRef.current.setLatLng(newCoords)
          }
        },
        () => alert('Joylashuvingizni aniqlab bo‘lmadi. Xaritadan nuqtani bosing.')
      )
    }
  }

  // Promokodni tekshirish
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

  // Buyurtmani jo'natish va STOKNI KAMAYTIRISH
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

    if (deliveryType === 'pickup' && !selectedPickup) {
      alert('Iltimos, xaritadagi markerlardan birini bosib filialni tanlang!')
      return
    }

    const finalCourierAddress =
      address.trim() || `Xaritadagi manzil (${courierCoords[0]}, ${courierCoords[1]})`

    setLoading(true)

    try {
      const batch = writeBatch(db)
      const tgId = String(user?.telegramId || user?.id || '8919800652')

      // Buyurtma raqamini generatsiya qilish (telegramId-000X)
      const ordersQ = query(collection(db, 'orders'), where('telegramId', '==', tgId))
      const userOrdersSnap = await getDocs(ordersQ)
      const nextIndex = userOrdersSnap.size + 1
      const formattedIndex = String(nextIndex).padStart(4, '0')
      const customOrderId = `${tgId}-${formattedIndex}`

      const orderRef = doc(db, 'orders', customOrderId)

      const orderData = {
        orderId: customOrderId,
        telegramId: tgId,
        userId: user?.id || tgId,
        customer: {
          name: name.trim(),
          phone: phone.trim(),
          deliveryType,
          address: deliveryType === 'courier' ? finalCourierAddress : selectedPickup.address,
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
        status: 'kutilmoqda',
        createdAt: serverTimestamp(),
      }

      // 1. Buyurtmani yozish
      batch.set(orderRef, orderData)

      // 2. Har bir sotib olingan tovarning STOCK miqdoridan ayirib tashlash
      cart.forEach((item) => {
        if (item.id) {
          const productRef = doc(db, 'products', item.id)
          batch.update(productRef, {
            stock: increment(-Number(item.quantity || 1)),
          })
        }
      })

      // 3. Promokod ishlatilgan bo'lsa uni o'chirish
      if (appliedPromo?.id) {
        const promoRef = doc(db, 'promocodes', appliedPromo.id)
        batch.delete(promoRef)
      }

      // Atomik saqlash (buyurtma va ombor bir vaqtda yangilanadi)
      await batch.commit()

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
          <div className="success-icon">
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <h2>Buyurtmangiz qabul qilindi!</h2>
          <div className="order-id-badge">ID: {successOrder.id}</div>
          <p>Tez orada operatorimiz siz bilan bog'lanadi.</p>
          <div className="order-summary-mini">
            <span>To‘lov summasi:</span>
            <strong>{successOrder.total.toLocaleString()} so'm</strong>
          </div>
          <button className="done-btn" onClick={() => navigate('/orders')}>
            Buyurtmalarimni ko‘rish
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="checkout-page">
      <div className="detail-header">
        <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
          <i className="fa-solid fa-arrow-left"></i>
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
              <div className="type-icon">
                <i className="fa-solid fa-truck-fast"></i>
              </div>
              <div className="type-title">Kuryer orqali</div>
              <div className="type-price">+30,000 so'm</div>
              <span className="type-desc">Eshigingizgacha yetkaziladi</span>
            </div>

            <div
              className={`delivery-type-card ${deliveryType === 'pickup' ? 'active' : ''}`}
              onClick={() => setDeliveryType('pickup')}
            >
              <div className="type-icon">
                <i className="fa-solid fa-shop"></i>
              </div>
              <div className="type-title">Olib ketish punkti</div>
              <div className="type-price">+5,000 so'm</div>
              <span className="type-desc">Filialdan o‘zingiz olasiz</span>
            </div>
          </div>

          {/* Xarita qismi */}
          <div className="form-group">
            <div className="map-header-row">
              <label>
                {deliveryType === 'courier'
                  ? 'Yetkazish manzilini xaritada belgilang *'
                  : 'Xaritadan kerakli filial ustiga bosing *'}
              </label>
              {deliveryType === 'courier' && (
                <button type="button" className="geo-locate-btn" onClick={handleGetLocation}>
                  <i className="fa-solid fa-location-crosshairs"></i> Mening joyim
                </button>
              )}
            </div>
            <div className="leaflet-map-wrapper">
              <div ref={mapContainerRef} className="native-leaflet-map" />
            </div>
          </div>

          {/* Faqat xaritadan tanlangan filial ko'rinishi */}
          {deliveryType === 'pickup' && selectedPickup && (
            <div className="selected-branch-card">
              <div className="selected-branch-icon">
                <i className="fa-solid fa-store"></i>
              </div>
              <div className="selected-branch-details">
                <span className="selected-branch-label">Tanlangan filial:</span>
                <strong className="selected-branch-name">{selectedPickup.name}</strong>
                <p className="selected-branch-address">{selectedPickup.address}</p>
              </div>
            </div>
          )}

          {deliveryType === 'courier' && (
            <div className="form-group" style={{ marginTop: '10px' }}>
              <label>Aniq manzil (mo‘ljal, ko‘cha, xonadon)</label>
              <textarea
                rows="2"
                placeholder="Masalan: Al-Xorazmiy ko'chasi 15-uy"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Promokod */}
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
              <i className="fa-solid fa-check"></i> Promokod qo‘llandi: -{appliedPromo.discount.toLocaleString()} so'm!
            </p>
          )}
        </div>

        {/* To'lov usuli */}
        <div className="checkout-card">
          <h4 className="card-title">To'lov usuli</h4>
          <div className="single-payment-box">
            <span className="pay-badge">
              <i className="fa-solid fa-money-bill-wave"></i>
            </span>
            <div className="pay-text">
              <strong>Qabul qilganda to'lash</strong>
              <span>Buyurtmani topshirib olganingizdan keyin naqd yoki karta orqali to'laysiz.</span>
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