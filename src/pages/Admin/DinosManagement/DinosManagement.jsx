import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import AdminLayout from '../components/AdminLayout';
import './DinosManagement.scss';

const TYPES = [
  { id: 1, label: 'Carnivore' },
  { id: 2, label: 'Herbivore' },
  { id: 3, label: 'Aquatique' },
  { id: 4, label: 'Volant' },
  { id: 5, label: 'Épaule' },
  { id: 6, label: 'Boss' },
];

const STATS = [
  { key: 'health',   label: 'Vie' },
  { key: 'stamina',  label: 'Endurance' },
  { key: 'oxygen',   label: 'Oxygène' },
  { key: 'food',     label: 'Nourriture' },
  { key: 'weight',   label: 'Poids' },
  { key: 'damage',   label: 'Dégâts' },
  { key: 'crafting', label: 'Craft' },
];

const EMPTY_FORM = { name: '', types: [], stats: [] };

const DinosManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);

  useEffect(() => {
    if (user && !user.is_admin) navigate('/');
  }, [user, navigate]);

  const fetchSpecies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/admin/dino-species.php');
      setSpecies(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpecies();
  }, [fetchSpecies]);

  if (!user?.is_admin) return null;

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (sp) => {
    setEditingId(sp.id);
    setForm({
      name:  sp.name,
      types: sp.types.map(Number),
      stats: sp.stats ?? [],
    });
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const toggleType = (id) => {
    setForm(f => ({
      ...f,
      types: f.types.includes(id) ? f.types.filter(t => t !== id) : [...f.types, id],
    }));
  };

  const toggleStat = (key) => {
    setForm(f => ({
      ...f,
      stats: f.stats.includes(key) ? f.stats.filter(s => s !== key) : [...f.stats, key],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('Le nom est requis');
      return;
    }
    if (form.types.length === 0) {
      setFormError('Sélectionne au moins un type');
      return;
    }
    if (form.stats.length === 0) {
      setFormError('Sélectionne au moins une stat');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);
      const payload = { name: form.name.trim(), types: form.types, stats: form.stats };
      if (editingId) {
        await api.put(`/admin/dino-species.php?id=${editingId}`, payload);
      } else {
        await api.post('/admin/dino-species.php', payload);
      }
      closeForm();
      fetchSpecies();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      setDeleting(true);
      await api.delete(`/admin/dino-species.php?id=${confirmDelete.id}`);
      setConfirmDelete(null);
      fetchSpecies();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  const handleSeed = async () => {
    try {
      setSeeding(true);
      setSeedResult(null);
      const res = await api.get('/admin/seed-dino-catalog.php');
      setSeedResult(res.data.message);
      fetchSpecies();
    } catch (err) {
      setSeedResult(err.response?.data?.message || 'Erreur lors du seed');
    } finally {
      setSeeding(false);
    }
  };

  const filtered = species.filter(sp =>
    sp.name.toLowerCase().includes(search.toLowerCase())
  );

  const typeLabel = (id) => TYPES.find(t => t.id === id)?.label ?? id;
  const statLabel = (key) => STATS.find(s => s.key === key)?.label ?? key;

  return (
    <AdminLayout>
      <div className="dinos-management">
        <div className="dinos-management__header">
          <h1 className="dinos-management__title">
            Catalogue des espèces
          </h1>
          <div className="dinos-management__header-actions">
            <input
              className="dinos-management__search"
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button
              className="dinos-management__seed-btn"
              onClick={handleSeed}
              disabled={seeding}
              title="Importer toutes les espèces ARK dans la base de données"
            >
              {seeding ? 'Import...' : 'Importer espèces ARK'}
            </button>
            <button className="dinos-management__add-btn" onClick={openAdd}>
              + Ajouter
            </button>
          </div>
        </div>

        {seedResult && (
          <div className="dinos-management__seed-result">{seedResult}</div>
        )}

        {error && (
          <div className="dinos-management__error">{error}</div>
        )}

        {loading ? (
          <div className="dinos-management__loading">
            <div className="dinos-management__spinner" />
            <p>Chargement...</p>
          </div>
        ) : (
          <div className="dinos-management__table-wrapper">
            <table className="dinos-management__table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Types</th>
                  <th>Stats</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="dinos-management__empty-row">
                      {search ? 'Aucun résultat' : 'Aucune espèce enregistrée'}
                    </td>
                  </tr>
                ) : (
                  filtered.map(sp => (
                    <tr key={sp.id}>
                      <td className="dinos-management__name">{sp.name}</td>
                      <td>
                        <div className="dinos-management__tags">
                          {(sp.types ?? []).map(t => (
                            <span key={t} className="dinos-management__tag dinos-management__tag--type">
                              {typeLabel(t)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="dinos-management__tags">
                          {(sp.stats ?? []).map(s => (
                            <span key={s} className="dinos-management__tag dinos-management__tag--stat">
                              {statLabel(s)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="dinos-management__actions-cell">
                        <button
                          className="dinos-management__edit-btn"
                          onClick={() => openEdit(sp)}
                        >
                          Modifier
                        </button>
                        <button
                          className="dinos-management__delete-btn"
                          onClick={() => setConfirmDelete(sp)}
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Form modal */}
        {showForm && (
          <div className="dinos-management__overlay" onClick={() => !saving && closeForm()}>
            <div className="dinos-management__modal" onClick={e => e.stopPropagation()}>
              <div className="dinos-management__modal-header">
                <h2>{editingId ? 'Modifier l\'espèce' : 'Ajouter une espèce'}</h2>
                <button className="dinos-management__modal-close" onClick={closeForm} disabled={saving}>✕</button>
              </div>

              <div className="dinos-management__modal-body">
                <div className="dinos-management__field">
                  <label>Nom de l'espèce</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Rex, Argentavis..."
                    disabled={saving}
                  />
                </div>

                <div className="dinos-management__field">
                  <label>Types</label>
                  <div className="dinos-management__checkboxes">
                    {TYPES.map(t => (
                      <label key={t.id} className="dinos-management__checkbox-label">
                        <input
                          type="checkbox"
                          checked={form.types.includes(t.id)}
                          onChange={() => toggleType(t.id)}
                          disabled={saving}
                        />
                        {t.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="dinos-management__field">
                  <label>Stats applicables</label>
                  <div className="dinos-management__checkboxes">
                    {STATS.map(s => (
                      <label key={s.key} className="dinos-management__checkbox-label">
                        <input
                          type="checkbox"
                          checked={form.stats.includes(s.key)}
                          onChange={() => toggleStat(s.key)}
                          disabled={saving}
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                </div>

                {formError && (
                  <div className="dinos-management__form-error">{formError}</div>
                )}
              </div>

              <div className="dinos-management__modal-actions">
                <button
                  className="dinos-management__modal-btn dinos-management__modal-btn--cancel"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Annuler
                </button>
                <button
                  className="dinos-management__modal-btn dinos-management__modal-btn--save"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Sauvegarde...' : editingId ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {confirmDelete && (
          <div className="dinos-management__overlay" onClick={() => !deleting && setConfirmDelete(null)}>
            <div className="dinos-management__modal dinos-management__modal--small" onClick={e => e.stopPropagation()}>
              <div className="dinos-management__modal-header">
                <h2>Supprimer l'espèce</h2>
                <button className="dinos-management__modal-close" onClick={() => setConfirmDelete(null)} disabled={deleting}>✕</button>
              </div>
              <div className="dinos-management__modal-body">
                <p>Supprimer <strong>{confirmDelete.name}</strong> ? Cette action est irréversible.</p>
              </div>
              <div className="dinos-management__modal-actions">
                <button
                  className="dinos-management__modal-btn dinos-management__modal-btn--cancel"
                  onClick={() => setConfirmDelete(null)}
                  disabled={deleting}
                >
                  Annuler
                </button>
                <button
                  className="dinos-management__modal-btn dinos-management__modal-btn--delete"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Suppression...' : 'Supprimer'}
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
