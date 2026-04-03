import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import DinoCardCompact from '../../../components/DinoCardCompact/DinoCardCompact';
import { TribeSkeleton } from '../../../components/Skeleton/Skeleton';
import { useAuth } from '../../../contexts/AuthContext';
import { tribeAPI, dinoAPI } from '../../../services/api';
import '../../../styles/pages/tribe-page.scss';

const PublicTribePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tribe, setTribe] = useState(null);
  const [featuredDinos, setFeaturedDinos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dinosLoading, setDinosLoading] = useState(true);
  const [error, setError] = useState('');

  // Charger les informations de la tribu
  useEffect(() => {
    loadTribe();
  }, [id]);

  // Charger les dinosaures featured
  useEffect(() => {
    if (tribe) {
      loadFeaturedDinos();
    }
  }, [tribe]);

  const loadTribe = async () => {
    try {
      setLoading(true);
      setError('');

      // Récupérer toutes les tribus et trouver celle qui correspond à l'ID
      const data = await tribeAPI.getAll();
      const foundTribe = data.tribes?.find(t => t.id === parseInt(id));

      if (!foundTribe) {
        setError('Tribu introuvable');
        return;
      }

      setTribe(foundTribe);
    } catch (err) {
      console.error('Erreur chargement tribu:', err);
      setError('Erreur lors du chargement de la tribu');
    } finally {
      setLoading(false);
    }
  };

  const loadFeaturedDinos = async () => {
    try {
      setDinosLoading(true);
      const data = await dinoAPI.getFeatured(tribe.id);
      setFeaturedDinos(data);
    } catch (err) {
      console.error('Erreur chargement dinos featured:', err);
      setError('Erreur lors du chargement des dinosaures');
    } finally {
      setDinosLoading(false);
    }
  };

  // Fonction pour convertir hex en RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
  };

  // Appliquer les couleurs et les polices de la tribu via CSS custom properties
  const tribeStyle = tribe ? {
    '--tribe-primary': tribe.primary_color || '#00f0ff',
    '--tribe-secondary': tribe.secondary_color || '#b842ff',
    '--tribe-primary-rgb': hexToRgb(tribe.primary_color || '#00f0ff'),
    '--tribe-secondary-rgb': hexToRgb(tribe.secondary_color || '#b842ff'),
    '--tribe-body-font': tribe.font_family || '"Orbitron", sans-serif',
    '--tribe-title-font': tribe.title_font_family || '"Orbitron", sans-serif',
  } : {};

  if (loading) {
    return (
      <div className="tribe-page">
        <TribeSkeleton />
      </div>
    );
  }

  if (error && !tribe) {
    return (
      <div className="tribe-page">
        <div className="tribe-page__error-container">
          <h2>⚠️ {error}</h2>
          <Link to="/" className="tribe-page__btn tribe-page__btn--primary">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  if (!tribe) {
    return null;
  }

  const bannerUrl = tribe.banner_url || '/assets/seasonal/printemps/banner-paques.png';

  const pageStyle = {
    ...tribeStyle,
    backgroundImage: `url(${bannerUrl})`,
  };

  return (
    <div className="tribe-page tribe-page--public" style={pageStyle}>
      <div className="tribe-page__overlay" />

      {/* Logo Arki'Family centré */}
      <Link to="/" className="tribe-page__home-logo-link">
        <img
          src="/assets/seasonal/printemps/logo-paques.png"
          alt="Arki'Family"
          className="tribe-page__home-logo"
        />
      </Link>

      {/* Avatar utilisateur (si connecté) */}
      {user && (
        <Link to="/profile" className="tribe-page__user-avatar">
          {user.photo_profil ? (
            <img
              src={user.photo_profil}
              alt={user.username}
              className="tribe-page__user-avatar-img"
            />
          ) : (
            <div className="tribe-page__user-avatar-placeholder">
              {user.username?.charAt(0).toUpperCase() || '👤'}
            </div>
          )}
        </Link>
      )}

      {/* Header avec titre */}
      <div className="tribe-page__header">
        <div className="tribe-page__header-content">
          <h1 className="tribe-page__title">{tribe.name}</h1>
        </div>
      </div>

      {/* Logo */}
      <div className="tribe-page__logo-container">
        {tribe.logo_url ? (
          <img
            src={tribe.logo_url}
            alt={`Logo ${tribe.name}`}
            className="tribe-page__logo"
          />
        ) : (
          <div className="tribe-page__logo tribe-page__logo--placeholder">
            🏛️
          </div>
        )}
      </div>

      {/* Informations de la tribu */}
      <div className="tribe-page__info">
        {tribe.description && (
          <p className="tribe-page__description">{tribe.description}</p>
        )}
        <div className="tribe-page__stats">
          <span className="tribe-page__stat">
            <span className="tribe-page__stat-icon">⭐</span>
            {featuredDinos.length} dinosaure{featuredDinos.length > 1 ? 's' : ''} en vitrine
          </span>
        </div>
      </div>

      {/* Section dinosaures featured */}
      <div className="tribe-page__section">
        <h2 className="tribe-page__section-title">
          <span className="tribe-page__section-icon">⭐</span>
          Dinosaures en vitrine
        </h2>

        {error && (
          <div className="tribe-page__error">
            <span>⚠️</span> {error}
          </div>
        )}

        {dinosLoading ? (
          <div className="tribe-page__loading">
            <div className="tribe-page__spinner"></div>
            <p>Chargement des dinosaures...</p>
          </div>
        ) : featuredDinos.length === 0 ? (
          <div className="tribe-page__empty">
            <span className="tribe-page__empty-icon">🦕</span>
            <h3>Aucun dinosaure en vitrine</h3>
            <p>Cette tribu n'a pas encore mis de dinosaures en avant</p>
          </div>
        ) : (
          <div className="tribe-page__dinos-grid">
            {featuredDinos.map((dino) => (
              <DinoCardCompact
                key={dino.id}
                dino={dino}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bouton retour */}
      <div className="tribe-page__footer">
        <Link to="/" className="tribe-page__back-link">
          ← Retour à l'accueil
        </Link>
      </div>
    </div>
  );
};

export default PublicTribePage;
