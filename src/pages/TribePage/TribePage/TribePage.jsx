import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DinoCardCompact from '../../../components/DinoCardCompact/DinoCardCompact';
import { TribeSkeleton } from '../../../components/Skeleton/Skeleton';
import TribeMembersModal from '../../../components/TribeMembersModal/TribeMembersModal';
import { useTribe } from '../../../hooks/useTribe';
import { useAuth } from '../../../contexts/AuthContext';
import { tribeAPI, dinoAPI } from '../../../services/api';
import '../../../styles/pages/tribe-page.scss';

const TribePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tribe, loading: tribeLoading, refreshTribe } = useTribe();
  const [featuredDinos, setFeaturedDinos] = useState([]);
  const [dinosLoading, setDinosLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Charger les dinosaures featured et les demandes en attente
  useEffect(() => {
    if (tribe) {
      loadFeaturedDinos();
      loadPendingRequests();
    }
  }, [tribe]);

  const loadFeaturedDinos = async () => {
    try {
      setDinosLoading(true);
      const data = await dinoAPI.getFeatured(tribe.id);
      setFeaturedDinos(data);
    } catch (err) {
      setError('Erreur lors du chargement des dinosaures');
    } finally {
      setDinosLoading(false);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const data = await tribeAPI.members.getRequests();
      setPendingRequests(data.requests || []);
    } catch (err) {
      setError('Erreur lors du chargement des demandes');
    }
  };

  // Gérer l'acceptation d'une demande
  const handleAcceptRequest = async (requestId) => {
    try {
      await tribeAPI.members.handleRequest(requestId, 'accept');
      // Recharger les demandes et les données de la tribu
      await loadPendingRequests();
      await refreshTribe();
    } catch (err) {
      setError('Erreur lors de l\'acceptation de la demande');
    }
  };

  // Gérer le refus d'une demande
  const handleRejectRequest = async (requestId) => {
    try {
      await tribeAPI.members.handleRequest(requestId, 'reject');
      // Recharger les demandes
      await loadPendingRequests();
    } catch (err) {
      setError('Erreur lors du refus de la demande');
    }
  };

  // Si pas de tribu, rediriger vers dashboard
  useEffect(() => {
    if (!tribeLoading && !tribe) {
      navigate('/dashboard');
    }
  }, [tribe, tribeLoading, navigate]);

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

  if (tribeLoading) {
    return (
      <div className="tribe-page">
        <TribeSkeleton />
      </div>
    );
  }

  if (!tribe) {
    return null;
  }

  const isOwner = tribe.user_role === 'owner';
  const bannerUrl = tribe.banner_url || '/assets/seasonal/printemps/printemps.png';

  const pageStyle = {
    ...tribeStyle,
    backgroundImage: `url(${bannerUrl})`,
  };

  return (
    <div className="tribe-page" style={pageStyle}>
      <div className="tribe-page__overlay" />

      {/* Logo Arki'Family centré */}
      <Link to="/" className="tribe-page__home-logo-link">
        <img
          src="/assets/seasonal/printemps/logo-paques.png"
          alt="Arki'Family"
          className="tribe-page__home-logo"
        />
      </Link>

      {/* Bouton Admin */}
      {user?.is_admin && (
        <Link to="/admin" className="tribe-page__admin-link">
          <span className="tribe-page__admin-icon">⚙️</span>
          <span className="tribe-page__admin-text">Admin</span>
        </Link>
      )}

      {/* Avatar utilisateur */}
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
            <span className="tribe-page__stat-icon">👥</span>
            {tribe.members?.length || 0} membres
          </span>
          <span className="tribe-page__stat">
            <span className="tribe-page__stat-icon">⭐</span>
            {featuredDinos.length} dinosaure{featuredDinos.length > 1 ? 's' : ''} en vitrine
          </span>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="tribe-page__actions">
        <button
          className="tribe-page__btn tribe-page__btn--primary"
          onClick={() => navigate('/dashboard')}
        >
          <span className="tribe-page__btn-icon">🦖</span>
          {isOwner ? 'Gérer les dinosaures' : 'Voir tous les dinosaures'}
        </button>

        <Link
          to="/tribe/customize"
          className="tribe-page__btn tribe-page__btn--secondary"
        >
          <span className="tribe-page__btn-icon">🎨</span>
          Personnaliser
        </Link>

        <button
          className="tribe-page__btn tribe-page__btn--accent"
          onClick={() => {
            loadPendingRequests();
            setIsModalOpen(true);
          }}
        >
          <span className="tribe-page__btn-icon">👥</span>
          Gérer la tribu
          {pendingRequests.length > 0 && ` (${pendingRequests.length})`}
        </button>
      </div>

      {/* Section dinosaures mis en vitrine */}
      <div className="tribe-page__section">
        <h2 className="tribe-page__section-title">
          <span className="tribe-page__section-icon">⭐</span>
          Dinosaures mis en vitrine
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
            <p>Cliquez sur l'étoile ⭐ d'un dinosaure pour le mettre en vitrine</p>
            <button
              className="tribe-page__btn tribe-page__btn--primary"
              onClick={() => navigate('/dashboard')}
            >
              Gérer les dinosaures
            </button>
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
        <Link to="/dashboard" className="tribe-page__back-link">
          ← Retour au Dashboard
        </Link>
      </div>

      {/* Modal de gestion des membres */}
      <TribeMembersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tribe={tribe}
        requests={pendingRequests}
        onAccept={handleAcceptRequest}
        onReject={handleRejectRequest}
        onKickMember={async (memberId) => {
          try {
            await tribeAPI.members.remove(memberId);
            await refreshTribe();
            await loadPendingRequests();
          } catch (err) {
            console.error('Erreur expulsion membre:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Erreur lors de l\'expulsion du membre';
            alert('Erreur : ' + errorMsg);
            setError(errorMsg);
          }
        }}
        onRenameTribe={async (updates) => {
          try {
            await tribeAPI.update({ id: tribe.id, ...updates });
            await refreshTribe();
          } catch (err) {
            console.error('Erreur mise à jour tribu:', err);
            setError('Erreur lors de la mise à jour de la tribu');
          }
        }}
        onLeaveTribe={async () => {
          try {
            // Trouver l'ID du membre actuel en utilisant current_user_id
            const currentMember = tribe.members.find(m => m.user_id === tribe.current_user_id);
            if (currentMember) {
              await tribeAPI.members.remove(currentMember.id);
              // Rediriger vers le dashboard après avoir quitté
              navigate('/dashboard');
            } else {
              console.error('Membre actuel non trouvé', { members: tribe.members, current_user_id: tribe.current_user_id });
              const errorMsg = 'Impossible de trouver votre profil dans la tribu';
              alert('Erreur : ' + errorMsg);
              setError(errorMsg);
            }
          } catch (err) {
            console.error('Erreur en quittant la tribu:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Erreur lors de la sortie de la tribu';
            alert('Erreur : ' + errorMsg);
            setError(errorMsg);
          }
        }}
        onDeleteTribe={async () => {
          try {
            await tribeAPI.delete(tribe.id);
            // Rediriger vers le dashboard après suppression
            navigate('/dashboard');
          } catch (err) {
            console.error('Erreur suppression tribu:', err);
            setError('Erreur lors de la suppression de la tribu');
          }
        }}
        onTransferOwnership={async (newOwnerId) => {
          try {
            await tribeAPI.transferOwnership(newOwnerId);
            // Recharger les données de la tribu pour voir le changement
            await refreshTribe();
            await loadPendingRequests();
          } catch (err) {
            console.error('Erreur transfert propriété:', err);
            setError('Erreur lors du transfert de propriété');
          }
        }}
      />
    </div>
  );
};

export default TribePage;
