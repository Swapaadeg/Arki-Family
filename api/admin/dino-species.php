<?php
<<<<<<< HEAD
/**
 * API Admin - Gestion du catalogue d'espèces de dinosaures
 * CRUD complet : GET / POST / PUT / DELETE
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/security.php';

header('Content-Type: application/json');

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $user = requireAdmin($pdo);
        if ($user) handleGet($pdo);
        break;

    case 'POST':
        $user = requireAdmin($pdo);
        if ($user) handlePost($pdo);
        break;

    case 'PUT':
        $user = requireAdmin($pdo);
        if ($user) handlePut($pdo);
        break;

    case 'DELETE':
        $user = requireAdmin($pdo);
        if ($user) handleDelete($pdo);
        break;

=======
require_once '../config.php';
require_once '../middleware/auth.php';
require_once '../utils/security.php';
require_once '../utils/xss.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDbConnection();
$user = requireAdmin($pdo);

switch ($method) {
    case 'GET':
        handleGet($pdo);
        break;
    case 'POST':
        handlePost($pdo);
        break;
    case 'PUT':
        handlePut($pdo);
        break;
    case 'DELETE':
        handleDelete($pdo);
        break;
>>>>>>> main
    default:
        sendJsonError('Méthode non autorisée', 405);
}

<<<<<<< HEAD
/**
 * GET - Lister toutes les espèces
 */
function handleGet($pdo) {
    try {
        $stmt = $pdo->query("SELECT id, name, types, sort_order, created_at FROM dino_species ORDER BY sort_order, name");
        $rows = $stmt->fetchAll();

        $species = array_map(function ($row) {
            return [
                'id'         => (int) $row['id'],
                'name'       => $row['name'],
                'types'      => json_decode($row['types'], true),
                'sort_order' => (int) $row['sort_order'],
                'created_at' => $row['created_at'],
            ];
        }, $rows);

        sendJsonResponse(['species' => $species]);
    } catch (PDOException $e) {
        sendJsonError('Erreur lors de la récupération des espèces: ' . $e->getMessage(), 500);
    }
}

/**
 * POST - Créer une nouvelle espèce
 */
function handlePost($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);

    $name  = trim($data['name'] ?? '');
    $types = $data['types'] ?? [];

    if (empty($name)) {
        sendJsonError('Le nom est requis', 400);
        return;
    }
    if (empty($types) || !is_array($types)) {
        sendJsonError('Au moins un type est requis', 400);
        return;
    }

    $validTypes = [1, 2, 3, 4, 5, 6];
    foreach ($types as $t) {
        if (!in_array((int) $t, $validTypes)) {
            sendJsonError('Type invalide : ' . $t, 400);
            return;
        }
    }

    try {
        $stmt = $pdo->prepare("SELECT id FROM dino_species WHERE name = ?");
        $stmt->execute([$name]);
        if ($stmt->fetch()) {
            sendJsonError('Une espèce avec ce nom existe déjà', 409);
            return;
        }

        $sortOrder = (int) ($data['sort_order'] ?? 0);
        $typesJson = json_encode(array_values(array_map('intval', $types)));

        $stmt = $pdo->prepare("INSERT INTO dino_species (name, types, sort_order) VALUES (?, ?, ?)");
        $stmt->execute([$name, $typesJson, $sortOrder]);
        $newId = (int) $pdo->lastInsertId();

        sendJsonResponse([
            'message' => 'Espèce créée avec succès',
            'species' => [
                'id'         => $newId,
                'name'       => $name,
                'types'      => array_map('intval', $types),
                'sort_order' => $sortOrder,
            ]
        ], 201);
=======
function handleGet($pdo) {
    try {
        $stmt = $pdo->query('SELECT id, name, types, stats FROM dino_species ORDER BY name ASC');
        $rows = $stmt->fetchAll();
        $result = array_map(function($row) {
            return [
                'id'    => (int)$row['id'],
                'name'  => $row['name'],
                'types' => json_decode($row['types']) ?? [],
                'stats' => json_decode($row['stats']) ?? [],
            ];
        }, $rows);
        sendJsonResponse($result);
    } catch (PDOException $e) {
        sendJsonError('Erreur lors de la récupération: ' . $e->getMessage(), 500);
    }
}

function handlePost($pdo) {
    $input = json_decode(file_get_contents('php://input'), true);
    validateInput($input);

    try {
        $stmt = $pdo->prepare('INSERT INTO dino_species (name, types, stats) VALUES (:name, :types, :stats)');
        $stmt->execute([
            ':name'  => sanitizeText($input['name'], 100),
            ':types' => json_encode($input['types']),
            ':stats' => json_encode($input['stats']),
        ]);
        sendJsonResponse(['id' => (int)$pdo->lastInsertId(), 'message' => 'Espèce créée avec succès'], 201);
>>>>>>> main
    } catch (PDOException $e) {
        sendJsonError('Erreur lors de la création: ' . $e->getMessage(), 500);
    }
}

<<<<<<< HEAD
/**
 * PUT - Modifier une espèce
 */
function handlePut($pdo) {
    $id   = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    $data = json_decode(file_get_contents('php://input'), true);

    if (!$id) {
        sendJsonError('ID manquant', 400);
        return;
    }

    $name  = trim($data['name'] ?? '');
    $types = $data['types'] ?? [];

    if (empty($name)) {
        sendJsonError('Le nom est requis', 400);
        return;
    }
    if (empty($types) || !is_array($types)) {
        sendJsonError('Au moins un type est requis', 400);
        return;
    }

    $validTypes = [1, 2, 3, 4, 5, 6];
    foreach ($types as $t) {
        if (!in_array((int) $t, $validTypes)) {
            sendJsonError('Type invalide : ' . $t, 400);
            return;
        }
    }

    try {
        $stmt = $pdo->prepare("SELECT id FROM dino_species WHERE id = ?");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            sendJsonError('Espèce introuvable', 404);
            return;
        }

        // Check duplicate name (excluding current id)
        $stmt = $pdo->prepare("SELECT id FROM dino_species WHERE name = ? AND id != ?");
        $stmt->execute([$name, $id]);
        if ($stmt->fetch()) {
            sendJsonError('Une autre espèce avec ce nom existe déjà', 409);
            return;
        }

        $sortOrder = (int) ($data['sort_order'] ?? 0);
        $typesJson = json_encode(array_values(array_map('intval', $types)));

        $stmt = $pdo->prepare("UPDATE dino_species SET name = ?, types = ?, sort_order = ? WHERE id = ?");
        $stmt->execute([$name, $typesJson, $sortOrder, $id]);

        sendJsonResponse([
            'message' => 'Espèce mise à jour',
            'species' => [
                'id'         => $id,
                'name'       => $name,
                'types'      => array_map('intval', $types),
                'sort_order' => $sortOrder,
            ]
        ]);
=======
function handlePut($pdo) {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    if (!$id) {
        sendJsonError('ID manquant', 400);
    }

    $input = json_decode(file_get_contents('php://input'), true);
    validateInput($input);

    try {
        $stmt = $pdo->prepare('UPDATE dino_species SET name = :name, types = :types, stats = :stats WHERE id = :id');
        $stmt->execute([
            ':name'  => sanitizeText($input['name'], 100),
            ':types' => json_encode($input['types']),
            ':stats' => json_encode($input['stats']),
            ':id'    => $id,
        ]);
        if ($stmt->rowCount() === 0) {
            sendJsonError('Espèce introuvable', 404);
        }
        sendJsonResponse(['message' => 'Espèce mise à jour avec succès']);
>>>>>>> main
    } catch (PDOException $e) {
        sendJsonError('Erreur lors de la mise à jour: ' . $e->getMessage(), 500);
    }
}

<<<<<<< HEAD
/**
 * DELETE - Supprimer une espèce
 */
function handleDelete($pdo) {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if (!$id) {
        sendJsonError('ID manquant', 400);
        return;
    }

    try {
        $stmt = $pdo->prepare("SELECT id, name FROM dino_species WHERE id = ?");
        $stmt->execute([$id]);
        $species = $stmt->fetch();

        if (!$species) {
            sendJsonError('Espèce introuvable', 404);
            return;
        }

        $stmt = $pdo->prepare("DELETE FROM dino_species WHERE id = ?");
        $stmt->execute([$id]);

        sendJsonResponse(['message' => "Espèce \"{$species['name']}\" supprimée"]);
=======
function handleDelete($pdo) {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    if (!$id) {
        sendJsonError('ID manquant', 400);
    }

    try {
        $stmt = $pdo->prepare('DELETE FROM dino_species WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) {
            sendJsonError('Espèce introuvable', 404);
        }
        sendJsonResponse(['message' => 'Espèce supprimée avec succès']);
>>>>>>> main
    } catch (PDOException $e) {
        sendJsonError('Erreur lors de la suppression: ' . $e->getMessage(), 500);
    }
}
<<<<<<< HEAD
=======

function validateInput($input) {
    if (empty($input['name'])) {
        sendJsonError('Le nom est requis', 400);
    }
    if (detectXssPatterns($input['name'])) {
        sendJsonError('Le nom contient des caractères non autorisés', 400);
    }
    if (!isset($input['types']) || !is_array($input['types']) || empty($input['types'])) {
        sendJsonError('Au moins un type est requis', 400);
    }
    $validTypes = [1, 2, 3, 4, 5, 6];
    foreach ($input['types'] as $t) {
        if (!in_array((int)$t, $validTypes)) {
            sendJsonError('Type invalide: ' . $t, 400);
        }
    }
    if (!isset($input['stats']) || !is_array($input['stats'])) {
        sendJsonError('Les stats sont requises', 400);
    }
    $validStats = ['health', 'stamina', 'oxygen', 'food', 'weight', 'damage', 'crafting'];
    foreach ($input['stats'] as $s) {
        if (!in_array($s, $validStats)) {
            sendJsonError('Stat invalide: ' . $s, 400);
        }
    }
}
>>>>>>> main
