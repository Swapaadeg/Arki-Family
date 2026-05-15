import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import dinoTypes from '../../data/types';
import { baseStats, specialStats } from '../../data/stats';
import ImageCropModal from '../ImageCropModal/ImageCropModal';
import '../../styles/components/dino-form.scss';

const ALL_STATS = [
  ...baseStats,
  ...specialStats,
];

const DinoForm = ({ onAddDino, existingDinos = [] }) => {
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [formData, setFormData] = useState({
    species: '',
    typeIds: [],
    isMutated: false,
    photo: null,
    stats: { health: '', stamina: '', oxygen: '', food: '', weight: '', damage: '', crafting: '' },
    mutatedStats: { health: '', stamina: '', oxygen: '', food: '', weight: '', damage: '', crafting: '' },
  });

  const [photoPreview, setPhotoPreview] = useState(null);
  const [speciesSearch, setSpeciesSearch] = useState('');
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);

  useEffect(() => {
    api.get('/dino-catalog.php')
      .then(res => setCatalog(res.data))
      .catch(() => setCatalog([]))
      .finally(() => setCatalogLoading(false));
  }, []);

  const selectedSpecies = catalog.find(d => d.name === formData.species);
  const activeStats = selectedSpecies?.stats ?? [];

  const availableSpecies = catalog.filter(
    dino => !existingDinos.some(existing => existing.species === dino.name)
  );

  const filteredSpecies = availableSpecies.filter(dino =>
    dino.name.toLowerCase().includes(speciesSearch.toLowerCase())
  );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSpeciesChange = (e) => {
    const name = e.target.value;
    const species = catalog.find(d => d.name === name);
    setFormData(prev => ({
      ...prev,
      species: name,
      typeIds: species ? species.types.map(Number) : [],
    }));
  };

  const handleTypeChange = (typeId) => {
    setFormData(prev => ({
      ...prev,
      typeIds: prev.typeIds.includes(typeId)
        ? prev.typeIds.filter(id => id !== typeId)
        : [...prev.typeIds, typeId],
    }));
  };

  const handleStatChange = (statId, value, isMutated = false) => {
    const field = isMutated ? 'mutatedStats' : 'stats';
    setFormData(prev => ({ ...prev, [field]: { ...prev[field], [statId]: value } }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setImageToCrop(reader.result); setShowCropModal(true); };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = ({ blob, url }) => {
    setFormData(prev => ({ ...prev, photo: new File([blob], 'cropped-photo.jpg', { type: 'image/jpeg' }) }));
    setPhotoPreview(url);
    setShowCropModal(false);
    setImageToCrop(null);
  };

  const handleCropCancel = () => { setShowCropModal(false); setImageToCrop(null); };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.species) { alert('Veuillez sélectionner une espèce'); return; }

    const missingStats = activeStats.filter(
      stat => !formData.stats[stat] || formData.stats[stat] === ''
    );
    if (missingStats.length > 0) {
      const labels = missingStats.map(s => ALL_STATS.find(x => x.id === s)?.name ?? s);
      alert(`Veuillez remplir toutes les stats (${labels.join(', ')})`);
      return;
    }

    if (formData.isMutated) {
      const missingMutated = activeStats.filter(
        stat => !formData.mutatedStats[stat] || formData.mutatedStats[stat] === ''
      );
      if (missingMutated.length > 0) {
        const labels = missingMutated.map(s => ALL_STATS.find(x => x.id === s)?.name ?? s);
        alert(`Veuillez remplir toutes les stats mutées (${labels.join(', ')})`);
        return;
      }
    }

    onAddDino(formData);

    setFormData({
      species: '',
      typeIds: [],
      isMutated: false,
      photo: null,
      stats: { health: '', stamina: '', oxygen: '', food: '', weight: '', damage: '', crafting: '' },
      mutatedStats: { health: '', stamina: '', oxygen: '', food: '', weight: '', damage: '', crafting: '' },
    });
    setPhotoPreview(null);
    setSpeciesSearch('');
  };

  const renderStatInput = (statId, isMutated = false) => {
    if (!activeStats.includes(statId)) return null;
    const stat = ALL_STATS.find(s => s.id === statId);
    if (!stat) return null;

    const value = isMutated ? formData.mutatedStats[statId] : formData.stats[statId];

    return (
      <div key={`${statId}-${isMutated}`} className="dino-form__stat">
        <label className="dino-form__label">
          <span className="dino-form__stat-icon">{stat.icon}</span>
          <span>{stat.name}</span>
        </label>
        <input
          type="number"
          className="dino-form__input"
          value={value}
          onChange={(e) => handleStatChange(statId, e.target.value, isMutated)}
          placeholder={`${stat.name}${isMutated ? ' (muté)' : ''}`}
          min="0"
        />
      </div>
    );
  };

  return (
    <form className="dino-form" onSubmit={handleSubmit}>
      <div className="dino-form__section">
        <h2 className="dino-form__title">Ajouter un dinosaure</h2>

        {/* Sélection de l'espèce */}
        <div className="dino-form__field">
          <label className="dino-form__label">
            Espèce
            {!catalogLoading && availableSpecies.length < catalog.length && (
              <span className="dino-form__count">
                ({availableSpecies.length} disponibles sur {catalog.length})
              </span>
            )}
          </label>
          {catalogLoading ? (
            <div className="dino-form__loading">Chargement des espèces...</div>
          ) : availableSpecies.length === 0 ? (
            <div className="dino-form__no-species">✨ Toutes les espèces ont été ajoutées!</div>
          ) : (
            <>
              <input
                type="text"
                className="dino-form__search"
                placeholder="🔍 Rechercher une espèce..."
                value={speciesSearch}
                onChange={(e) => setSpeciesSearch(e.target.value)}
              />
              <select
                name="species"
                className="dino-form__select"
                value={formData.species}
                onChange={handleSpeciesChange}
                required
              >
                <option value="">Sélectionner une espèce</option>
                {filteredSpecies.map(dino => (
                  <option key={dino.name} value={dino.name}>{dino.name}</option>
                ))}
              </select>
              {filteredSpecies.length === 0 && speciesSearch && (
                <div className="dino-form__no-results">
                  Aucune espèce trouvée pour "{speciesSearch}"
                </div>
              )}
            </>
          )}
        </div>

        {/* Sélection des types */}
        <div className="dino-form__field">
          <label className="dino-form__label">Types</label>
          <div className="dino-form__types">
            {dinoTypes.map(type => (
              <button
                key={type.id}
                type="button"
                className={`dino-form__type-btn ${formData.typeIds.includes(type.id) ? 'dino-form__type-btn--active' : ''}`}
                onClick={() => handleTypeChange(type.id)}
                style={{ '--type-color': type.color }}
              >
                <span className="dino-form__type-icon">{type.icon}</span>
                <span>{type.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Upload photo */}
        <div className="dino-form__field">
          <label className="dino-form__label">Photo</label>
          <div className="dino-form__photo-upload">
            <input type="file" id="photo" className="dino-form__file-input" accept="image/*" onChange={handlePhotoChange} />
            <label htmlFor="photo" className="dino-form__file-label">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="dino-form__photo-preview" />
              ) : (
                <div className="dino-form__photo-placeholder">
                  <span>📸</span>
                  <span>Ajouter une photo</span>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Mutation */}
        <div className="dino-form__field">
          <label className="dino-form__checkbox-label">
            <input type="checkbox" name="isMutated" className="dino-form__checkbox" checked={formData.isMutated} onChange={handleChange} />
            <span className="dino-form__checkbox-text">Dinosaure muté</span>
          </label>
        </div>
      </div>

      {/* Stats de base */}
      {activeStats.length > 0 && (
        <div className="dino-form__section">
          <h3 className="dino-form__subtitle">Stats de base</h3>
          <div className="dino-form__stats-grid">
            {['health', 'stamina', 'oxygen', 'food', 'weight', 'damage', 'crafting'].map(s => renderStatInput(s, false))}
          </div>
        </div>
      )}

      {/* Stats mutées */}
      {formData.isMutated && activeStats.length > 0 && (
        <div className="dino-form__section dino-form__section--mutated">
          <h3 className="dino-form__subtitle">Stats mutées</h3>
          <div className="dino-form__stats-grid">
            {['health', 'stamina', 'oxygen', 'food', 'weight', 'damage', 'crafting'].map(s => renderStatInput(s, true))}
          </div>
        </div>
      )}

      <button type="submit" className="dino-form__submit">
        <span>✨</span>
        <span>Ajouter le dinosaure</span>
      </button>

      {showCropModal && imageToCrop && (
        <ImageCropModal image={imageToCrop} onCropComplete={handleCropComplete} onCancel={handleCropCancel} />
      )}
    </form>
  );
};

export default DinoForm;
