import React from 'react';
import '../styles/card.css';

function Card({ 
  title, 
  subtitle, 
  children, 
  footer, 
  className = '',
  loading = false,
  error = null 
}) {
  return (
    <div className={`card ${className}`}>
      {(title || subtitle) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
      )}

      <div className="card-body">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Cargando...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>⚠️ {error}</p>
          </div>
        ) : (
          children
        )}
      </div>

      {footer && (
        <div className="card-footer">
          {footer}
        </div>
      )}
    </div>
  );
}

export default Card;