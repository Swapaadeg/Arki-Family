<?php
/**
 * API REST pour gérer les tribus
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

// Vérifier l'authentification pour toutes les routes sauf GET (liste publique)
$user = null;
if ($method !== 'GET' || isset($_GET['my'])) {
    $user = requireAuth($pdo);
}

// Note: CSRF protection is not needed with JWT Bearer token authentication
// All modification operations require JWT authentication via requireAuth()
// JWT tokens in the Authorization header already provide protection against CSRF attacks

// Router selon la méthode HTTP
switch ($method) {
    case 'GET':
        handleGet($user);
        break;
    case 'POST':
        handlePost($user);
        break;
    case 'PUT':
        handlePut($user);
        break;
    case 'DELETE':
        handleDelete($user);
        break;
    default:
        sendJsonError('Méthode non autorisée', 405);
}

/**
 * GET - Récupérer les tribus
 */
function handleGet($user) {
    try {
        $pdo = getDbConnection();

        // Si ?pending_count est présent, compter les demandes en attente (admin uniquement)
        if (isset($_GET['pending_count']) && $user && $user['is_admin']) {
            $stmt = $pdo->query("
                SELECT COUNT(*) as count
                FROM tribe_members
                WHERE is_validated = 0
            ");
            $result = $stmt->fetch();
            sendJsonResponse(['count' => (int)$result['count']]);
            return;
        }

        // ?mine → liste de toutes les tribus de l'utilisateur
        if (isset($_GET['mine']) && $user) {
            $stmt = $pdo->prepare("
                SELECT t.id, t.name, t.slug, t.logo_url, tm.role
                FROM tribe_members tm
                JOIN tribes t ON tm.tribe_id = t.id
                WHERE tm.user_id = ? AND tm.is_validated = 1
                ORDER BY tm.role DESC, tm.joined_at ASC
            ");
            $stmt->execute([$user['id']]);
            $tribes = $stmt->fetchAll();
            sendJsonResponse(['tribes' => array_map(function($t) {
                return [
                    'id'       => (int)$t['id'],
                    'name'     => $t['name'],
                    'slug'     => $t['slug'],
                    'logo_url' => getFullUrl($t['logo_url']),
                    'role'     => $t['role'],
                ];
            }, $tribes)]);
            return;
        }

        // Si ?my est présent, récupérer la tribu de l'utilisateur
        if (isset($_GET['my']) && $user) {
            $tribeIdFilter = isset($_GET['tribe_id']) ? (int)$_GET['tribe_id'] : null;
            if ($tribeIdFilter) {
                $stmt = $pdo->prepare("
                    SELECT t.*, tm.role, tm.is_validated
                    FROM tribe_members tm
                    JOIN tribes t ON tm.tribe_id = t.id
                    WHERE tm.user_id = ? AND tm.tribe_id = ? AND tm.is_validated = 1
                ");
                $stmt->execute([$user['id'], $tribeIdFilter]);
            } else {
                $stmt = $pdo->prepare("
                    SELECT t.*, tm.role, tm.is_validated
                    FROM tribe_members tm
                    JOIN tribes t ON tm.tribe_id = t.id
                    WHERE tm.user_id = ? AND tm.is_validated = 1
                    LIMIT 1
                ");
                $stmt->execute([$user['id']]);
            }
            $tribe = $stmt->fetch();

            if (!$tribe) {
                sendJsonResponse(['tribe' => null, 'message' => 'Aucune tribu']);
                return;
            }

            // Récupérer les membres
            $stmt = $pdo->prepare("
                SELECT u.id, u.username, u.email, u.photo_profil, tm.id as member_id, tm.role, tm.joined_at
                FROM tribe_members tm
                JOIN users u ON tm.user_id = u.id
                WHERE tm.tribe_id = ? AND tm.is_validated = 1
                ORDER BY tm.role DESC, tm.joined_at ASC
            ");
            $stmt->execute([$tribe['id']]);
            $members_raw = $stmt->fetchAll();

            // Mapper les champs pour le frontend
            $members = array_map(function($m) {
                return [
                    'id' => (int)$m['member_id'],
                    'user_id' => (int)$m['id'],
                    'username' => $m['username'],
                    'email' => $m['email'],
                    'avatar_url' => $m['photo_profil'],
                    'role' => $m['role'],
                    'joined_at' => $m['joined_at']
                ];
            }, $members_raw);

            sendJsonResponse([
                'tribe' => [
                    'id' => (int)$tribe['id'],
                    'name' => $tribe['name'],
                    'slug' => $tribe['slug'],
                    'description' => $tribe['description'],
                    'owner_id' => (int)$tribe['owner_id'],
                    'base_photo_url' => $tribe['base_photo_url'],
                    'banner_url' => getFullUrl($tribe['banner_url']),
                    'logo_url' => getFullUrl($tribe['logo_url']),
                    'primary_color' => $tribe['primary_color'] ?? '#00f0ff',
                    'secondary_color' => $tribe['secondary_color'] ?? '#b842ff',
                    'font_family' => $tribe['font_family'] ?? '"Orbitron", sans-serif',
                    'title_font_family' => $tribe['title_font_family'] ?? '"Orbitron", sans-serif',
                    'is_public' => (bool)$tribe['is_public'],
                    'created_at' => $tribe['created_at'],
                    'user_role' => $tribe['role'],
                    'current_user_id' => (int)$user['id']
                ],
                'members' => $members
            ]);
            return;
        }

        // Sinon, liste de toutes les tribus publiques
        $stmt = $pdo->query("
            SELECT t.*, u.username as owner_username,
                   (SELECT COUNT(*) FROM tribe_members WHERE tribe_id = t.id AND is_validated = 1) as member_count
            FROM tribes t
            JOIN users u ON t.owner_id = u.id
            WHERE t.is_public = 1 AND t.is_validated = 1
            ORDER BY t.created_at DESC
        ");
        $tribes = $stmt->fetchAll();

        $result = array_map(function($tribe) {
            return [
                'id' => (int)$tribe['id'],
                'name' => $tribe['name'],
                'slug' => $tribe['slug'],
                'description' => $tribe['description'],
                'owner_username' => $tribe['owner_username'],
                'base_photo_url' => $tribe['base_photo_url'],
                'banner_url' => getFullUrl($tribe['banner_url']),
                'logo_url' => getFullUrl($tribe['logo_url']),
                'primary_color' => $tribe['primary_color'] ?? '#00f0ff',
                'secondary_color' => $tribe['secondary_color'] ?? '#b842ff',
                'member_count' => (int)$tribe['member_count'],
                'created_at' => $tribe['created_at']
            ];
        }, $tribes);

        sendJsonResponse(['tribes' => $result]);

    } catch (PDOException $e) {
        sendJsonError('Erreur lors de la récupération des tribus: ' . $e->getMessage(), 500);
    }
}

/**
 * POST - Créer une nouvelle tribu
 */
function handlePost($user) {
    try {
        $pdo = getDbConnection();

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
        $name = trim($input['name'] ?? '');
        $description = trim($input['description'] ?? '');
        $is_public = isset($input['is_public']) ? (int)$input['is_public'] : 1;

        // Validation
        if (empty($name)) {
            sendJsonError('Le nom de la tribu est requis', 400);
            return;
        }

        if (strlen($name) < 3 || strlen($name) > 100) {
            sendJsonError('Le nom doit contenir entre 3 et 100 caractères', 400);
            return;
        }

        // Créer le slug
        $slug = createSlug($name);

        // Vérifier que le slug n'existe pas déjà
        $stmt = $pdo->prepare("SELECT id FROM tribes WHERE slug = ?");
        $stmt->execute([$slug]);
        if ($stmt->fetch()) {
            sendJsonError('Ce nom de tribu est déjà pris', 400);
            return;
        }

        // Créer la tribu (nécessite validation admin)
        $stmt = $pdo->prepare("
            INSERT INTO tribes (name, slug, description, owner_id, is_public, is_validated)
            VALUES (?, ?, ?, ?, ?, 0)
        ");
        $stmt->execute([$name, $slug, $description, $user['id'], $is_public]);
        $tribeId = $pdo->lastInsertId();

        // Ajouter le créateur comme owner dans tribe_members
        $stmt = $pdo->prepare("
            INSERT INTO tribe_members (tribe_id, user_id, role, is_validated, joined_at)
            VALUES (?, ?, 'owner', 1, NOW())
        ");
        $stmt->execute([$tribeId, $user['id']]);

        // Logger la création de la tribu
        require_once __DIR__ . '/utils/admin-logger.php';
        logAdminActivity([
            'admin_id' => null, // Pas un admin, c'est l'utilisateur
            'action_type' => 'tribe_created',
            'entity_type' => 'tribe',
            'entity_id' => $tribeId,
            'details' => [
                'tribe_name' => $name,
                'user_id' => $user['id'],
                'username' => $user['username'],
                'status' => 'pending_validation'
            ]
        ]);

        sendJsonResponse([
            'id' => (int)$tribeId,
            'name' => $name,
            'slug' => $slug,
            'status' => 'pending_validation',
            'message' => 'Tribu créée avec succès ! Elle sera visible après validation par un administrateur.'
        ], 201);

    } catch (PDOException $e) {
        sendJsonError('Erreur lors de la création de la tribu: ' . $e->getMessage(), 500);
    }
}

/**
 * PUT - Mettre à jour une tribu
 */
function handlePut($user) {
    try {
        $pdo = getDbConnection();
        $input = json_decode(file_get_contents('php://input'), true);

        $tribeId = $input['id'] ?? null;
        if (!$tribeId) {
            sendJsonError('ID de la tribu manquant', 400);
            return;
        }

        // Vérifier que l'utilisateur est owner
        $stmt = $pdo->prepare("
            SELECT role FROM tribe_members
            WHERE tribe_id = ? AND user_id = ? AND is_validated = 1
        ");
        $stmt->execute([$tribeId, $user['id']]);
        $member = $stmt->fetch();

        if (!$member) {
            sendJsonError('Tu dois être membre de la tribu pour la modifier', 403);
            return;
        }

        // Construire la requête de mise à jour
        $updates = [];
        $params = [];

        if (isset($input['name'])) {
            $name = trim($input['name']);
            if (strlen($name) < 3 || strlen($name) > 100) {
                sendJsonError('Le nom doit contenir entre 3 et 100 caractères', 400);
                return;
            }
            $updates[] = "name = ?";
            $params[] = $name;
            $updates[] = "slug = ?";
            $params[] = createSlug($name);
        }

        if (isset($input['description'])) {
            $updates[] = "description = ?";
            $params[] = trim($input['description']);
        }

        if (isset($input['is_public'])) {
            $updates[] = "is_public = ?";
            $params[] = (int)$input['is_public'];
        }

        if (isset($input['banner_url'])) {
            $updates[] = "banner_url = ?";
            $params[] = $input['banner_url'];
        }

        if (isset($input['logo_url'])) {
            $updates[] = "logo_url = ?";
            $params[] = $input['logo_url'];
        }

        if (isset($input['primary_color'])) {
            $color = trim($input['primary_color']);
            if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
                sendJsonError('Couleur primaire invalide (format: #RRGGBB)', 400);
                return;
            }
            $updates[] = "primary_color = ?";
            $params[] = $color;
        }

        if (isset($input['secondary_color'])) {
            $color = trim($input['secondary_color']);
            if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
                sendJsonError('Couleur secondaire invalide (format: #RRGGBB)', 400);
                return;
            }
            $updates[] = "secondary_color = ?";
            $params[] = $color;
        }

        if (isset($input['font_family'])) {
            $font = trim($input['font_family']);
            if (strlen($font) > 100) {
                sendJsonError('Police de caractères trop longue (max 100 caractères)', 400);
                return;
            }
            $updates[] = "font_family = ?";
            $params[] = $font;
        }

        if (isset($input['title_font_family'])) {
            $font = trim($input['title_font_family']);
            if (strlen($font) > 100) {
                sendJsonError('Police de caractères des titres trop longue (max 100 caractères)', 400);
                return;
            }
            $updates[] = "title_font_family = ?";
            $params[] = $font;
        }

        if (empty($updates)) {
            sendJsonError('Aucune donnée à mettre à jour', 400);
            return;
        }

        $params[] = $tribeId;
        $sql = "UPDATE tribes SET " . implode(', ', $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        sendJsonResponse(['message' => 'Tribu mise à jour avec succès']);

    } catch (PDOException $e) {
        sendJsonError('Erreur lors de la mise à jour: ' . $e->getMessage(), 500);
    }
}

/**
 * DELETE - Supprimer une tribu
 */
function handleDelete($user) {
    try {
        $pdo = getDbConnection();
        $tribeId = $_GET['id'] ?? null;

        if (!$tribeId) {
            sendJsonError('ID de la tribu manquant', 400);
            return;
        }

        // Vérifier que l'utilisateur est owner
        $stmt = $pdo->prepare("
            SELECT role FROM tribe_members
            WHERE tribe_id = ? AND user_id = ? AND is_validated = 1
        ");
        $stmt->execute([$tribeId, $user['id']]);
        $member = $stmt->fetch();

        if (!$member) {
            sendJsonError('Tu dois être membre de la tribu pour la supprimer', 403);
            return;
        }

        // Supprimer la tribu (cascade va supprimer members et dinos)
        $stmt = $pdo->prepare("DELETE FROM tribes WHERE id = ?");
        $stmt->execute([$tribeId]);

        sendJsonResponse(['message' => 'Tribu supprimée avec succès']);

    } catch (PDOException $e) {
        sendJsonError('Erreur lors de la suppression: ' . $e->getMessage(), 500);
    }
}

/**
 * Créer un slug à partir d'un nom
 */
function createSlug($text) {
    // Convertir en minuscules
    $text = strtolower($text);
    // Remplacer les caractères accentués
    $text = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);
    // Remplacer les caractères non alphanumériques par des tirets
    $text = preg_replace('/[^a-z0-9]+/', '-', $text);
    // Supprimer les tirets en début et fin
    $text = trim($text, '-');
    return $text;
}
