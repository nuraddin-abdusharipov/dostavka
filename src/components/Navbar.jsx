import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Navbar.css'

function Navbar({ initialQuery = '' }) {
  const [text, setText] = useState(initialQuery)
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    const query = text.trim()
    if (query) {
      navigate(`/search?q=${encodeURIComponent(query)}`)
    }
  }

  return (
    <header className="Navbar">
      <form className="search-box" onSubmit={handleSubmit}>
        <i className="fa-solid fa-magnifying-glass search-icon"></i>
        
        <input
          type="text"
          className="search-input"
          placeholder="Mahsulotlarni qidirish..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {text && (
          <button 
            type="button" 
            className="clear-search-btn"
            onClick={() => setText('')}
            aria-label="Tozalash"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
      </form>
    </header>
  )
}

export default Navbar