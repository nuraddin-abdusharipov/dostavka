import { useNavigate } from 'react-router-dom'
import './NotFoundPage.css'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <div className="error-code">404</div>
        <div className="error-badge">Sahifa topilmadi</div>
        <h2 className="not-found-title">Adashib qoldingizmi?</h2>
        <p className="not-found-desc">
          Siz qidirayotgan sahifa o‘chirilgan, nomi o‘zgargan yoki vaqtincha mavjud emas.
        </p>

        <div className="not-found-actions">
          <button className="home-btn" onClick={() => navigate('/')}>
            Bosh sahifaga qaytish
          </button>
          <button className="back-link-btn" onClick={() => navigate(-1)}>
            &larr; Oldingi sahifaga
          </button>
        </div>
      </div>
    </div>
  )
}