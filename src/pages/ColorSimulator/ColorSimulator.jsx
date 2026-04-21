import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '../../components/Header/Header';
import { dinoRegions, getRegionImageUrl } from '../../data/dinoRegions';
import { colorList } from '../../data/arkColors';
import './ColorSimulator.scss';

// Couleurs de surbrillance wiki par région (pour détecter les pixels de la région)
const REGION_WIKI_COLORS = {
  0: { r: 255, g: 0,   b: 0   }, // Rouge
  1: { r: 0,   g: 255, b: 0   }, // Vert
  2: { r: 0,   g: 0,   b: 255 }, // Bleu
  3: { r: 255, g: 255, b: 0   }, // Jaune
  4: { r: 0,   g: 255, b: 255 }, // Cyan
  5: { r: 255, g: 0,   b: 255 }, // Magenta
};

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 128, g: 128, b: 128 };
};

// Détecte si un pixel appartient à une région via sa saturation
const getPixelSaturation = (r, g, b) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
};

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error(`Impossible de charger : ${src}`));
  img.src = src;
});

const ColorSimulator = () => {
  const [selectedDino, setSelectedDino] = useState('Rex');
  const [regionColors, setRegionColors] = useState({});
  const [searchColor, setSearchColor] = useState('');
  const [activeRegion, setActiveRegion] = useState(null);
  const [rendering, setRendering] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const canvasRef = useRef(null);
  const regionImagesRef = useRef({});

  const dino = dinoRegions[selectedDino];
  const activeRegionIds = Object.keys(dino.regions).map(Number);

  // Réinitialiser les couleurs au changement de dino
  useEffect(() => {
    setRegionColors({});
    setActiveRegion(null);
    setLoadError(false);
    regionImagesRef.current = {};
  }, [selectedDino]);

  // Rendu Canvas
  const renderCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setRendering(true);
    const ctx = canvas.getContext('2d');

    try {
      // Charger toutes les images de régions si pas déjà en cache
      for (const regionId of activeRegionIds) {
        if (!regionImagesRef.current[regionId]) {
          const url = getRegionImageUrl(dino.wikiName, regionId);
          regionImagesRef.current[regionId] = await loadImage(url);
        }
      }

      const firstImg = regionImagesRef.current[activeRegionIds[0]];
      canvas.width = firstImg.naturalWidth;
      canvas.height = firstImg.naturalHeight;

      // Créer un canvas offscreen pour chaque région
      const regionCanvases = {};
      for (const regionId of activeRegionIds) {
        const img = regionImagesRef.current[regionId];
        const offscreen = document.createElement('canvas');
        offscreen.width = img.naturalWidth;
        offscreen.height = img.naturalHeight;
        const offCtx = offscreen.getContext('2d');
        offCtx.drawImage(img, 0, 0);
        regionCanvases[regionId] = { canvas: offscreen, ctx: offCtx };
      }

      // Construire l'image finale pixel par pixel
      const { width, height } = canvas;
      const outputData = ctx.createImageData(width, height);
      const output = outputData.data;

      // Lire les données de la première image pour la base grise
      const baseCtx = regionCanvases[activeRegionIds[0]].ctx;
      const baseData = baseCtx.getImageData(0, 0, width, height).data;

      // Initialiser avec la base en niveaux de gris
      for (let i = 0; i < output.length; i += 4) {
        const r = baseData[i], g = baseData[i+1], b = baseData[i+2];
        const grey = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
        output[i] = grey;
        output[i+1] = grey;
        output[i+2] = grey;
        output[i+3] = baseData[i+3];
      }

      // Appliquer chaque région colorée par-dessus
      for (const regionId of activeRegionIds) {
        const userColorHex = regionColors[regionId];
        if (!userColorHex) continue;

        const userRgb = hexToRgb(userColorHex);
        const { ctx: rCtx } = regionCanvases[regionId];
        const rData = rCtx.getImageData(0, 0, width, height).data;

        for (let i = 0; i < rData.length; i += 4) {
          const r = rData[i], g = rData[i+1], b = rData[i+2];
          const sat = getPixelSaturation(r, g, b);

          if (sat > 0.35) {
            // Pixel appartenant à cette région
            const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
            output[i]   = Math.round(userRgb.r * lum);
            output[i+1] = Math.round(userRgb.g * lum);
            output[i+2] = Math.round(userRgb.b * lum);
            output[i+3] = rData[i+3];
          }
        }
      }

      ctx.putImageData(outputData, 0, 0);
      setLoadError(false);
    } catch (err) {
      console.error('Erreur rendu:', err);
      setLoadError(true);
    } finally {
      setRendering(false);
    }
  }, [selectedDino, regionColors, activeRegionIds, dino.wikiName]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const handleColorSelect = (regionId, colorHex) => {
    setRegionColors(prev => ({ ...prev, [regionId]: colorHex }));
  };

  const handleResetRegion = (regionId) => {
    setRegionColors(prev => {
      const next = { ...prev };
      delete next[regionId];
      return next;
    });
  };

  const filteredColors = searchColor
    ? colorList.filter(c =>
        c.name.toLowerCase().includes(searchColor.toLowerCase()) ||
        String(c.id).includes(searchColor)
      )
    : colorList;

  return (
    <div className="color-simulator">
      <Header />
      <div className="color-simulator__container">
        <h1 className="color-simulator__title">Simulateur de couleurs</h1>

        {/* Sélecteur de dino */}
        <div className="color-simulator__dino-selector">
          {Object.entries(dinoRegions).map(([key, d]) => (
            <button
              key={key}
              className={`color-simulator__dino-btn ${selectedDino === key ? 'color-simulator__dino-btn--active' : ''}`}
              onClick={() => setSelectedDino(key)}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="color-simulator__layout">
          {/* Canvas de prévisualisation */}
          <div className="color-simulator__preview">
            {loadError ? (
              <div className="color-simulator__error">
                Images non disponibles.<br />
                Lance : <code>node scripts/download-dino-images.js</code>
              </div>
            ) : (
              <>
                {rendering && <div className="color-simulator__loading">Chargement...</div>}
                <canvas ref={canvasRef} className="color-simulator__canvas" />
              </>
            )}
          </div>

          {/* Panneau de contrôle */}
          <div className="color-simulator__controls">
            {/* Régions */}
            <div className="color-simulator__regions">
              <h2 className="color-simulator__section-title">Régions</h2>
              {activeRegionIds.map(regionId => {
                const region = dino.regions[regionId];
                const selectedHex = regionColors[regionId];
                return (
                  <div
                    key={regionId}
                    className={`color-simulator__region ${activeRegion === regionId ? 'color-simulator__region--active' : ''}`}
                    onClick={() => setActiveRegion(activeRegion === regionId ? null : regionId)}
                  >
                    <div
                      className="color-simulator__region-swatch"
                      style={{ background: selectedHex || '#444' }}
                    />
                    <div className="color-simulator__region-info">
                      <span className="color-simulator__region-num">R{regionId}</span>
                      <span className="color-simulator__region-name">{region.name}</span>
                    </div>
                    {selectedHex && (
                      <button
                        className="color-simulator__region-reset"
                        onClick={(e) => { e.stopPropagation(); handleResetRegion(regionId); }}
                      >✕</button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sélecteur de couleur */}
            {activeRegion !== null && (
              <div className="color-simulator__color-picker">
                <h2 className="color-simulator__section-title">
                  Couleur — R{activeRegion} : {dino.regions[activeRegion]?.name}
                </h2>
                <input
                  type="text"
                  placeholder="Rechercher (nom ou ID)..."
                  value={searchColor}
                  onChange={e => setSearchColor(e.target.value)}
                  className="color-simulator__search"
                />
                <div className="color-simulator__palette">
                  {filteredColors.map(color => (
                    <button
                      key={color.id}
                      className={`color-simulator__color-swatch ${regionColors[activeRegion] === color.hex ? 'color-simulator__color-swatch--selected' : ''}`}
                      style={{ background: color.hex }}
                      title={`${color.id} — ${color.name}`}
                      onClick={() => handleColorSelect(activeRegion, color.hex)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorSimulator;
