import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import AdminLayout from '../components/AdminLayout';
import './DinosManagement.scss';

const API_URL = '/api/admin/dino-species.php';

const TYPE_LABELS = {
  1: 'Carnivore',
  2: 'Herbivore',
  3: 'Aquatique',
  4: 'Volant',
  5: 'Épaule',
  6: 'Boss',
};

const TYPE_ICONS = {
  1: '🦷',
  2: '🌿',
  3: '🌊',
  4: '🦅',
  5: '🫀',
  6: '💀',
};

const EMPTY_FORM = { name: '', types: [], sort_order: 0 };

const DinosManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState(0);

  useEffect(() => {
    if (user && !user.is_admin) navigate('/');
  }, [user, navigate]);

  const fetchSpecies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_URL, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur serveur');
      setSpecies(data.species || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSpecies(); }, [fetchSpecies]);

  if (!user?.is_admin) return null;

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (sp) => {
    setForm({ name: sp.name, types: [...sp.types], sort_order: sp.sort_order });
    setEditingId(sp.id);
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const toggleType = (typeId) => {
    setForm(prev => ({
      ...prev,
      types: prev.types.includes(typeId)
        ? prev.types.filter(t => t !== typeId)
        : [...prev.types, typeId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Le nom est requis'); return; }
    if (form.types.length === 0) { setFormError('Sélectionne au moins un type'); return; }

    setFormLoading(true);
    setFormError(null);

    const isEdit = editingId !== null;
    const url = isEdit ? `${API_URL}?id=${editingId}` : API_URL;

    try {
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur serveur');

      if (isEdit) {
        setSpecies(prev => prev.map(s => s.id === editingId ? data.species : s));
      } else {
        setSpecies(prev => [...prev, data.species]);
      }
      closeForm();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_URL}?id=${deleteConfirm.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur serveur');
      setSpecies(prev => prev.filter(s => s.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const displayed = species.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || s.types.includes(filterType);
    return matchSearch && matchType;
  });

  return (
    <AdminLayout>
      <div className="dinos-management">
        <div className="dinos-management__header">
          <h1 className="dinos-management__title">
            <span className="dinos-management__title-icon">🦖</span>
            Catalogue des espèces
          </h1>
          <button className="dinos-management__add-btn" onClick={openCreate}>
            + Ajouter une espèce
          </button>
        </div>

        {/* Filtres */}
        <div className="dinos-management__filters">
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="dinos-management__search"
          />
          <div className="dinos-management__type-filters">
            <button
              className={`dinos-management__type-btn ${filterType === 0 ? 'dinos-management__type-btn--active' : ''}`}
              onClick={() => setFilterType(0)}
            >
              Tous
            </button>
            {Object.entries(TYPE_LABELS).map(([id, label]) => (
              <button
                key={id}
                className={`dinos-management__type-btn ${filterType === Number(id) ? 'dinos-management__type-btn--active' : ''}`}
                onClick={() => setFilterType(Number(id))}
              >
                {TYPE_ICONS[id]} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Erreur globale */}
        {error && (
          <div className="dinos-management__error">
            {error}
            <button onClick={fetchSpecies} className="dinos-management__retry">Réessayer</button>
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <div className="dinos-management__loading">Chargement...</div>
        ) : (
          <div className="dinos-management__list">
            <div className="dinos-management__count">{displayed.length} espèce{displayed.length !== 1 ? 's' : ''}</div>
            {displayed.length === 0 ? (
              <div className="dinos-management__empty">Aucune espèce trouvée</div>
            ) : (
              displayed.map(sp => (
                <div key={sp.id} className="dinos-management__row">
                  <div className="dinos-management__row-name">{sp.name}</div>
                  <div className="dinos-management__row-types">
                    {sp.types.map(t => (
                      <span key={t} className="dinos-management__tag">
                        {TYPE_ICONS[t]} {TYPE_LABELS[t]}
                      </span>
                    ))}
                  </div>
                  <div className="dinos-management__row-actions">
                    <button className="dinos-management__edit-btn" onClick={() => openEdit(sp)}>
                      Modifier
                    </button>
                    <button className="dinos-management__delete-btn" onClick={() => setDeleteConfirm(sp)}>
                      Supprimer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Modal formulaire */}
        {showForm && (
          <div className="dinos-management__overlay" onClick={closeForm}>
            <div className="dinos-management__modal" onClick={e => e.stopPropagation()}>
              <h2 className="dinos-management__modal-title">
                {editingId ? 'Modifier' : 'Ajouter'} une espèce
              </h2>
              <form onSubmit={handleSubmit} className="dinos-management__form">
                <label className="dinos-management__label">
                  Nom
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    className="dinos-management__input"
                    placeholder="Ex : Allosaurus"
                    autoFocus
                  />
                </label>

                <div className="dinos-management__label">
                  Types
                  <div className="dinos-management__checkboxes">
                    {Object.entries(TYPE_LABELS).map(([id, label]) => {
                      const numId = Number(id);
                      return (
                        <label key={id} className={`dinos-management__checkbox ${form.types.includes(numId) ? 'dinos-management__checkbox--checked' : ''}`}>
                          <input
                            type="checkbox"
                            checked={form.types.includes(numId)}
                            onChange={() => toggleType(numId)}
                          />
                          {TYPE_ICONS[id]} {label}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <label className="dinos-management__label">
                  Ordre d'affichage
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={e => setForm(prev => ({ ...prev, sort_order: Number(e.target.value) }))}
                    className="dinos-management__input dinos-management__input--small"
                    min="0"
                  />
                </label>

                {formError && <div className="dinos-management__form-error">{formError}</div>}

                <div className="dinos-management__form-actions">
                  <button type="button" className="dinos-management__cancel-btn" onClick={closeForm}>
                    Annuler
                  </button>
                  <button type="submit" className="dinos-management__submit-btn" disabled={formLoading}>
                    {formLoading ? 'Enregistrement...' : (editingId ? 'Enregistrer' : 'Ajouter')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal confirmation suppression */}
        {deleteConfirm && (
          <div className="dinos-management__overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="dinos-management__modal dinos-management__modal--confirm" onClick={e => e.stopPropagation()}>
              <h2 className="dinos-management__modal-title">Supprimer l'espèce ?</h2>
              <p className="dinos-management__confirm-text">
                Confirmer la suppression de <strong>{deleteConfirm.name}</strong> ?
                Cette action est irréversible.
              </p>
              <div className="dinos-management__form-actions">
                <button className="dinos-management__cancel-btn" onClick={() => setDeleteConfirm(null)}>
                  Annuler
                </button>
                <button
                  className="dinos-management__delete-confirm-btn"
                  onClick={handleDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default DinosManagement;
