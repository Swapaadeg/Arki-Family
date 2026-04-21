// Script de téléchargement des images de régions depuis le wiki ARK
// Usage: node scripts/download-dino-images.cjs

const https = require('https');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '../public/assets/dinos');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// wikiFilename peut différer du nom local (ex: Ptera ASA)
const dinos = [
  { wikiName: 'Rex',        regions: [0, 1, 3, 4, 5] },
  { wikiName: 'Spino',      regions: [0, 1, 4, 5] },
  { wikiName: 'Raptor',     regions: [0, 1, 3, 4, 5] },
  // Ptera : régions 0-3 = Ptera_, régions 4-5 = ASA
  { wikiName: 'Ptera',      regions: [0, 1, 2, 3],     wikiPrefix: 'Ptera' },
  { wikiName: 'Ptera',      regions: [4, 5],            wikiPrefix: 'Pteranodon', wikiSuffix: '_ASA' },
  { wikiName: 'Argentavis', regions: [0, 2, 3, 4, 5] },
];

const downloadImage = (url, dest, redirectCount = 0) => new Promise((resolve, reject) => {
  if (redirectCount > 5) return reject(new Error('Trop de redirections'));
  if (fs.existsSync(dest)) {
    console.log(`  [SKIP] ${path.basename(dest)} déjà présent`);
    return resolve();
  }

  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'image/png,image/*',
      'Referer': 'https://ark.wiki.gg/',
    },
  };

  const file = fs.createWriteStream(dest);
  https.get(url, options, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302) {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      return downloadImage(res.headers.location, dest, redirectCount + 1).then(resolve).catch(reject);
    }
    if (res.statusCode !== 200) {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      return reject(new Error(`HTTP ${res.statusCode}`));
    }
    res.pipe(file);
    file.on('finish', () => { file.close(); resolve(); });
  }).on('error', (err) => {
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    reject(err);
  });
});

const run = async () => {
  for (const entry of dinos) {
    const { wikiName, regions, wikiPrefix, wikiSuffix = '' } = entry;
    const prefix = wikiPrefix || wikiName;
    for (const regionId of regions) {
      const wikiFilename = `${prefix}_PaintRegion${regionId}${wikiSuffix}.png`;
      // Fichier local toujours en format standard
      const localFilename = `${wikiName}_PaintRegion${regionId}.png`;
      const url = `https://ark.wiki.gg/wiki/Special:Redirect/file/${wikiFilename}`;
      const dest = path.join(outputDir, localFilename);
      try {
        await downloadImage(url, dest);
        console.log(`  [OK] ${localFilename}${wikiSuffix ? ` (via ${wikiFilename})` : ''}`);
      } catch (err) {
        console.error(`  [ERREUR] ${localFilename}: ${err.message}`);
      }
      await sleep(300); // éviter le rate-limiting
    }
  }
  console.log('\nTerminé !');
};

run();
