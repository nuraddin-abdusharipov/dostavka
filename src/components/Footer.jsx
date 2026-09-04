import './Footer.css'
import { NavLink } from 'react-router-dom'

function Footer({ cartCount = 0 }) {
  return (
    <nav className="Footer">
      <div className="nav-item">
        <NavLink 
          to="/" 
          className={({ isActive }) => `footer-link ${isActive ? 'active' : ''}`}
        >
          <i className="fa-solid fa-house"></i>
          <span>Asosiy</span>
        </NavLink>
      </div>

      <div className="nav-item">
        <NavLink 
          to="/cart" 
          className={({ isActive }) => `footer-link ${isActive ? 'active' : ''}`}
        >
          <div className="icon-wrapper">
            <i className="fa-solid fa-cart-shopping"></i>
            {cartCount > 0 && <span className="cart-badge-count">{cartCount}</span>}
          </div>
          <span>Savat</span>
        </NavLink>
      </div>

      <div className="nav-item">
        <NavLink 
          to="/orders" 
          className={({ isActive }) => `footer-link ${isActive ? 'active' : ''}`}
        >
          <i className="fa-solid fa-bag-shopping"></i>
          <span>Xaridlar</span>
        </NavLink>
      </div>

      <div className="nav-item">
        <NavLink 
          to="/profile" 
          className={({ isActive }) => `footer-link ${isActive ? 'active' : ''}`}
        >
          <i className="fa-solid fa-user"></i>
          <span>Profil</span>
        </NavLink>
      </div>
    </nav>
  )
}

export default Footer