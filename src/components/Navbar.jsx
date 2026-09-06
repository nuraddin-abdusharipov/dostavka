import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './Navbar.css'

function Navbar({ initialQuery = '', unreadCount = 2 }) {
  const [text, setText] = useState(initialQuery)
  const [isListening, setIsListening] = useState(false)
  const navigate = useNavigate()
  const inputRef = useRef(null)

  // Qidiruvni yuborish
  const handleSubmit = (e) => {
    e.preventDefault()
    const query = text.trim()
    if (query) {
      navigate(`/search?q=${encodeURIComponent(query)}`)
    }
  }

  // Ovozli qidiruv (Web Speech API)
  const handleVoiceSearch = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('Brauzeringiz ovozli qidiruvni qo‘llab-quvvatlamaydi.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'uz-UZ' // O'zbek tili
    recognition.interimResults = false

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setText(transcript)
      setIsListening(false)
      navigate(`/search?q=${encodeURIComponent(transcript)}`)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  return (
    <header className="Navbar">
      <div className="navbar-container">
        {/* Qidiruv bloki */}
        <form className="search-box" onSubmit={handleSubmit}>
          <i className="fa-solid fa-magnifying-glass search-icon"></i>

          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder={isListening ? "Tinglanmoqda..." : "Mahsulotlar bo‘ylab qidirish..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div className="search-actions">
            {/* O'chirish tugmasi */}
            {text && (
              <button
                type="button"
                className="action-icon-btn clear-btn"
                onClick={() => {
                  setText('')
                  inputRef.current?.focus()
                }}
                aria-label="Tozalash"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}

            {/* Ovozli qidiruv tugmasi */}
            <button
              type="button"
              className={`action-icon-btn voice-btn ${isListening ? 'listening' : ''}`}
              onClick={handleVoiceSearch}
              title="Ovoz orqali qidirish"
              aria-label="Ovozli qidiruv"
            >
              <i className="fa-solid fa-microphone"></i>
            </button>
          </div>
        </form>

        {/* Qo'shimcha Amallar: Sevimlilar va Bildirishnomalar */}
        <div className="navbar-extra-actions">
          {/* Sevimlilar / Istaklar */}
          <button
            type="button"
            className="nav-circle-btn"
            onClick={() => navigate('/favorites')}
            title="Sevimlilar"
            aria-label="Sevimlilar"
          >
            <i className="fa-regular fa-heart"></i>
          </button>

          {/* Bildirishnomalar */}
          <button
            type="button"
            className="nav-circle-btn notif-btn"
            onClick={() => navigate('/notifications')}
            title="Bildirishnomalar"
            aria-label="Bildirishnomalar"
          >
            <i className="fa-regular fa-bell"></i>
            {unreadCount > 0 && <span className="notif-dot"></span>}
          </button>
        </div>
      </div>
    </header>
  )
}

export default Navbar