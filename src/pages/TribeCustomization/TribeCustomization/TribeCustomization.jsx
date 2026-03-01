import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/Header/Header';
import { useTribe } from '../../../hooks/useTribe';
import { tribeAPI } from '../../../services/api';
import ImageCropModal from '../../../components/ImageCropModal/ImageCropModal';
import { getImageUrl } from '../../../config/api';
import '../../../styles/pages/tribe-customization.scss';

const THEME_PALETTES = [
  { name: 'Cyber Default', primary: '#00f0ff', secondary: '#b842ff' },
  { name: 'Sunset Blaze', primary: '#ff2a6d', secondary: '#ff6b35' },
  { name: 'Toxic Glow', primary: '#39ff14', secondary: '#00d4ff' },
  { name: 'Royal Neon', primary: '#b842ff', secondary: '#ff2a6d' },
  { name: 'Fire & Ice', primary: '#ff6b35', secondary: '#00f0ff' },
  { name: 'Deep Ocean', primary: '#00d4ff', secondary: '#0a0a0f' },
  { name: 'Jurassic Amber', primary: '#ffaa00', secondary: '#ff6600' },
  { name: 'Arctic Storm', primary: '#00ffff', secondary: '#ffffff' },
  { name: 'Volcanic Rage', primary: '#ff0000', secondary: '#ff6600' },
  { name: 'Mystic Purple', primary: '#9d00ff', secondary: '#ff00ff' },
  { name: 'Emerald Forest', primary: '#00ff88', secondary: '#00cc66' },
  { name: 'Blood Moon', primary: '#ff1744', secondary: '#880000' },
  { name: 'Golden Dynasty', primary: '#ffd700', secondary: '#ffaa00' },
  { name: 'Electric Blue', primary: '#0099ff', secondary: '#00ffff' },
  { name: 'Neon Jungle', primary: '#00ff00', secondary: '#ffff00' },
  { name: 'Galaxy Dream', primary: '#8b00ff', secondary: '#00d4ff' },
];

// Polices pour les titres (plus marquées, imposantes)
const TITLE_FONTS = [
  { name: 'Orbitron Bold', value: '"Orbitron", sans-serif', weight: '900' },
  { name: 'Russo One', value: '"Russo One", sans-serif', weight: 'normal' },
  { name: 'Audiowide', value: '"Audiowide", cursive', weight: 'normal' },
  { name: 'Black Ops One', value: '"Black Ops One", cursive', weight: 'normal' },
  { name: 'Bungee', value: '"Bungee", cursive', weight: 'normal' },
  { name: 'Monoton', value: '"Monoton", cursive', weight: 'normal' },
  { name: 'Teko Bold', value: '"Teko", sans-serif', weight: '700' },
  { name: 'Bebas Neue', value: '"Bebas Neue", cursive', weight: 'normal' },
];

// Polices pour le texte (lisibles, modernes)
const BODY_FONTS = [
  { name: 'Orbitron', value: '"Orbitron", sans-serif', weight: '400' },
  { name: 'Rajdhani', value: '"Rajdhani", sans-serif', weight: '400' },
  { name: 'Electrolize', value: '"Electrolize", sans-serif', weight: 'normal' },
  { name: 'Chakra Petch', value: '"Chakra Petch", sans-serif', weight: '400' },
  { name: 'Exo 2', value: '"Exo 2", sans-serif', weight: '400' },
  { name: 'Saira', value: '"Saira", sans-serif', weight: '400' },
  { name: 'Titillium Web', value: '"Titillium Web", sans-serif', weight: '400' },
  { name: 'Aldrich', value: '"Aldrich", sans-serif', weight: 'normal' },
];

const TribeCustomization = () => {
  const navigate = useNavigate();
  const { tribe, updateTribe, loading: tribeLoading } = useTribe();
  const [primaryColor, setPrimaryColor] = useState('#00f0ff');
  const [secondaryColor, setSecondaryColor] = useState('#b842ff');
  const [selectedTheme, setSelectedTheme] = useState('custom');
  const [selectedBodyFont, setSelectedBodyFont] = useState('"Orbitron", sans-serif');
  const [selectedTitleFont, setSelectedTitleFont] = useState('"Orbitron", sans-serif');
  const [bannerFile, setBannerFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [cropType, setCropType] = useState(null); // 'banner' ou 'logo'
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (tribe) {
      setPrimaryColor(tribe.primary_color || '#00f0ff');
      setSecondaryColor(tribe.secondary_color || '#b842ff');
      setSelectedBodyFont(tribe.font_family || '"Orbitron", sans-serif');
      setSelectedTitleFont(tribe.title_font_family || '"Orbitron", sans-serif');

      // Détecter si les couleurs correspondent à une palette
      const matchingPalette = THEME_PALETTES.find(
        p => p.primary === tribe.primary_color && p.secondary === tribe.secondary_color
      );
      setSelectedTheme(matchingPalette ? matchingPalette.name : 'custom');
    }
  }, [tribe]);

  // Rediriger si pas de tribu
  useEffect(() => {
    if (!tribeLoading && !tribe) {
      navigate('/tribe');
    }
  }, [tribe, tribeLoading, navigate]);

  const handleThemeSelect = (theme) => {
    setSelectedTheme(theme.name);
    setPrimaryColor(theme.primary);
    setSecondaryColor(theme.secondary);
  };

  const handleImageSelect = (type, event) => {
    const file = event.target.files[0];
    if (file) {
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        setError('Veuillez sélectionner une image valide');
        return;
      }

      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('L\'image ne doit pas dépasser 5MB');
        return;
      }

      // Pour la bannière: upload direct sans recadrage
      if (type === 'banner') {
        setBannerFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setBannerPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        // Pour le logo: ouvrir le modal de recadrage (garder l'ancien preview jusqu'à validation)
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageToCrop(reader.result);
          setCropType(type);
          setShowCropModal(true);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleCropComplete = ({ blob, url }) => {
    // Convertir le blob en fichier
    const croppedFile = new File([blob], `${cropType}.jpg`, { type: 'image/jpeg' });

    if (cropType === 'banner') {
      setBannerFile(croppedFile);
      setBannerPreview(url);
    } else {
      setLogoFile(croppedFile);
      setLogoPreview(url);
    }

    setShowCropModal(false);
    setImageToCrop(null);
    setCropType(null);
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setImageToCrop(null);
    setCropType(null);
  };

  const handleSave = async () => {
    try {
      setUploading(true);
      setError('');
      setSuccess('');

      const updates = {
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        font_family: selectedBodyFont,
        title_font_family: selectedTitleFont,
      };

      // Upload bannière si sélectionnée
      if (bannerFile) {
        const bannerResponse = await tribeAPI.uploadImage('banner', bannerFile);
        updates.banner_url = bannerResponse.url;
      }

      // Upload logo si sélectionné
      if (logoFile) {
        const logoResponse = await tribeAPI.uploadImage('logo', logoFile);
        updates.logo_url = logoResponse.url;
      }

      // Sauvegarder les modifications
      await updateTribe(updates);

      setSuccess('Personnalisation sauvegardée avec succès! 🎉');
      setBannerFile(null);
      setLogoFile(null);
      setBannerPreview(null);
      setLogoPreview(null);

      // Rediriger après 2 secondes
      setTimeout(() => {
        navigate('/tribe');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setUploading(false);
    }
  };

  if (tribeLoading || !tribe) {
    return (
      <div className="tribe-customization">
        <Header />
        <div className="tribe-customization__loading">
          <div className="tribe-customization__spinner"></div>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  const previewStyle = {
    '--tribe-primary': primaryColor,
    '--tribe-secondary': secondaryColor,
    '--tribe-body-font': selectedBodyFont,
    '--tribe-title-font': selectedTitleFont,
  };

  return (
    <div className="tribe-customization">
      <Header />

      <div className="tribe-customization__container">
        <h1 className="tribe-customization__title">
          <span className="tribe-customization__icon">🎨</span>
          Personnaliser {tribe.name}
        </h1>

        {success && (
          <div className="tribe-customization__success">
            <span>✅</span> {success}
          </div>
        )}

        {error && (
          <div className="tribe-customization__error">
            <span>⚠️</span> {error}
          </div>
        )}

        <div className="tribe-customization__grid">
          {/* Settings */}
          <div className="tribe-customization__settings">
            {/* Palette de thèmes */}
            <section className="tribe-customization__section">
              <h2 className="tribe-customization__section-title">Thème de couleurs</h2>
              <div className="theme-palette">
                {THEME_PALETTES.map((theme) => (
                  <button
                    key={theme.name}
                    className={`theme-palette__card ${
                      selectedTheme === theme.name ? 'theme-palette__card--active' : ''
                    }`}
                    onClick={() => handleThemeSelect(theme)}
                  >
                    <div
                      className="theme-palette__preview"
                      style={{
                        background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`
                      }}
                    />
                    <span className="theme-palette__name">{theme.name}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Couleurs personnalisées */}
            <section className="tribe-customization__section">
              <h2 className="tribe-customization__section-title">Couleurs personnalisées</h2>
              <div className="color-pickers">
                <div className="color-picker">
                  <label className="color-picker__label">Couleur primaire</label>
                  <div className="color-picker__input-group">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => {
                        setPrimaryColor(e.target.value);
                        setSelectedTheme('custom');
                      }}
                      className="color-picker__input"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => {
                        setPrimaryColor(e.target.value);
                        setSelectedTheme('custom');
                      }}
                      className="color-picker__text"
                      maxLength={7}
                    />
                  </div>
                </div>

                <div className="color-picker">
                  <label className="color-picker__label">Couleur secondaire</label>
                  <div className="color-picker__input-group">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => {
                        setSecondaryColor(e.target.value);
                        setSelectedTheme('custom');
                      }}
                      className="color-picker__input"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => {
                        setSecondaryColor(e.target.value);
                        setSelectedTheme('custom');
                      }}
                      className="color-picker__text"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Sélection de police pour les titres */}
            <section className="tribe-customization__section">
              <h2 className="tribe-customization__section-title">
                Police des titres
                <span className="tribe-customization__section-subtitle">
                  Pour les titres et en-têtes
                </span>
              </h2>
              <div className="font-selector">
                {TITLE_FONTS.map((font) => (
                  <button
                    key={font.name}
                    className={`font-selector__card ${
                      selectedTitleFont === font.value ? 'font-selector__card--active' : ''
                    }`}
                    onClick={() => setSelectedTitleFont(font.value)}
                  >
                    <span
                      className="font-selector__preview"
                      style={{
                        fontFamily: font.value,
                        fontWeight: font.weight
                      }}
                    >
                      Aa
                    </span>
                    <span className="font-selector__name">{font.name}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Sélection de police pour le texte */}
            <section className="tribe-customization__section">
              <h2 className="tribe-customization__section-title">
                Police du texte
                <span className="tribe-customization__section-subtitle">
                  Pour les textes et boutons
                </span>
              </h2>
              <div className="font-selector font-selector--body">
                {BODY_FONTS.map((font) => (
                  <button
                    key={font.name}
                    className={`font-selector__card ${
                      selectedBodyFont === font.value ? 'font-selector__card--active' : ''
                    }`}
                    onClick={() => setSelectedBodyFont(font.value)}
                  >
                    <span
                      className="font-selector__preview"
                      style={{
                        fontFamily: font.value,
                        fontWeight: font.weight
                      }}
                    >
                      Aa
                    </span>
                    <span className="font-selector__name">{font.name}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Upload images */}
            <section className="tribe-customization__section">
              <h2 className="tribe-customization__section-title">Images</h2>

              <div className="image-upload">
                <label className="image-upload__label">
                  <strong>Bannière</strong> (1200x300px)
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      handleImageSelect('banner', e);
                      e.target.value = ''; // Reset pour pouvoir re-sélectionner le même fichier
                    }}
                    className="image-upload__input"
                  />
                  {bannerPreview || tribe.banner_url ? (
                    <div className="image-upload__preview-container">
                      <img
                        src={bannerPreview || getImageUrl(tribe.banner_url)}
                        alt="Bannière"
                        className="image-upload__preview image-upload__preview--banner"
                      />
                      <div className="image-upload__button image-upload__button--change">
                        📷 Changer la bannière
                      </div>
                    </div>
                  ) : (
                    <div className="image-upload__button">
                      📷 Choisir une bannière
                    </div>
                  )}
                </label>
              </div>

              <div className="image-upload">
                <label className="image-upload__label">
                  <strong>Logo</strong> (300x300px)
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      handleImageSelect('logo', e);
                      e.target.value = ''; // Reset pour pouvoir re-sélectionner le même fichier
                    }}
                    className="image-upload__input"
                  />
                  {logoPreview || tribe.logo_url ? (
                    <div className="image-upload__preview-container">
                      <img
                        src={logoPreview || getImageUrl(tribe.logo_url)}
                        alt="Logo"
                        className="image-upload__preview image-upload__preview--logo"
                      />
                      <div className="image-upload__button image-upload__button--change">
                        🖼️ Changer le logo
                      </div>
                    </div>
                  ) : (
                    <div className="image-upload__button">
                      🖼️ Choisir un logo
                    </div>
                  )}
                </label>
              </div>
            </section>
          </div>

          {/* Preview */}
          <div className="tribe-customization__preview">
            <h2 className="tribe-customization__section-title">Aperçu</h2>
            <div className="tribe-preview" style={previewStyle}>
              <div className="tribe-preview__banner">
                <div className="tribe-preview__banner-overlay" />
              </div>
              <div className="tribe-preview__logo" />
              <h3 className="tribe-preview__name">{tribe.name}</h3>
              <div className="tribe-preview__buttons">
                <button className="tribe-preview__btn">Bouton primaire</button>
                <button className="tribe-preview__btn tribe-preview__btn--secondary">
                  Bouton secondaire
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="tribe-customization__actions">
          <button
            className="tribe-customization__btn tribe-customization__btn--secondary"
            onClick={() => navigate('/tribe')}
            disabled={uploading}
          >
            Annuler
          </button>
          <button
            className="tribe-customization__btn tribe-customization__btn--primary"
            onClick={handleSave}
            disabled={uploading}
          >
            {uploading ? '⏳ Sauvegarde...' : '💾 Sauvegarder'}
          </button>
        </div>

        {/* Modal de recadrage */}
        {showCropModal && imageToCrop && (
          <ImageCropModal
            image={imageToCrop}
            onCropComplete={handleCropComplete}
            onCancel={handleCropCancel}
            aspect={cropType === 'banner' ? 4 / 1 : 1 / 1}
            title={cropType === 'banner' ? 'Recadrer la bannière' : 'Recadrer le logo'}
          />
        )}
      </div>
    </div>
  );
};

export default TribeCustomization;
