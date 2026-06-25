import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../../components/Header';
import DinoForm from '../../components/DinoForm';
import DinoList from '../../components/DinoList';
import TribeSelector from '../../components/TribeSelector';
import Footer from '../../components/Footer/Footer';
import { useDinosaurs } from '../../hooks/useDinosaurs';
import { useTribe } from '../../hooks/useTribe';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import '../../styles/pages/dashboard.scss';

function Dashboard() {
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'all';
  const { dinos, loading, error, addDinosaur, updateDinosaur, deleteDinosaur, toggleFeatured, refreshDinosaurs } = useDinosaurs();
  const { tribe, loading: tribeLoading, refreshTribe } = useTribe();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);

  const handleTribeSelected = () => {
    refreshTribe();
    refreshDinosaurs();
  };

  // Si chargement de la tribu en cours
  if (tribeLoading) {
    return (
      <div className="dashboard">
        <Header />
        <main className="dashboard__main">
          <div className="container">
            <div className="dashboard__loading">
              <div className="dashboard__loading-spinner"></div>
              <p>Chargement...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Si l'utilisateur n'a pas de tribu, afficher le sélecteur
  if (!tribe) {
    return (
      <div className="dashboard">
        <Header />
        <TribeSelector onTribeSelected={handleTribeSelected} />
      </div>
    );
  }

  const handleAddDino = async (dinoData) => {
    try {
      await addDinosaur(dinoData);
      setShowForm(false);
    } catch (error) {
      alert('Erreur lors de l\'ajout du dinosaure: ' + error.message);
    }
  };

  const handleUpdateDino = async (dinoId, updatedData) => {
    try {
      await updateDinosaur(dinoId, updatedData);
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      alert('Erreur lors de la mise à jour du dinosaure: ' + error.message);
    }
  };

  const handleDeleteDino = async (dinoId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce dinosaure ?')) {
      try {
        await deleteDinosaur(dinoId);
      } catch (error) {
        alert('Erreur lors de la suppression du dinosaure: ' + error.message);
      }
    }
  };

  const handleToggleFeatured = async (dinoId, currentStatus) => {
    try {
      const nextStatus = !currentStatus;
      await toggleFeatured(dinoId, nextStatus);
      showToast(
        nextStatus ? 'Dinosaure mis en vitrine' : 'Dinosaure retiré de la vitrine',
        'success'
      );
    } catch (error) {
      alert('Erreur lors de la mise à jour: ' + error.message);
    }
  };

  // Affichage du chargement
  if (loading) {
    return (
      <div className="dashboard">
        <Header />
        <main className="dashboard__main">
          <div className="container">
            <div className="dashboard__loading">
              <div className="dashboard__loading-spinner"></div>
              <p>Chargement des dinosaures...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Affichage de l'erreur
  if (error) {
    return (
      <div className="dashboard">
        <Header />
        <main className="dashboard__main">
          <div className="container">
            <div className="dashboard__error">
              <h2>Erreur de connexion à la base de données</h2>
              <p>{error}</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Header />

      {/* Lien vers la page de tribu */}
      {tribe && (
        <div className="dashboard__tribe-link">
          <Link
            to="/tribe"
            className="dashboard__tribe-btn"
            style={{
              '--tribe-primary': tribe.primary_color || '#00f0ff',
              '--tribe-secondary': tribe.secondary_color || '#b842ff'
            }}
          >
            {tribe.logo_url ? (
              <img
                src={tribe.logo_url}
                alt={tribe.name}
                className="dashboard__tribe-logo"
              />
            ) : (
              <span className="dashboard__tribe-icon">🏛️</span>
            )}
            <span className="dashboard__tribe-name">{tribe.name}</span>
          </Link>
        </div>
      )}

      <main className="dashboard__main">
        <div className="container">
          {/* Bouton toggle formulaire */}
          <div className="dashboard__actions">
            <button
              className={`dashboard__toggle-btn ${showForm ? 'dashboard__toggle-btn--active' : ''}`}
              onClick={() => setShowForm(!showForm)}
            >
              <span className="dashboard__toggle-icon">{showForm ? '✕' : '➕'}</span>
              <span>{showForm ? 'Fermer le formulaire' : 'Ajouter un dinosaure'}</span>
            </button>
          </div>

          {/* Formulaire */}
          {showForm && (
            <div className="dashboard__form-container">
              <DinoForm onAddDino={handleAddDino} existingDinos={dinos} />
            </div>
          )}

          {/* Liste des dinosaures */}
          <div className="dashboard__list-container">
            <DinoList
              dinos={dinos}
              onUpdateDino={handleUpdateDino}
              onDeleteDino={handleDeleteDino}
              onToggleFeatured={handleToggleFeatured}
              initialFilter={initialFilter}
              members={tribe?.members || []}
              currentUserId={user?.id}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Dashboard;
