// Données des régions de couleur par dino
// Images source : https://ark.wiki.gg
// Chaque région active a une image wiki : {wikiName}_PaintRegion{id}.png

export const dinoRegions = {
  Rex: {
    label: 'Rex',
    wikiName: 'Rex',
    regions: {
      0: { name: 'Corps' },
      1: { name: 'Épine dorsale' },
      3: { name: 'Reflets' },
      4: { name: 'Dos' },
      5: { name: 'Ventre' },
    },
  },
  Spino: {
    label: 'Spinosaure',
    wikiName: 'Spino',
    regions: {
      0: { name: 'Corps' },
      1: { name: 'Bord de voile' },
      4: { name: 'Visage, Queue, Voile intérieure' },
      5: { name: 'Ventre' },
    },
  },
  Raptor: {
    label: 'Raptor',
    wikiName: 'Raptor',
    regions: {
      0: { name: 'Accent corps' },
      1: { name: 'Pointes plumes' },
      3: { name: 'Corps et plumes' },
      4: { name: 'Épine dorsale' },
      5: { name: 'Ventre' },
    },
  },
  Ptera: {
    label: 'Ptéranodonte',
    wikiName: 'Ptera',
    regions: {
      0: { name: 'Motifs' },
      1: { name: 'Base des ailes' },
      2: { name: 'Visage, Crête, Mains' },
      3: { name: 'Crête intérieure' },
      4: { name: 'Membrane des ailes' },
      5: { name: 'Corps' },
    },
  },
  Argentavis: {
    label: 'Argentavis',
    wikiName: 'Argentavis',
    regions: {
      0: { name: 'Corps' },
      2: { name: 'Pointes des ailes' },
      3: { name: 'Pattes' },
      4: { name: 'Plumes de tête' },
      5: { name: 'Dessous' },
    },
  },
};

// Génère l'URL de l'image wiki pour une région
export const getRegionImageUrl = (wikiName, regionId) =>
  `/assets/dinos/${wikiName}_PaintRegion${regionId}.png`;

export default dinoRegions;
