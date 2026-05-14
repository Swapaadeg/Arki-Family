import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '../../components/Header/Header';
import { dinoRegions, getRegionImageUrl } from '../../data/dinoRegions';
import { colorList } from '../../data/arkColors';
import './ColorSimulator.scss';

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 128, g: 128, b: 128 };
};

// Détecte si un pixel est coloré (appartient à une région)
// Utilise la distance absolue entre canaux plutôt que la saturation relative
// pour éviter les faux positifs sur les pixels sombres
const getDelta = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b);


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

      // Lire les pixels de toutes les régions en avance
      const regionDatas = {};
      for (const regionId of activeRegionIds) {
        const img = regionImagesRef.current[regionId];
        const offscreen = document.createElement('canvas');
        offscreen.width = img.naturalWidth;
        offscreen.height = img.naturalHeight;
        const offCtx = offscreen.getContext('2d');
        offCtx.drawImage(img, 0, 0);
        regionDatas[regionId] = offCtx.getImageData(0, 0, img.naturalWidth, img.naturalHeight).data;
      }

      const { width, height } = canvas;
      const n = activeRegionIds.length;
      const totalPx = width * height;
      const outputData = ctx.createImageData(width, height);
      const output = outputData.data;
      const firstData = regionDatas[activeRegionIds[0]];

      // Étape A : détecter la teinte de référence de chaque image wiki.
      // Chaque image montre UNE région dans une couleur pure très saturée (ex: jaune pur, rouge pur).
      // On construit un histogramme de teinte des pixels saturés pour trouver le pic dominant.
      const regionRefHue = {};
      for (const regionId of activeRegionIds) {
        const d = regionDatas[regionId];
        const hist = new Float32Array(36); // bins de 10°
        for (let px = 0; px < totalPx; px += 2) {
          const i = px * 4;
          const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
          const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
          if (max < 0.15 || delta < 0.15) continue;
          const sat = delta / max;
          if (sat < 0.45) continue;
          let h = max === r ? (g - b) / delta + (g < b ? 6 : 0)
                : max === g ? (b - r) / delta + 2
                : (r - g) / delta + 4;
          h = ((h / 6) * 360 + 360) % 360;
          hist[Math.floor(h / 10) % 36] += sat;
        }
        let peak = 0, peakBin = 0;
        for (let bin = 0; bin < 36; bin++) {
          if (hist[bin] > peak) { peak = hist[bin]; peakBin = bin; }
        }
        regionRefHue[regionId] = peakBin * 10 + 5;
      }

      // Étape B : attribuer chaque pixel à la région dont la teinte de référence
      // correspond le mieux à la couleur du pixel dans cette image.
      const regionOwner = new Int8Array(totalPx).fill(-1);
      for (let px = 0; px < totalPx; px++) {
        const i = px * 4;
        let bestScore = 0, ownerIdx = -1;
        for (let ri = 0; ri < n; ri++) {
          const regionId = activeRegionIds[ri];
          const d = regionDatas[regionId];
          const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
          const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
          if (max < 0.1 || delta < 0.08) continue;
          const sat = delta / max;
          if (sat < 0.35) continue;
          let h = max === r ? (g - b) / delta + (g < b ? 6 : 0)
                : max === g ? (b - r) / delta + 2
                : (r - g) / delta + 4;
          h = ((h / 6) * 360 + 360) % 360;
          const refH = regionRefHue[regionId];
          const hueDiff = Math.min(Math.abs(h - refH), 360 - Math.abs(h - refH));
          if (hueDiff > 35) continue;
          const score = sat * (1 - hueDiff / 35);
          if (score > bestScore) { bestScore = score; ownerIdx = ri; }
        }
        if (bestScore > 0.25) regionOwner[px] = activeRegionIds[ownerIdx];
      }

      // Nettoyage : supprimer les pixels totalement isolés
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const px = y * width + x;
          if (regionOwner[px] === -1) continue;
          const owner = regionOwner[px];
          let ok = false;
          outer: for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (!dy && !dx) continue;
              if (regionOwner[(y + dy) * width + (x + dx)] === owner) { ok = true; break outer; }
            }
          }
          if (!ok) regionOwner[px] = -1;
        }
      }

      // Dilatation : 5 passes pour combler les trous restants
      for (let pass = 0; pass < 5; pass++) {
        const snap = new Int8Array(regionOwner);
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const px = y * width + x;
            if (snap[px] !== -1) continue;
            const counts = {};
            let total = 0;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (!dy && !dx) continue;
                const nb = snap[(y + dy) * width + (x + dx)];
                if (nb !== -1) { counts[nb] = (counts[nb] || 0) + 1; total++; }
              }
            }
            if (total >= 3) {
              let best = -1, bestC = 0;
              for (const [r, c] of Object.entries(counts)) {
                if (+c > bestC) { bestC = +c; best = +r; }
              }
              regionOwner[px] = best;
            }
          }
        }
      }

      // Pass 2 : luminosité de base = moyenne des greys dans les images où ce pixel N'EST PAS coloré
      const greyBase = new Uint8Array(totalPx);

      for (let px = 0; px < totalPx; px++) {
        const i = px * 4;
        const owner = regionOwner[px];
        let sumGrey = 0, count = 0;

        for (const regionId of activeRegionIds) {
          if (regionId === owner) continue;
          const d = regionDatas[regionId];
          sumGrey += Math.round(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
          count++;
        }

        const grey = count > 0 ? Math.round(sumGrey / count)
          : Math.round(firstData[i] * 0.299 + firstData[i + 1] * 0.587 + firstData[i + 2] * 0.114);
        greyBase[px]  = grey;
        output[i]     = grey;
        output[i + 1] = grey;
        output[i + 2] = grey;
        output[i + 3] = firstData[i + 3];
      }

      // Pass 3 : colorier les pixels de chaque région avec la couleur choisie
      for (const regionId of activeRegionIds) {
        const userColorHex = regionColors[regionId];
        if (!userColorHex) continue;

        const userRgb = hexToRgb(userColorHex);

        for (let px = 0; px < totalPx; px++) {
          if (regionOwner[px] !== regionId) continue;
          const i = px * 4;
          const lum = Math.pow(greyBase[px] / 255, 0.8);
          output[i]     = Math.round(userRgb.r * lum);
          output[i + 1] = Math.round(userRgb.g * lum);
          output[i + 2] = Math.round(userRgb.b * lum);
          output[i + 3] = firstData[i + 3];
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
