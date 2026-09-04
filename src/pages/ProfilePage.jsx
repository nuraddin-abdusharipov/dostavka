import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import './ProfilePage.css'

export default function ProfilePage({ user = null, onUpdateUser, onLogout }) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const tgId = String(user?.telegramId || user?.id || '21323832')
  const [name, setName] = useState(user?.name || 'Foydalanuvchi')
  const [phone, setPhone] = useState(user?.phone || '+998')
  const [avatar, setAvatar] = useState(
    user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + tgId
  )

  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Rasmni tanlash va base64 ga o'girish
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      alert("Rasm hajmi 2MB dan oshmasligi kerak!")
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatar(reader.result)
    }
    reader.readAsDataURL(file)
  }

  // Profil ma'lumotlarini Firestore'ga saqlash
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      alert("Ismingizni kiriting!")
      return
    }

    setSaving(true)
    try {
      const updatedData = {
        telegramId: tgId,
        name: name.trim(),
        phone: phone.trim(),
        avatar: avatar,
        updatedAt: new Date().toISOString(),
      }

      // 'users' to'plamiga saqlash
      await setDoc(doc(db, 'users', tgId), updatedData, { merge: true })

      if (onUpdateUser) {
        onUpdateUser(updatedData)
      }

      setIsEditing(false)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    } catch (err) {
      console.error("Profilni saqlashda xatolik:", err)
      alert("Ma'lumotlarni saqlashda xatolik yuz berdi.")
    } finally {
      setSaving(false)
    }
  }

  // Hisobdan chiqish
  const handleLogoutClick = () => {
    const confirmLogout = window.confirm("Rostdan ham hisobdan chiqmoqchimisiz?")
    if (confirmLogout) {
      if (onLogout) onLogout()
      navigate('/')
    }
  }

  return (
    <div className="profile-page">
      <div className="profile-header-title">
        <h2>Mening profilim</h2>
      </div>

      <div className="profile-content">
        {/* Avatar va Tepadagi Karta */}
        <div className="profile-card profile-main-card">
          <div className="avatar-wrapper">
            <img src={avatar} alt="Avatar" className="profile-avatar-img" />
            
            {isEditing && (
              <button
                type="button"
                className="avatar-edit-badge"
                onClick={() => fileInputRef.current?.click()}
              >
                📷
              </button>
            )}

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleImageChange}
            />
          </div>

          {!isEditing ? (
            <div className="profile-view-info">
              <h3 className="profile-display-name">{name}</h3>
              <span className="profile-tg-id">ID: {tgId}</span>
              <button
                type="button"
                className="edit-profile-btn"
                onClick={() => setIsEditing(true)}
              >
                ✏️ Profilni tahrirlash
              </button>
            </div>
          ) : (
            <p className="avatar-hint">Rasm ustiga bosib yangisini tanlang</p>
          )}
        </div>

        {savedSuccess && (
          <div className="profile-success-alert">
            ✅ Ma'lumotlar muvaffaqiyatli saqlandi!
          </div>
        )}

        {/* Tahrirlash formasi */}
        {isEditing && (
          <form className="profile-card profile-form" onSubmit={handleSaveProfile}>
            <h4 className="card-sub-title">Shaxsiy ma'lumotlar</h4>

            <div className="form-group">
              <label>Ismingiz *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ismingizni kiriting"
                required
              />
            </div>

            <div className="form-group">
              <label>Telefon raqamingiz</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
              />
            </div>

            <div className="profile-btn-row">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setName(user?.name || 'Foydalanuvchi')
                  setPhone(user?.phone || '+998')
                  setAvatar(user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + tgId)
                  setIsEditing(false)
                }}
              >
                Bekor qilish
              </button>

              <button type="submit" className="save-btn" disabled={saving}>
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </form>
        )}

        {/* Qo'shimcha Havolalar / Statistikalar */}
        <div className="profile-card profile-menu-card">
          <div className="menu-item" onClick={() => navigate('/orders')}>
            <span className="menu-icon">🛍️</span>
            <span className="menu-text">Buyurtmalar tarixi</span>
            <span className="menu-arrow">&rarr;</span>
          </div>

          <div className="menu-item" onClick={() => navigate('/cart')}>
            <span className="menu-icon">🛒</span>
            <span className="menu-text">Savatim</span>
            <span className="menu-arrow">&rarr;</span>
          </div>

          <div className="menu-item logout-item" onClick={handleLogoutClick}>
            <span className="menu-icon">🚪</span>
            <span className="menu-text">Chiqish (Logout)</span>
            <span className="menu-arrow">&rarr;</span>
          </div>
        </div>
      </div>
    </div>
  )
}