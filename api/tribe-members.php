<?php
/**
 * API REST pour gérer les membres de tribu et les demandes d'adhésion
 * Endpoints: GET, POST, PUT, DELETE
 */

require_once 'config.php';
require_once 'middleware/auth.php';
require_once 'utils/security.php';
require_once 'utils/xss.php';

// Récupérer la méthode HTTP
$method = $_SERVER['REQUEST_METHOD'];

// Connexion DB
$pdo = getDbConnection();

// Vérifier l'authentification
$user = requireAuth($pdo);

// Note: CSRF protection is not needed with JWT Bearer token authentication
// All modification operations require JWT authentication via requireAuth()
// JWT tokens in the Authorization header already provide protection against CSRF attacks

// Router selon la méthode HTTP
switch ($method) {
    case 'GET':
        handleGet($pdo, $user);
        break;
    case 'POST':
        handlePost($pdo, $user);
        break;
    case 'PUT':
        handlePut($pdo, $user);
        break;
    case 'DELETE':
        handleDelete($pdo, $user);
        break;
    default:
        sendJsonError('Méthode non autorisée', 405);
}

/**
 * GET - Récupérer les demandes en attente (pour le owner)
 */
function handleGet($pdo, $user) {
    try {
        error_log("[tribe-members] GET request from user: " . $user['id']);

        // Récupérer la tribu de l'utilisateur
        $stmt = $pdo->prepare("
            SELECT tribe_id, role FROM tribe_members
            WHERE user_id = ? AND is_validated = 1
        ");
        $stmt->execute([$user['id']]);
        $membership = $stmt->fetch();

        if (!$membership) {
            sendJsonResponse(['requests' => []]);
            return;
        }

        // Tout membre validé peut voir les demandes en attente
        $stmt = $pdo->prepare("
            SELECT tm.id, tm.user_id, tm.request_message,
                   u.username, u.email, u.photo_profil
            FROM tribe_members tm
            JOIN users u ON tm.user_id = u.id
            WHERE tm.tribe_id = ? AND tm.is_validated = 0
            ORDER BY tm.id ASC
        ");
        $stmt->execute([$membership['tribe_id']]);
        $requests = $stmt->fetchAll();

        error_log("[tribe-members] Found " . count($requests) . " pending requests for tribe " . $membership['tribe_id']);

        $result = array_map(function($req) {
            return [
                'id' => (int)$req['id'],
                'user_id' => (int)$req['user_id'],
                'username' => $req['username'],
                'email' => $req['email'],
                'avatar_url' => $req['photo_profil'],
                'request_message' => $req['request_message']
            ];
        }, $requests);

        sendJsonResponse(['requests' => $result]);

    } catch (PDOException $e) {
        sendJsonError('Erreur lors de la récupération des demandes: ' . $e->getMessage(), 500);
    }
}

/**
 * POST - Demander à rejoindre une tribu
 */
function handlePost($pdo, $user) {
    try {

        // Vérifier si l'utilisateur n'est pas déjà dans une tribu
        $stmt = $pdo->prepare("
            SELECT tribe_id FROM tribe_members
            WHERE user_id = ? AND is_validated = 1
        ");
        $stmt->execute([$user['id']]);
        if ($stmt->fetch()) {
            sendJsonError('Tu es déjà membre d\'une tribu', 400);
            return;
        }

        // Récupérer les données
        $input = json_decode(file_get_contents('php://input'), true);
        $tribeId = $input['tribe_id'] ?? null;
        $requestMessage = trim($input['request_message'] ?? '');

        if (!$tribeId) {
            sendJsonError('ID de la tribu manquant', 400);
            return;
        }

        if (empty($requestMessage)) {
            sendJsonError('Le message de demande est requis', 400);
            return;
        }

        // Vérifier que la tribu existe
        $stmt = $pdo->prepare("SELECT id, is_public FROM tribes WHERE id = ?");
        $stmt->execute([$tribeId]);
        $tribe = $stmt->fetch();

        if (!$tribe) {
            sendJsonError('Tribu introuvable', 404);
            return;
        }

        // Vérifier si l'utilisateur n'a pas déjà une demande en attente
        $stmt = $pdo->prepare("
            SELECT id FROM tribe_members
            WHERE tribe_id = ? AND user_id = ?
        ");
        $stmt->execute([$tribeId, $user['id']]);
        if ($stmt->fetch()) {
            sendJsonError('Tu as déjà une demande en attente pour cette tribu', 400);
            return;
        }

        // Créer la demande
        $stmt = $pdo->prepare("
            INSERT INTO tribe_members (tribe_id, user_id, role, is_validated, request_message)
            VALUES (?, ?, 'member', 0, ?)
        ");
        $stmt->execute([$tribeId, $user['id'], $requestMessage]);

        sendJsonResponse([
            'message' => 'Demande envoyée ! Le chef de tribu va l\'examiner.',
            'request_id' => (int)$pdo->lastInsertId()
        ], 201);

    } catch (PDOException $e) {
        sendJsonError('Erreur lors de l\'envoi de la demande: ' . $e->getMessage(), 500);
    }
}

/**
 * PUT - Accepter ou refuser une demande
 */
function handlePut($pdo, $user) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);

        $requestId = $input['request_id'] ?? null;
        $action = $input['action'] ?? null; // 'accept' or 'reject'

        if (!$requestId || !$action) {
            sendJsonError('Paramètres manquants', 400);
            return;
        }

        if (!in_array($action, ['accept', 'reject'])) {
            sendJsonError('Action invalide', 400);
            return;
        }

        // Récupérer la demande
        $stmt = $pdo->prepare("
            SELECT tm.*, t.owner_id
            FROM tribe_members tm
            JOIN tribes t ON tm.tribe_id = t.id
            WHERE tm.id = ?
        ");
        $stmt->execute([$requestId]);
        $request = $stmt->fetch();

        if (!$request) {
            sendJsonError('Demande introuvable', 404);
            return;
        }

        // Vérifier que l'utilisateur est un membre validé de la tribu
        $stmt = $pdo->prepare("
            SELECT id FROM tribe_members
            WHERE tribe_id = ? AND user_id = ? AND is_validated = 1
        ");
        $stmt->execute([$request['tribe_id'], $user['id']]);
        if (!$stmt->fetch()) {
            sendJsonError('Tu dois être membre de la tribu pour gérer les demandes', 403);
            return;
        }

        if ($action === 'accept') {
            // Accepter la demande
            $stmt = $pdo->prepare("
                UPDATE tribe_members
                SET is_validated = 1, joined_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([$requestId]);

            sendJsonResponse(['message' => 'Membre accepté dans la tribu !']);
        } else {
            // Refuser la demande (supprimer l'entrée)
            $stmt = $pdo->prepare("DELETE FROM tribe_members WHERE id = ?");
            $stmt->execute([$requestId]);

            sendJsonResponse(['message' => 'Demande refusée']);
        }

    } catch (PDOException $e) {
        sendJsonError('Erreur lors du traitement de la demande: ' . $e->getMessage(), 500);
    }
}

/**
 * DELETE - Quitter une tribu ou expulser un membre
 */
function handleDelete($pdo, $user) {
    try {
        $memberId = $_GET['member_id'] ?? null;

        if (!$memberId) {
            sendJsonError('ID du membre manquant', 400);
            return;
        }

        // Récupérer les informations du membre
        $stmt = $pdo->prepare("
            SELECT tm.*, t.owner_id
            FROM tribe_members tm
            JOIN tribes t ON tm.tribe_id = t.id
            WHERE tm.id = ?
        ");
        $stmt->execute([$memberId]);
        $member = $stmt->fetch();

        if (!$member) {
            sendJsonError('Membre introuvable', 404);
            return;
        }

        // Vérifier que c'est soit l'utilisateur lui-même, soit le owner
        $isSelf = $member['user_id'] == $user['id'];
        $isOwner = $member['owner_id'] == $user['id'];

        if (!$isSelf && !$isOwner) {
            sendJsonError('Tu ne peux pas retirer ce membre', 403);
            return;
        }

        // Empêcher le owner de se retirer lui-même
        if ($isSelf && $member['role'] === 'owner') {
            sendJsonError('Le propriétaire ne peut pas quitter sa tribu. Tu dois d\'abord la supprimer.', 400);
            return;
        }

        // Retirer le membre
        $stmt = $pdo->prepare("DELETE FROM tribe_members WHERE id = ?");
        $stmt->execute([$memberId]);

        sendJsonResponse([
            'message' => $isSelf ? 'Tu as quitté la tribu' : 'Membre expulsé de la tribu'
        ]);

    } catch (PDOException $e) {
        sendJsonError('Erreur lors du retrait du membre: ' . $e->getMessage(), 500);
    }
}
