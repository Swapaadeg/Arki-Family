import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTribe } from '../../hooks/useTribe';
import Footer from '../../components/Footer/Footer';
import BurgerMenu from '../../components/BurgerMenu/BurgerMenu';
import '../../styles/pages/home.scss';

const Home = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const { tribe, allTribes, selectedTribeId, selectTribe } = useTribe();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [dropdownOpen]);

  const handleLogout = async () => {
    await logout();
  };

  const activeTribe = allTribes.find(t => t.id === selectedTribeId) || tribe;

  return (
    <div className="home">
      {/* Banner en arrière-plan */}
      <div className="home__banner">
        <img
          src="/assets/seasonal/printemps/banner-paques.png"
          alt="Arki'Family - Printemps"
          className="home__banner-image"
        />
        <div className="home__banner-overlay"></div>
      </div>

      {/* Actions en haut à droite */}
      {isAuthenticated && user && (
        <div className="home__top-actions">
          {user?.is_admin && (
            <Link to="/admin" className="home__admin-link">
              <span className="home__admin-icon">⚙️</span>
              <span className="home__admin-text">Admin</span>
            </Link>
          )}
          <Link to="/profile" className="home__user-avatar">
            {user.photo_profil ? (
              <img
                src={user.photo_profil}
                alt={user.username}
                className="home__user-avatar-img"
              />
            ) : (
              <div className="home__user-avatar-placeholder">
                {user.username?.charAt(0).toUpperCase() || '👤'}
              </div>
            )}
          </Link>
        </div>
      )}

      {/* Contenu principal */}
      <div className="home__content">
        {/* Logo cliquable */}
        <Link to="/" className="home__logo-link">
          <img
            src="/assets/seasonal/printemps/logo-paques.png"
            alt="Arki'Family Logo"
            className="home__logo"
          />
        </Link>

        {/* Menu burger sous le logo */}
        <div className="home__burger-menu">
          <BurgerMenu />
        </div>

        {/* Titre principal */}
        <h1 className="home__title">
          Bienvenue chez <span className="home__title-highlight">Arki'Family</span>
        </h1>

        {/* Sous-titre */}
        <p className="home__subtitle">
          {isAuthenticated
            ? `Content de te revoir, ${user?.username || 'explorateur'} ! 🦖`
            : 'Rejoins une tribu, élève tes dinosaures, partage tes aventures'
          }
        </p>

        {/* Boutons d'action conditionnels */}
        <div className="home__actions">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="home__btn home__btn--primary">
                <span className="home__btn-icon">🦖</span>
                Mes dinosaures
              </Link>
              {allTribes.length > 1 ? (
                <div className="home__tribe-dropdown" ref={dropdownRef}>
                  <button
                    className="home__btn home__btn--accent"
                    onClick={() => setDropdownOpen(o => !o)}
                  >
                    {activeTribe?.logo_url ? (
                      <img src={activeTribe.logo_url} alt={activeTribe.name} className="home__btn-tribe-logo" />
                    ) : (
                      <span className="home__btn-icon">🏛️</span>
                    )}
                    <span>{activeTribe?.name || 'Ma tribu'}</span>
                    <span className={`home__tribe-dropdown__arrow${dropdownOpen ? ' home__tribe-dropdown__arrow--open' : ''}`}>
                      ▾
                    </span>
                  </button>
                  {dropdownOpen && (
                    <div className="home__tribe-dropdown__menu">
                      {allTribes.map(t => (
                        <button
                          key={t.id}
                          className={`home__tribe-dropdown__item${t.id === selectedTribeId ? ' home__tribe-dropdown__item--active' : ''}`}
                          onClick={() => {
                            selectTribe(t.id);
                            setDropdownOpen(false);
                            navigate('/dashboard');
                          }}
                        >
                          {t.logo_url ? (
                            <img src={t.logo_url} alt={t.name} className="home__tribe-dropdown__logo" />
                          ) : (
                            <span className="home__tribe-dropdown__icon">🏛️</span>
                          )}
                          <span className="home__tribe-dropdown__name">{t.name}</span>
                          {t.role === 'owner' && <span className="home__tribe-dropdown__badge">owner</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/dashboard" className="home__btn home__btn--accent">
                  {tribe && tribe.id ? (
                    <>
                      {tribe.logo_url ? (
                        <img
                          src={tribe.logo_url}
                          alt={tribe.name}
                          className="home__btn-tribe-logo"
                        />
                      ) : (
                        <span className="home__btn-icon">🏛️</span>
                      )}
                      <span>{tribe.name}</span>
                    </>
                  ) : (
                    <>
                      <span className="home__btn-icon">🏛️</span>
                      <span>Créer ou rejoindre une tribu</span>
                    </>
                  )}
                </Link>
              )}
              <button onClick={handleLogout} className="home__btn home__btn--secondary">
                <span className="home__btn-icon">🚪</span>
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link to="/register" className="home__btn home__btn--primary">
                <span className="home__btn-icon">🦖</span>
                Créer un compte
              </Link>
              <Link to="/login" className="home__btn home__btn--secondary">
                <span className="home__btn-icon">🔐</span>
                Se connecter
              </Link>
            </>
          )}
        </div>

        {/* Caractéristiques */}
        <div className="home__features">
          <Link to="/tribes" className="home__feature home__feature--clickable">
            <div className="home__feature-icon">🏕️</div>
            <h3 className="home__feature-title">Tribus</h3>
            <p className="home__feature-desc">
              Découvre toutes les tribus et leurs dinosaures en vitrine
            </p>
          </Link>

          <Link to="/dashboard" className="home__feature home__feature--clickable">
            <div className="home__feature-icon">📊</div>
            <h3 className="home__feature-title">Statistiques</h3>
            <p className="home__feature-desc">
              Suis l'évolution de tes dinosaures et compare-les avec ta tribu
            </p>
          </Link>

          <Link to="/dashboard?filter=mutated" className="home__feature home__feature--clickable">
            <div className="home__feature-icon">✨</div>
            <h3 className="home__feature-title">Mutations</h3>
            <p className="home__feature-desc">
              Découvre les dinosaures mutés de ta tribu
            </p>
          </Link>

          <Link to="/events" className="home__feature home__feature--clickable">
            <div className="home__feature-icon">🎉</div>
            <h3 className="home__feature-title">Evénements</h3>
            <p className="home__feature-desc">
              Remémore-toi les événements du serveur
            </p>
          </Link>
        </div>

      </div>

      <Footer />
    </div>
  );
};

export default Home;
