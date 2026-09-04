import { useState } from 'react'
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import './LoginPage.css'

export default function LoginPage({ onLoginSuccess }) {
  const [session, setSession] = useState(null)
  const [enteredCode, setEnteredCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // 1. Yangi sessiya yaratish
  const handleCreateSession = async () => {
    setLoading(true)
    setError('')
    try {
      // Random sessiya kodi (ZP-123456)
      const sessionId = 'ZP-' + Math.floor(100000 + Math.random() * 900000)
      // Bot tekshiruvdan so'ng foydalanuvchiga beradigan 6 xonali kod
      const authCode = Math.floor(100000 + Math.random() * 900000).toString()

      // 5 daqiqalik amal qilish muddati (TTL)
      const expiresAt = Date.now() + 5 * 60 * 1000

      const sessionData = {
        sessionId,
        authCode,
        status: 'pending',
        expiresAt,
        createdAt: Date.now(),
        user: null,
      }

      // Firestore'ga yozish
      await setDoc(doc(db, 'sessions', sessionId), sessionData)
      setSession(sessionData)
    } catch (err) {
      console.error(err)
      setError('Sessiya yaratishda xatolik yuz berdi. Qayta urinib ko‘ring.')
    } finally {
      setLoading(false)
    }
  }

  // Sessiya kodidan nusxa olish
  const copyToClipboard = () => {
    if (!session) return
    navigator.clipboard.writeText(session.sessionId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 2. Foydalanuvchi botdan olgan 6 xonali kodni tekshirish
  const handleVerifyCode = async (e) => {
    e.preventDefault()
    if (!enteredCode || enteredCode.length !== 6) {
      setError('6 xonali kodni to‘liq kiriting')
      return
    }

    setLoading(true)
    setError('')

    try {
      const docRef = doc(db, 'sessions', session.sessionId)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        setError('Bunday sessiya mavjud emas yoki allaqachon yopilgan.')
        return
      }

      const sessionDb = docSnap.data()

      // Vaqt tekshiruvi (TTL)
      if (Date.now() > sessionDb.expiresAt) {
        setError('Sessiya amal qilish muddati tugagan. Yangi sessiya yarating.')
        return
      }

      // 6 xonali kod tekshiruvi
      if (sessionDb.authCode !== enteredCode.trim()) {
        setError('Kiritilgan tasdiqlash kodi noto‘g‘ri!')
        return
      }

      // Sessiyani tasdiqlangan holatga o'tkazish
      await updateDoc(docRef, {
        status: 'completed',
      })

      // Foydalanuvchi ma'lumotini saqlash (botdan kelgan user yoki vaqtinchalik session user)
      const userData = sessionDb.user || {
        sessionId: sessionDb.sessionId,
        phone: sessionDb.phone || 'Tasdiqlangan',
      }

      localStorage.setItem('zipo_user', JSON.stringify(userData))
      onLoginSuccess(userData)
    } catch (err) {
      console.error(err)
      setError('Tekshirishda xatolik yuz berdi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-header">
        <h1 className="brand-logo">Zipo</h1>
        <p className="brand-subtitle">Telegram orqali xavfsiz kirish</p>
      </div>

      <div className="login-card">
        {error && <div className="error-alert">{error}</div>}

        {!session ? (
          /* Boshlang'ich holat: Sessiya yaratish */
          <div className="start-box">
            <p className="info-text">
              Ilovaga kirish uchun maxsus sessiya yarating va uni Telegram botimizga yuboring.
            </p>
            <button
              className="primary-btn"
              onClick={handleCreateSession}
              disabled={loading}
            >
              {loading ? 'Yaratilmoqda...' : 'Sessiya yaratish'}
            </button>
          </div>
        ) : (
          /* Sessiya yaratilgandan keyingi bosqich */
          <div className="verify-box">
            <label className="input-label">Sizning sessiya kodingiz:</label>
            <div className="session-code-row">
              <span className="code-badge">{session.sessionId}</span>
              <button
                type="button"
                className="copy-btn"
                onClick={copyToClipboard}
              >
                {copied ? 'Nusxalandi!' : 'Nusxa olish'}
              </button>
            </div>

            <div className="instructions">
              <p>1. Koddan nusxa oling va botga yuboring:</p>
              <a
                href="https://t.me/ZipoAuthBot"
                target="_blank"
                rel="noreferrer"
                className="bot-link"
              >
                @ZipoAuthBot ga o'tish &rarr;
              </a>
              <p>2. Botga raqamingizni yuborib, olingan 6 xonali kodni kiriting:</p>
            </div>

            <form onSubmit={handleVerifyCode} className="code-form">
              <input
                type="text"
                maxLength="6"
                placeholder="6 xonali kod"
                value={enteredCode}
                onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, ''))}
                className="code-input"
              />
              <button
                type="submit"
                className="primary-btn"
                disabled={loading}
              >
                {loading ? 'Tekshirilmoqda...' : 'Tasdiqlash va Kirish'}
              </button>
            </form>

            <button
              type="button"
              className="text-btn"
              onClick={() => {
                setSession(null)
                setError('')
              }}
            >
              Yangi sessiya ochish
            </button>
          </div>
        )}
      </div>
    </div>
  )
}