<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware/auth.php';
require_once __DIR__ . '/utils/security.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonError('Méthode non autorisée', 405);
}

$pdo  = getDbConnection();
$user = requireAuth($pdo);
if (!$user) exit;

function deriveStats($types, $name) {
    $oxygenExceptions = ['Spinosaure', 'Aberrant Spino'];
    $craftingSpecies  = ['Helicoprion', 'Gacha'];
    $stats = ['health', 'stamina', 'food', 'weight', 'damage'];
    if (!in_array(3, $types) || in_array($name, $oxygenExceptions)) {
        $stats[] = 'oxygen';
    }
    if (in_array($name, $craftingSpecies)) {
        $stats[] = 'crafting';
    }
    return $stats;
}

try {
    $stmt = $pdo->query('SELECT id, name, types, stats FROM dino_species ORDER BY name ASC');
    $rows = $stmt->fetchAll();
    $result = array_map(function ($row) {
        $types = json_decode($row['types']) ?? [];
        $stats = json_decode($row['stats']) ?? [];
        if (empty($stats)) {
            $stats = deriveStats(array_map('intval', (array)$types), $row['name']);
        }
        return [
            'id'    => (int) $row['id'],
            'name'  => $row['name'],
            'types' => $types,
            'stats' => $stats,
        ];
    }, $rows);
    sendJsonResponse($result);
} catch (PDOException $e) {
    sendJsonError('Erreur: ' . $e->getMessage(), 500);
}
