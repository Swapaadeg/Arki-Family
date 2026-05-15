<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/security.php';

header('Content-Type: application/json');

$pdo  = getDbConnection();
$user = requireAdmin($pdo);

// All ARK species from the static JS file
$oxygenExceptions = ['Spinosaure', 'Aberrant Spino'];
$craftingSpecies  = ['Helicoprion', 'Gacha'];

function getStats($types, $name) {
    global $oxygenExceptions, $craftingSpecies;
    $stats = ['health', 'stamina', 'food', 'weight', 'damage'];
    if (!in_array(3, $types) || in_array($name, $oxygenExceptions)) {
        $stats[] = 'oxygen';
    }
    if (in_array($name, $craftingSpecies)) {
        $stats[] = 'crafting';
    }
    return $stats;
}

$species = [
    // Carnivores terrestres
    ['Acrocanthosaurus',        [1]],
    ['Allosaurus',              [1]],
    ['Baryonyx',                [1, 3]],
    ['Carcharodontosaurus',     [1]],
    ['Carnotaurus',             [1]],
    ['Ceratosaure',             [1, 3]],
    ['Compy',                   [1, 5]],
    ['Cryolophosaurus',         [1]],
    ['Deinonychus',             [1]],
    ['Dilophosaur',             [1]],
    ['Loup Sinistre',           [1]],
    ['Ours Sinistre',           [1]],
    ['Giganotosaurus',          [1]],
    ['Kaprosuchus',             [1]],
    ['Megalosaurus',            [1]],
    ['Microraptor',             [1, 5]],
    ['Raptor',                  [1]],
    ['Rex',                     [1]],
    ['Smilodon',                [1]],
    ['Spinosaure',              [1, 3]],
    ['Oiseau Terreur',          [1]],
    ['Therizinosaure',          [2]],
    ['Thylacoleo',              [1]],
    ['Troodon',                 [1]],
    ['Yutyrannus',              [1]],
    // Herbivores terrestres
    ['Amargasaurus',            [2]],
    ['Ankylosaurus',            [2]],
    ['Brontosaurus',            [2]],
    ['Carbonemys',              [2]],
    ['Chalicotherium',          [2]],
    ['Cornusaurus',             [2]],
    ['Diplodocus',              [2]],
    ['Doedicurus',              [2]],
    ['Equus',                   [2]],
    ['Gallimimus',              [2]],
    ['Gigantopithecus',         [2]],
    ['Iguanodon',               [2]],
    ['Kentrosaurus',            [2]],
    ['Lystrosaurus',            [2]],
    ['Mammouth',                [2]],
    ['Megaloceros',             [2]],
    ['Paraceratherium',         [2]],
    ['Parasaur',                [2]],
    ['Phiomia',                 [2]],
    ['Stegosaurus',             [2]],
    ['Triceratops',             [2]],
    ['Rhinocéros Laineux',      [2]],
    ['Ovis',                    [2]],
    ['Rat des Profondeurs',     [2]],
    // Volants
    ['Archaeopteryx',           [1, 5]],
    ['Argentavis',              [1, 4]],
    ['Astrocetus',              [2, 4]],
    ['Astrodelphis',            [1, 4]],
    ['Cosmo',                   [2, 4]],
    ['Desmodus',                [1, 4]],
    ['Dimorphodon',             [1, 4, 5]],
    ['Gigadesmodus',            [1, 4]],
    ['Griffin',                 [1, 4]],
    ['Lymantria',               [2, 4]],
    ['Maewing',                 [2, 4]],
    ['Managarmr',               [1, 4]],
    ['Pelagornis',              [2, 4]],
    ['Phoenix',                 [1, 4]],
    ['Pteranodon',              [1, 4]],
    ['Quetzal',                 [2, 4]],
    ['Sinomacrops',             [1, 4, 5]],
    ['Harfang',                 [1, 4]],
    ['Tapejara',                [1, 4]],
    ['Tropeognathus',           [1, 4]],
    ['Veilwyn',                 [1, 4]],
    ['Voidwyrm',                [1, 4]],
    ['Wyverne Feu',             [1, 4]],
    ['Wyverne Foudre',          [1, 4]],
    ['Wyverne Poison',          [1, 4]],
    ['Wyverne Glace',           [1, 4]],
    ['Crystal Wyvern (Blood)',  [1, 4]],
    ['Crystal Wyvern (Ember)',  [1, 4]],
    ['Crystal Wyvern (Tropical)', [2, 4]],
    ['Runic Flame Wyvern',      [1, 4]],
    ['Runic Venom Wyvern',      [1, 4]],
    ['Runic Spark Wyvern',      [1, 4]],
    ['Runic Glacial Wyvern',    [1, 4]],
    ['Runic Ghost Wyvern',      [1, 4]],
    ['Runic Quartz Wyvern',     [1, 4]],
    ['Runic Ruby Wyvern',       [1, 4]],
    ['Runic Emerald Wyvern',    [1, 4]],
    ['Runic Sapphire Wyvern',   [1, 4]],
    ['Runic Halo Wyvern',       [1, 4]],
    ['Runic Void Wyvern',       [1, 4]],
    ['Runic Crystal Queen Wyvern', [1, 4]],
    // Aquatiques
    ['Baudroie Abyssale',       [1, 3]],
    ['Archelon',                [2, 3]],
    ['Basilosaurus',            [1, 3]],
    ['Beelzebufo',              [1, 3]],
    ['Castoroides',             [2, 3]],
    ['Diplocaulus',             [2, 3]],
    ['Dunkleosteus',            [1, 3]],
    ['Electrophorus',           [1, 3]],
    ['Helicoprion',             [1, 3]],
    ['Ichthyosaurus',           [1, 3]],
    ['Karkinos',                [1, 3]],
    ['Manta',                   [2, 3]],
    ['Megalodon',               [1, 3]],
    ['Mosasaurus',              [1, 3]],
    ['Plesiosaur',              [1, 3]],
    ['Sarcosuchus',             [1, 3]],
    ['Shadowmane',              [1, 3]],
    ['Shastasaurus',            [1, 3]],
    ['Tusoteuthis',             [1, 3]],
    ['Xiphactinus',             [1, 3]],
    // Épaule
    ['Bulbdog',                 [2, 5]],
    ['Plumineux',               [2, 5]],
    ['Gecko Luisant',           [2, 5]],
    ['Jerboa',                  [2, 5]],
    ['Mesopithecus',            [2, 5]],
    ['Noglin',                  [1, 5]],
    ['Loutre',                  [1, 5]],
    ['Pegomastax',              [2, 5]],
    ['Runic Halo Lantern Wyvern', [1, 4, 5]],
    ['Shinehorn',               [2, 5]],
    // Créatures spéciales
    ['Andrewsarchus',           [1]],
    ['Bloodstalker',            [1]],
    ['Colossuscorpius',         [1]],
    ['Daeodon',                 [1]],
    ['Dimetrodon',              [1]],
    ['Dinopithecus',            [1]],
    ['Enforcer',                [1]],
    ['Fenrir',                  [1]],
    ['Ferox',                   [1]],
    ['Gacha',                   [2]],
    ['Gasbags',                 [2]],
    ['Gloon',                   [2]],
    ['Hyaenodon',               [1]],
    ['Magmasaur',               [1]],
    ['Malwyn',                  [1]],
    ['Mantis',                  [1]],
    ['Mek',                     [1]],
    ['Megalania',               [1]],
    ['Morellatops',             [2]],
    ['Ossidon',                 [1]],
    ['Pulmonoscorpius',         [1]],
    ['Purlovia',                [1]],
    ['Ravager',                 [1]],
    ['Reaper King',             [1]],
    ['Reaper Queen',            [1]],
    ['Rock Drake',              [1]],
    ['Golem',                   [1]],
    ['Solwyn',                  [1]],
    ['Tek Stryder',             [2]],
    ['Thorax Spider',           [1]],
    ['Thorny Dragon',           [2]],
    ['Titanoboa',               [1]],
    ['Velonasaur',              [1]],
    // Fjordur
    ['Hati and Skoll',          [1]],
    ['Steinbjorn (Rock Bear)',  [1]],
    // ASA Scorched Earth
    ['Fasolasuchus',            [1]],
    ['Dreadmare',               [1]],
    ['Pyromane',                [1]],
    // ASA Aberration
    ['Elderclaw',               [1]],
    ['Aureliax',                [1, 4]],
    ['Yi Ling',                 [1, 4]],
    ['Glowtail Prime',          [2, 5]],
    // ASA The Center
    ['Drakeling',               [1, 4, 5]],
    // Aberrant
    ['Aberrant Baudroie Abyssale', [1, 3]],
    ['Aberrant Ankylosaurus',   [2]],
    ['Aberrant Baryonyx',       [1, 3]],
    ['Aberrant Carnotaurus',    [1]],
    ['Aberrant Dimetrodon',     [1]],
    ['Aberrant Dimorphodon',    [1, 4, 5]],
    ['Aberrant Diplocaulus',    [2, 3]],
    ['Aberrant Dire Bear',      [1]],
    ['Aberrant Doedicurus',     [2]],
    ['Aberrant Electrophorus',  [1, 3]],
    ['Aberrant Iguanodon',      [2]],
    ['Aberrant Lystrosaurus',   [2]],
    ['Aberrant Megalosaurus',   [1]],
    ['Aberrant Parasaur',       [2]],
    ['Aberrant Pulmonoscorpius',[1]],
    ['Aberrant Raptor',         [1]],
    ['Aberrant Sabertooth',     [1]],
    ['Aberrant Sarco',          [1, 3]],
    ['Aberrant Sarcosuchus',    [1, 3]],
    ['Aberrant Spino',          [1, 3]],
    ['Aberrant Stegosaurus',    [2]],
    ['Aberrant Titanoboa',      [1]],
    // Tek
    ['Tek Parasaur',            [2]],
    ['Tek Quetzal',             [2, 4]],
    ['Tek Raptor',              [1]],
    ['Tek Rex',                 [1]],
    ['Tek Stegosaurus',         [2]],
    ['Tek Triceratops',         [2]],
    // X
    ['X-Allosaurus',            [1]],
    ['X-Ankylosaurus',          [2]],
    ['X-Basilosaurus',          [1, 3]],
    ['X-Megalodon',             [1, 3]],
    ['X-Mosasaurus',            [1, 3]],
    ['X-Parasaur',              [2]],
    ['X-Rex',                   [1]],
    ['X-Tapejara',              [1, 4]],
    ['X-Triceratops',           [2]],
    ['X-Yutyrannus',            [1]],
    // R
    ['R-Giganotosaurus',        [1]],
    ['R-Parasaur',              [2]],
    ['R-Reaper King',           [1]],
    ['R-Snow Owl',              [1, 4]],
    ['R-Thylacoleo',            [1]],
];

$stmt    = $pdo->prepare('INSERT IGNORE INTO dino_species (name, types, stats) VALUES (?, ?, ?)');
$inserted = 0;
$skipped  = 0;

foreach ($species as [$name, $types]) {
    $stats = getStats($types, $name);
    $stmt->execute([$name, json_encode($types), json_encode($stats)]);
    if ($stmt->rowCount() > 0) {
        $inserted++;
    } else {
        $skipped++;
    }
}

sendJsonResponse([
    'message'  => "Seed terminé : $inserted ajoutés, $skipped déjà existants",
    'inserted' => $inserted,
    'skipped'  => $skipped,
    'total'    => count($species),
]);
