<?php
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
    default:
        sendJsonError('Méthode non autorisée', 405);
}

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
    } catch (PDOException $e) {
        sendJsonError('Erreur lors de la création: ' . $e->getMessage(), 500);
    }
}

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
    } catch (PDOException $e) {
        sendJsonError('Erreur lors de la mise à jour: ' . $e->getMessage(), 500);
    }
}

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
    } catch (PDOException $e) {
        sendJsonError('Erreur lors de la suppression: ' . $e->getMessage(), 500);
    }
}

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
