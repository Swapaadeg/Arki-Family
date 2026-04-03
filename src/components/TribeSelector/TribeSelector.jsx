import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tribeAPI } from '../../services/api';
import './TribeSelector.scss';

const TribeSelector = ({ onTribeSelected }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('choice'); // 'choice', 'create', 'join'
  const [tribes, setTribes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedTribe, setSelectedTribe] = useState(null);
  const [joinMessage, setJoinMessage] = useState('');

  // Formulaire création
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    is_public: true,
  });

  // Charger les tribus disponibles pour le mode "rejoindre"
  useEffect(() => {
    if (mode === 'join') {
      loadTribes();
    }
  }, [mode]);

  const loadTribes = async () => {
    try {
      setLoading(true);
      const data = await tribeAPI.getAll();
      setTribes(data.tribes || []);
    } catch (err) {
      setError('Erreur lors du chargement des tribus');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await tribeAPI.create(createForm);
      setSuccess('Tribu créée avec succès ! 🎉');

      // Attendre un peu puis notifier le parent
      setTimeout(() => {
        onTribeSelected();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création de la tribu');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTribe = (tribe) => {
    setSelectedTribe(tribe);
    setJoinMessage('');
    setError('');
  };

  const handleCancelJoin = () => {
    setSelectedTribe(null);
    setJoinMessage('');
    setError('');
  };

  const handleJoinRequest = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await tribeAPI.members.requestJoin(selectedTribe.id, joinMessage);
      setSuccess('Demande envoyée ! Le chef de tribu va l\'examiner. 🦖');

      // Redirection vers la page d'accueil après 2 secondes
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'envoi de la demande');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'choice') {
    return (
      <div className="tribe-selector">
        <div className="tribe-selector__container">
          <div className="tribe-selector__logo-container">
            <img
              src="/assets/seasonal/printemps/logo-paques.png"
              alt="Arki'Family Logo"
              className="tribe-selector__logo"
            />
          </div>

          <p className="tribe-selector__subtitle">
            Pour gérer tes dinosaures, tu dois d'abord rejoindre ou créer une tribu.
          </p>

          {error && (
            <div className="tribe-selector__error">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="tribe-selector__actions">
            <button
              onClick={() => setMode('create')}
              className="tribe-selector__btn tribe-selector__btn--primary"
            >
              <span className="tribe-selector__btn-icon">⚔️</span>
              Créer ma tribu
            </button>

            <button
              onClick={() => setMode('join')}
              className="tribe-selector__btn tribe-selector__btn--secondary"
            >
              <span className="tribe-selector__btn-icon">🤝</span>
              Rejoindre une tribu
            </button>
          </div>

          <div className="tribe-selector__info">
            <h3>Pourquoi les tribus ?</h3>
            <ul>
              <li>Partage tes dinosaures avec tes amis</li>
              <li>Compare vos stats et mutations</li>
              <li>Organisez des events et classements</li>
              <li>Communauté privée ou publique</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="tribe-selector">
        <div className="tribe-selector__container">
          <h1 className="tribe-selector__title">Créer ta tribu</h1>
          <p className="tribe-selector__subtitle">
            Deviens le chef d'une nouvelle tribu et invite tes amis !
          </p>

          {error && (
            <div className="tribe-selector__error">
              <span>⚠️</span> {error}
            </div>
          )}

          {success && (
            <div className="tribe-selector__success">
              <span>✅</span> {success}
            </div>
          )}

          <form className="tribe-selector__form" onSubmit={handleCreateSubmit}>
            <div className="tribe-selector__field">
              <label className="tribe-selector__label">Nom de la tribu *</label>
              <input
                type="text"
                className="tribe-selector__input"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Arki'tribe"
                required
                minLength={3}
                maxLength={100}
                disabled={loading}
              />
            </div>

            <div className="tribe-selector__field">
              <label className="tribe-selector__label">Description</label>
              <textarea
                className="tribe-selector__textarea"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Décris ta tribu, son esprit, ses objectifs..."
                rows={4}
                disabled={loading}
              />
            </div>

            <div className="tribe-selector__actions">
              <button
                type="button"
                onClick={() => setMode('choice')}
                className="tribe-selector__btn tribe-selector__btn--secondary"
                disabled={loading}
              >
                ← Retour
              </button>
              <button
                type="submit"
                className="tribe-selector__btn tribe-selector__btn--primary"
                disabled={loading}
              >
                {loading ? 'Création...' : 'Créer la tribu'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (mode === 'join') {
    // Si une tribu est sélectionnée, afficher le formulaire de demande
    if (selectedTribe) {
      return (
        <div className="tribe-selector">
          <div className="tribe-selector__container">
            <h1 className="tribe-selector__title">Demande à rejoindre {selectedTribe.name}</h1>
            <p className="tribe-selector__subtitle">
              Indique ton pseudo en jeu pour que le chef de tribu puisse t'identifier.
            </p>

            {error && (
              <div className="tribe-selector__error">
                <span>⚠️</span> {error}
              </div>
            )}

            {success && (
              <div className="tribe-selector__success">
                <span>✅</span> {success}
              </div>
            )}

            <form className="tribe-selector__form" onSubmit={handleJoinRequest}>
              <div className="tribe-selector__field">
                <label className="tribe-selector__label">Pseudo en jeu (ARK) *</label>
                <input
                  type="text"
                  className="tribe-selector__input"
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                  placeholder="Ex: TonPseudoARK"
                  required
                  disabled={loading || success}
                  maxLength={200}
                />
                <small style={{ color: '#888', marginTop: '0.5rem', display: 'block' }}>
                  Le chef de tribu verra ce message pour valider ton identité
                </small>
              </div>

              <div className="tribe-selector__actions">
                <button
                  type="button"
                  onClick={handleCancelJoin}
                  className="tribe-selector__btn tribe-selector__btn--secondary"
                  disabled={loading || success}
                >
                  ← Retour
                </button>
                <button
                  type="submit"
                  className="tribe-selector__btn tribe-selector__btn--primary"
                  disabled={loading || success}
                >
                  {loading ? 'Envoi...' : 'Envoyer la demande'}
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    // Sinon, afficher la liste des tribus
    return (
      <div className="tribe-selector">
        <div className="tribe-selector__container">
          <h1 className="tribe-selector__title">Rejoindre une tribu</h1>
          <p className="tribe-selector__subtitle">
            Choisis une tribu et envoie une demande pour la rejoindre.
          </p>

          {error && (
            <div className="tribe-selector__error">
              <span>⚠️</span> {error}
            </div>
          )}

          {loading && tribes.length === 0 ? (
            <div className="tribe-selector__loading">
              <div className="tribe-selector__spinner"></div>
              <p>Chargement des tribus...</p>
            </div>
          ) : tribes.length === 0 ? (
            <div className="tribe-selector__empty">
              <p>Aucune tribu publique disponible pour le moment.</p>
              <p>Crée la tienne pour commencer l'aventure !</p>
            </div>
          ) : (
            <div className="tribe-selector__list">
              {tribes.map((tribe) => (
                <div key={tribe.id} className="tribe-card">
                  <div className="tribe-card__top">
                    <div className="tribe-card__avatar">
                      {tribe.logo_url ? (
                        <img src={tribe.logo_url} alt={tribe.name} />
                      ) : (
                        <span>{tribe.name?.charAt(0)?.toUpperCase() || '🏛️'}</span>
                      )}
                    </div>
                    <div className="tribe-card__title">
                      <h3 className="tribe-card__name">{tribe.name}</h3>
                      <div className="tribe-card__meta">
                        <span className="tribe-card__pill tribe-card__pill--muted">
                          👥 {tribe.member_count} membre{tribe.member_count > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {tribe.description && (
                    <p className="tribe-card__description">{tribe.description}</p>
                  )}

                  <div className="tribe-card__footer">
                    <div className="tribe-card__owner">
                      <span className="tribe-card__owner-label">Chef</span>
                      <span className="tribe-card__owner-name">{tribe.owner_username}</span>
                    </div>
                    <button
                      onClick={() => handleSelectTribe(tribe)}
                      className="tribe-card__btn"
                    >
                      Demander à rejoindre
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="tribe-selector__actions" style={{ marginTop: '2rem' }}>
            <button
              onClick={() => setMode('choice')}
              className="tribe-selector__btn tribe-selector__btn--secondary"
            >
              ← Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default TribeSelector;
