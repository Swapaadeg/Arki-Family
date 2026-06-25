<?php
/**
 * API REST pour gérer les dinosaures
 * Endpoints: GET, POST, PUT, DELETE
 */

require_once 'config.php';
require_once 'middleware/auth.php';
require_once 'utils/security.php';
require_once 'utils/xss.php';

// LOG IMMÉDIAT au démarrage du script
error_log("=== DINOSAURS.PHP CALLED ===");
error_log("METHOD: " . $_SERVER['REQUEST_METHOD']);
error_log("URL: " . $_SERVER['REQUEST_URI']);
error_log("AUTH HEADER: " . ($_SERVER['HTTP_AUTHORIZATION'] ?? 'MISSING'));
error_log("CONTENT_TYPE: " . ($_SERVER['CONTENT_TYPE'] ?? 'NONE'));

// Récupérer la méthode HTTP
$method = $_SERVER['REQUEST_METHOD'];

// Récupérer la connexion à la base de données
$pdo = getDbConnection();

// Vérifier l'authentification (JWT)
error_log("About to call requireAuth...");
$user = requireAuth($pdo);
error_log("After requireAuth. User: " . ($user ? json_encode($user) : 'NULL'));
if (!$user) {
    error_log("Authentication failed, exiting");
    exit;
}

// Note: CSRF protection is not needed with JWT Bearer token authentication
// The JWT in the Authorization header already provides protection against CSRF attacks

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
    case 'PATCH':
        handlePatch($pdo, $user);
        break;
    default:
        sendJsonError('Méthode non autorisée', 405);
}

/**
 * GET - Récupérer tous les dinosaures
 */
function handleGet($pdo, $user) {
    try {
        // Si ?featured est présent, retourner uniquement les dinos featured d'une tribu (accès public)
        if (isset($_GET['tribe_id']) && isset($_GET['featured'])) {
            $tribeId = (int)$_GET['tribe_id'];
            $stmt = $pdo->prepare('SELECT d.*, au.username as assigned_username
                FROM dinosaurs d
                LEFT JOIN users au ON d.assigned_user_id = au.id
                WHERE d.tribe_id = ? AND d.is_featured = 1
                ORDER BY d.updated_at DESC');
            $stmt->execute([$tribeId]);
            $dinosaurs = $stmt->fetchAll();
        }
        // Si ?recent est présent, retourner les 3 derniers modifiés
        else if (isset($_GET['recent']) && isset($_GET['tribe_id'])) {
            $tribeId = (int)$_GET['tribe_id'];
            $stmt = $pdo->prepare('SELECT d.*, au.username as assigned_username
                FROM dinosaurs d
                LEFT JOIN users au ON d.assigned_user_id = au.id
                WHERE d.tribe_id = ?
                ORDER BY d.updated_at DESC
                LIMIT 3');
            $stmt->execute([$tribeId]);
            $dinosaurs = $stmt->fetchAll();
        } else {
            $tribeIdFilter = isset($_GET['tribe_id']) ? (int)$_GET['tribe_id'] : null;

            if ($tribeIdFilter) {
                // Vérifier que l'utilisateur est membre de cette tribu
                $stmt = $pdo->prepare("
                    SELECT t.id
                    FROM tribes t
                    JOIN tribe_members tm ON t.id = tm.tribe_id
                    WHERE t.id = ? AND tm.user_id = ? AND tm.is_validated = 1
                ");
                $stmt->execute([$tribeIdFilter, $user['id']]);
            } else {
                // Fallback : première tribu de l'utilisateur
                $stmt = $pdo->prepare("
                    SELECT t.id
                    FROM tribes t
                    JOIN tribe_members tm ON t.id = tm.tribe_id
                    WHERE tm.user_id = ? AND tm.is_validated = 1
                    LIMIT 1
                ");
                $stmt->execute([$user['id']]);
            }

            $tribe = $stmt->fetch();

            if (!$tribe) {
                sendJsonResponse([]);
                return;
            }

            $stmt = $pdo->prepare('SELECT d.*, au.username as assigned_username
                FROM dinosaurs d
                LEFT JOIN users au ON d.assigned_user_id = au.id
                WHERE d.tribe_id = ?
                ORDER BY d.created_at DESC');
            $stmt->execute([$tribe['id']]);
            $dinosaurs = $stmt->fetchAll();
        }

        // Transformer les données pour le format attendu par React
        $result = array_map('mapDinosaurRow', $dinosaurs);

        sendJsonResponse($result);
    } catch (PDOException $e) {
        sendJsonError('Erreur lors de la récupération des dinosaures: ' . $e->getMessage(), 500);
    }
}

/**
 * POST - Ajouter un dinosaure OU mettre à jour avec image (si ?id= présent)
 */
function handlePost($pdo, $user) {
    // Si un ID est fourni en query string, on fait un UPDATE (upload d'image)
    if (isset($_GET['id']) && !empty($_GET['id'])) {
        error_log("POST with ID - routing to handlePut for image upload");
        return handlePut($pdo, $user);
    }
    
    // Sinon, c'est un ajout classique
    try {
        // Récupérer la tribu de l'utilisateur
        $stmt = $pdo->prepare("
            SELECT t.id
            FROM tribes t
            JOIN tribe_members tm ON t.id = tm.tribe_id
            WHERE tm.user_id = ? AND tm.is_validated = 1
            LIMIT 1
        ");
        $stmt->execute([$user['id']]);
        $tribe = $stmt->fetch();

        if (!$tribe) {
            sendJsonError('Vous devez être membre d\'une tribu pour ajouter un dinosaure', 403);
            return;
        }

        $tribeId = $tribe['id'];

        // Récupérer les données du formulaire
        $species = $_POST['species'] ?? '';
        $typeIds = $_POST['typeIds'] ?? '[]';
        $isMutated = isset($_POST['isMutated']) ? (int)$_POST['isMutated'] : 0;

        // Validation et nettoyage XSS
        if (detectXssPatterns($species)) {
            logXssAttempt($species, 'dinosaurs.php - species');
            sendJsonError('Le nom de l\'espèce contient des caractères non autorisés', 400);
        }
        
        // Nettoyer le nom d'espèce
        $species = sanitizeText($species, 100);
        
        if (empty($species)) {
            sendJsonError('Le nom de l\'espèce est requis', 400);
        }

        // Gérer l'upload de fichier
        $photoUrl = null;
        if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
            $photoUrl = uploadPhoto($_FILES['photo'], $_POST['species']);
        }

        // Stats de base
        $stats = json_decode($_POST['stats'] ?? '{}', true);
        $mutatedStats = json_decode($_POST['mutatedStats'] ?? '{}', true);

        // Préparer la requête d'insertion
        $sql = "INSERT INTO dinosaurs (
            tribe_id, species, type_ids, is_mutated, photo_url, created_by,
            stat_health, stat_stamina, stat_oxygen, stat_food, stat_weight, stat_damage, stat_crafting,
            mutated_stat_health, mutated_stat_stamina, mutated_stat_oxygen, mutated_stat_food,
            mutated_stat_weight, mutated_stat_damage, mutated_stat_crafting
        ) VALUES (
            :tribe_id, :species, :type_ids, :is_mutated, :photo_url, :created_by,
            :stat_health, :stat_stamina, :stat_oxygen, :stat_food, :stat_weight, :stat_damage, :stat_crafting,
            :mutated_stat_health, :mutated_stat_stamina, :mutated_stat_oxygen, :mutated_stat_food,
            :mutated_stat_weight, :mutated_stat_damage, :mutated_stat_crafting
        )";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':tribe_id' => $tribeId,
            ':species' => $species,
            ':type_ids' => $typeIds,
            ':is_mutated' => $isMutated,
            ':photo_url' => $photoUrl,
            ':created_by' => $user['id'],
            ':stat_health' => $stats['health'] ?? 0,
            ':stat_stamina' => $stats['stamina'] ?? 0,
            ':stat_oxygen' => $stats['oxygen'] ?? 0,
            ':stat_food' => $stats['food'] ?? 0,
            ':stat_weight' => $stats['weight'] ?? 0,
            ':stat_damage' => $stats['damage'] ?? 0,
            ':stat_crafting' => $stats['crafting'] ?? 0,
            ':mutated_stat_health' => $mutatedStats['health'] ?? 0,
            ':mutated_stat_stamina' => $mutatedStats['stamina'] ?? 0,
            ':mutated_stat_oxygen' => $mutatedStats['oxygen'] ?? 0,
            ':mutated_stat_food' => $mutatedStats['food'] ?? 0,
            ':mutated_stat_weight' => $mutatedStats['weight'] ?? 0,
            ':mutated_stat_damage' => $mutatedStats['damage'] ?? 0,
            ':mutated_stat_crafting' => $mutatedStats['crafting'] ?? 0
        ]);

        $newId = $pdo->lastInsertId();

        // Récupérer le dinosaure créé
        $stmt = $pdo->prepare('SELECT * FROM dinosaurs WHERE id = ?');
        $stmt->execute([$newId]);
        $dino = $stmt->fetch();

        sendJsonResponse([
            'id' => (int)$dino['id'],
            'species' => $dino['species'],
            'typeIds' => json_decode($dino['type_ids']),
            'isMutated' => (bool)$dino['is_mutated'],
            'photoUrl' => $dino['photo_url'],
            'message' => 'Dinosaure ajouté avec succès'
        ], 201);

    } catch (PDOException $e) {
        sendJsonError('Erreur lors de l\'ajout du dinosaure: ' . $e->getMessage(), 500);
    }
}

/**
 * PUT - Mettre à jour un dinosaure
 */
function handlePut($pdo, $user) {
    try {
        error_log("DEBUG: handlePut called for dino update");
        error_log("DEBUG: METHOD = " . $_SERVER['REQUEST_METHOD']);
        error_log("DEBUG: GET id = " . ($_GET['id'] ?? 'NULL'));
        error_log("DEBUG: user = " . json_encode($user));
    } catch (Exception $e) {
        sendJsonError('Error in debug logging: ' . $e->getMessage(), 500);
        return;
    }
    
    try {
        // Récupérer l'ID depuis les paramètres GET
        $id = $_GET['id'] ?? null;

        if (!$id) {
            sendJsonError('ID du dinosaure manquant', 400);
        }

        // ✅ VÉRIFICATION DE PERMISSION: Vérifier que le dinosaure appartient à la tribu de l'utilisateur
        $stmt = $pdo->prepare("
            SELECT d.*
            FROM dinosaurs d
            JOIN tribe_members tm ON d.tribe_id = tm.tribe_id
            WHERE d.id = ? AND tm.user_id = ? AND tm.is_validated = 1
        ");
        $stmt->execute([$id, $user['id']]);
        $dino = $stmt->fetch();

        if (!$dino) {
            sendJsonError('Dinosaure introuvable ou vous n\'avez pas la permission de le modifier', 403);
        }

        // Détecter si c'est du FormData (avec image) ou du JSON
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        $isFormData = strpos($contentType, 'multipart/form-data') !== false;

        if ($isFormData) {
            // Lire depuis $_POST pour FormData
            $input = $_POST;
            // Décoder les objets JSON envoyés dans FormData
            if (isset($input['stats']) && is_string($input['stats'])) {
                $input['stats'] = json_decode($input['stats'], true);
            }
            if (isset($input['mutatedStats']) && is_string($input['mutatedStats'])) {
                $input['mutatedStats'] = json_decode($input['mutatedStats'], true);
            }
        } else {
            // Lire depuis php://input pour JSON
            $input = json_decode(file_get_contents('php://input'), true);
        }

        // IMPORTANT: Récupérer les valeurs actuelles AVANT l'UPDATE pour créer les tâches
        $oldStats = null;
        if (isset($input['stats']) || isset($input['mutatedStats'])) {
            $stmt = $pdo->prepare('SELECT
                tribe_id,
                stat_health, stat_stamina, stat_oxygen, stat_food, stat_weight, stat_damage, stat_crafting,
                mutated_stat_health, mutated_stat_stamina, mutated_stat_oxygen, mutated_stat_food,
                mutated_stat_weight, mutated_stat_damage, mutated_stat_crafting
                FROM dinosaurs WHERE id = ?');
            $stmt->execute([$id]);
            $oldStats = $stmt->fetch();
        }

        $updates = [];
        $params = [':id' => $id];

        // Construire la requête de mise à jour dynamiquement
        if (isset($input['stats'])) {
            foreach ($input['stats'] as $statKey => $statValue) {
                $column = 'stat_' . $statKey;
                $updates[] = "$column = :$column";
                $params[":$column"] = $statValue;
            }
        }

        if (isset($input['mutatedStats'])) {
            foreach ($input['mutatedStats'] as $statKey => $statValue) {
                $column = 'mutated_stat_' . $statKey;
                $updates[] = "$column = :$column";
                $params[":$column"] = $statValue;
            }
        }

        // Gérer le toggle featured
        if (isset($input['is_featured'])) {
            $updates[] = "is_featured = :is_featured";
            $params[":is_featured"] = (int)$input['is_featured'];
        }

        // Gérer le toggle mutation
        if (isset($input['isMutated'])) {
            $updates[] = "is_mutated = :is_mutated";
            $params[":is_mutated"] = (int)$input['isMutated'];
        }

        // Gérer l'assignation de membre
        if (array_key_exists('assigned_user_id', $input)) {
            $assignedUserId = $input['assigned_user_id'];

            if ($assignedUserId !== null) {
                // Log pour debug dans un fichier accessible
                $debugLog = __DIR__ . '/debug_assignment.log';
                $debugMsg = date('Y-m-d H:i:s') . " - Checking assignment:\n";
                $debugMsg .= "  - Dino ID: {$dino['id']}\n";
                $debugMsg .= "  - Dino tribe_id: {$dino['tribe_id']}\n";
                $debugMsg .= "  - Assigned user_id: {$assignedUserId}\n";

                // Vérifier que l'utilisateur assigné appartient à la même tribu
                $stmt = $pdo->prepare("SELECT user_id, tribe_id, is_validated FROM tribe_members WHERE tribe_id = ? AND user_id = ? AND is_validated = 1");
                $stmt->execute([$dino['tribe_id'], $assignedUserId]);
                $member = $stmt->fetch();

                $debugMsg .= "  - Member found: " . ($member ? json_encode($member) : 'NULL') . "\n";
                $debugMsg .= "  - Query params: tribe_id={$dino['tribe_id']}, user_id={$assignedUserId}\n";

                // Vérifier tous les membres de la tribu pour debug
                $stmt2 = $pdo->prepare("SELECT user_id, tribe_id, is_validated FROM tribe_members WHERE tribe_id = ?");
                $stmt2->execute([$dino['tribe_id']]);
                $allMembers = $stmt2->fetchAll();
                $debugMsg .= "  - All tribe members: " . json_encode($allMembers) . "\n\n";

                file_put_contents($debugLog, $debugMsg, FILE_APPEND);

                if (!$member) {
                    sendJsonError('Impossible d\'assigner un membre en dehors de la tribu', 403);
                }
            }

            $updates[] = "assigned_user_id = :assigned_user_id";
            $params[":assigned_user_id"] = $assignedUserId !== null ? (int)$assignedUserId : null;
        }

        // Gérer l'upload d'une nouvelle image si présente
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            // Supprimer l'ancienne image si elle existe
            if (!empty($dino['photo_url'])) {
                $oldImagePath = __DIR__ . $dino['photo_url'];
                if (file_exists($oldImagePath)) {
                    unlink($oldImagePath);
                }
            }

            // Uploader la nouvelle image
            $uploadDir = __DIR__ . "/uploads/tribes/{$dino['tribe_id']}/";
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            $fileExtension = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
            $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            
            if (!in_array($fileExtension, $allowedExtensions)) {
                sendJsonError('Format d\'image non autorisé', 400);
            }

            $fileName = 'dino_' . $id . '_' . time() . '.' . $fileExtension;
            $filePath = $uploadDir . $fileName;

            if (move_uploaded_file($_FILES['image']['tmp_name'], $filePath)) {
                $photoUrl = "/uploads/tribes/{$dino['tribe_id']}/{$fileName}";
                $updates[] = "photo_url = :photo_url";
                $params[":photo_url"] = $photoUrl;
            }
        }
        
        // Debug: log ce qui a été reçu
        error_log("DEBUG dinosaur PUT - FormData: " . ($isFormData ? 'oui' : 'non'));
        error_log("DEBUG dinosaur PUT - FILES: " . json_encode($_FILES));
        error_log("DEBUG dinosaur PUT - POST: " . json_encode($_POST));
        error_log("DEBUG dinosaur PUT - updates count: " . count($updates));

        if (empty($updates)) {
            // Vérifier s'il y a au moins une image à uploader
            if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
                sendJsonError('Aucune donnée à mettre à jour', 400);
            }
        }

        $sql = "UPDATE dinosaurs SET " . implode(', ', $updates) . " WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        // Créer des tâches pour les changements de stats (avec les anciennes valeurs récupérées avant)
        // Isolé dans un try/catch pour ne pas faire échouer l'UPDATE si la création de tâches échoue
        if ($oldStats && (isset($input['stats']) || isset($input['mutatedStats']))) {
            try {
                createTasksForStatChanges($pdo, $id, $user['id'], $input, $oldStats);
            } catch (Exception $e) {
                error_log("Erreur lors de la création des tâches: " . $e->getMessage());
                // On continue quand même, l'UPDATE a réussi
            }
        }

        // Récupérer le dinosaure à jour pour le front
        $stmt = $pdo->prepare('SELECT d.*, au.username as assigned_username
            FROM dinosaurs d
            LEFT JOIN users au ON d.assigned_user_id = au.id
            WHERE d.id = ?');
        $stmt->execute([$id]);
        $updatedDino = $stmt->fetch();

        sendJsonResponse([
            'message' => 'Dinosaure mis à jour avec succès',
            'dinosaur' => $updatedDino ? mapDinosaurRow($updatedDino) : null
        ]);

    } catch (PDOException $e) {
        sendJsonError('Erreur DB lors de la mise à jour: ' . $e->getMessage() . ' | File: ' . $e->getFile() . ' | Line: ' . $e->getLine(), 500);
    } catch (Exception $e) {
        sendJsonError('Erreur lors de la mise à jour: ' . $e->getMessage() . ' | File: ' . $e->getFile() . ' | Line: ' . $e->getLine(), 500);
    }
}

/**
 * DELETE - Supprimer un dinosaure
 */
function handleDelete($pdo, $user) {
    try {
        // Récupérer l'ID depuis les paramètres GET
        $id = $_GET['id'] ?? null;

        if (!$id) {
            sendJsonError('ID du dinosaure manquant', 400);
        }

        // ✅ VÉRIFICATION DE PERMISSION: Vérifier que le dinosaure appartient à la tribu de l'utilisateur
        $stmt = $pdo->prepare("
            SELECT d.*
            FROM dinosaurs d
            JOIN tribe_members tm ON d.tribe_id = tm.tribe_id
            WHERE d.id = ? AND tm.user_id = ? AND tm.is_validated = 1
        ");
        $stmt->execute([$id, $user['id']]);
        $dino = $stmt->fetch();

        if (!$dino) {
            sendJsonError('Dinosaure introuvable ou vous n\'avez pas la permission de le supprimer', 403);
        }

        // Supprimer la photo si elle existe
        if ($dino && $dino['photo_url']) {
            deletePhoto($dino['photo_url']);
        }

        // Supprimer le dinosaure
        $stmt = $pdo->prepare('DELETE FROM dinosaurs WHERE id = ?');
        $stmt->execute([$id]);

        sendJsonResponse(['message' => 'Dinosaure supprimé avec succès']);

    } catch (PDOException $e) {
        sendJsonError('Erreur lors de la suppression: ' . $e->getMessage(), 500);
    }
}

/**
 * PATCH - Toggle le statut "featured" d'un dinosaure
 */
function handlePatch($pdo, $user) {
    try {
        // Récupérer l'ID depuis les paramètres GET
        $id = $_GET['id'] ?? null;

        if (!$id) {
            sendJsonError('ID du dinosaure manquant', 400);
        }

        // Vérifier que le dinosaure existe et appartient à la tribu de l'utilisateur
        $stmt = $pdo->prepare("
            SELECT d.*
            FROM dinosaurs d
            JOIN tribe_members tm ON d.tribe_id = tm.tribe_id
            WHERE d.id = ? AND tm.user_id = ? AND tm.is_validated = 1
        ");
        $stmt->execute([$id, $user['id']]);
        $dinosaur = $stmt->fetch();

        if (!$dinosaur) {
            sendJsonError('Dinosaure introuvable ou vous n\'avez pas la permission de le modifier', 403);
        }

        // Récupérer les données JSON
        $input = json_decode(file_get_contents('php://input'), true);

        // Toggle le statut featured
        if (isset($input['is_featured'])) {
            $stmt = $pdo->prepare("UPDATE dinosaurs SET is_featured = ? WHERE id = ?");
            $stmt->execute([(int)$input['is_featured'], $id]);

            sendJsonResponse([
                'message' => 'Statut featured mis à jour avec succès',
                'is_featured' => (bool)$input['is_featured']
            ]);
        } else {
            sendJsonError('Paramètre is_featured manquant', 400);
        }

    } catch (PDOException $e) {
        sendJsonError('Erreur lors de la mise à jour: ' . $e->getMessage(), 500);
    }
}

/**
 * Upload d'une photo
 */
function uploadPhoto($file, $species) {
    $uploadDir = __DIR__ . '/uploads/';

    // Créer le dossier uploads s'il n'existe pas
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // Vérifier le type de fichier
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!in_array($file['type'], $allowedTypes)) {
        sendJsonError('Type de fichier non autorisé. Utilisez JPG, PNG, GIF ou WEBP.', 400);
    }

    // Vérifier la taille (max 5MB)
    if ($file['size'] > 5 * 1024 * 1024) {
        sendJsonError('Fichier trop volumineux. Maximum 5MB.', 400);
    }

    // Générer un nom de fichier unique
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $fileName = preg_replace('/[^a-zA-Z0-9]/', '-', $species) . '-' . time() . '.' . $extension;
    $filePath = $uploadDir . $fileName;

    // Déplacer le fichier uploadé
    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        sendJsonError('Erreur lors de l\'upload de la photo', 500);
    }

    // Retourner l'URL relative
    return '/uploads/' . $fileName;
}

/**
 * Supprimer une photo
 */
function deletePhoto($photoUrl) {
    if (empty($photoUrl)) {
        return;
    }

    // Extraire le nom du fichier de l'URL
    $fileName = basename($photoUrl);
    $filePath = __DIR__ . '/uploads/' . $fileName;

    if (file_exists($filePath)) {
        unlink($filePath);
    }
}

/**
 * Crée des tâches pour chaque stat modifiée
 */
function createTasksForStatChanges($pdo, $dinoId, $userId, $input, $oldStats) {
    if (!$oldStats || !$oldStats['tribe_id']) {
        return; // Pas de tribu = pas de tâches
    }

    $tribeId = $oldStats['tribe_id'];

    // Stats de base - Crée une tâche pour chaque modification
    if (isset($input['stats'])) {
        foreach ($input['stats'] as $statKey => $newValue) {
            $oldValue = $oldStats['stat_' . $statKey];
            if ($oldValue != $newValue) {
                createTask($pdo, $tribeId, $dinoId, $userId, $statKey, 'base', $oldValue, $newValue);
            }
        }
    }

    // Stats mutées - Pas de tâche créée pour les mutations
    // (Les mutations ne génèrent pas de tâches dans le système)
}

/**
 * Créer une tâche individuelle
 */
function createTask($pdo, $tribeId, $dinoId, $userId, $statName, $statType, $oldValue, $newValue) {
    $stmt = $pdo->prepare('INSERT INTO dino_tasks
        (tribe_id, dino_id, created_by, stat_name, stat_type, old_value, new_value)
        VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$tribeId, $dinoId, $userId, $statName, $statType, $oldValue, $newValue]);
}

/**
 * Transforme une ligne SQL de dinosaure en payload API
 */
function mapDinosaurRow($dino) {
    return [
        'id' => (int)$dino['id'],
        'species' => $dino['species'],
        'typeIds' => json_decode($dino['type_ids']),
        'isMutated' => (bool)$dino['is_mutated'],
        'isFeatured' => (bool)$dino['is_featured'],
        'photoUrl' => $dino['photo_url'],
        'assignedUser' => $dino['assigned_user_id'] ? [
            'id' => (int)$dino['assigned_user_id'],
            'username' => $dino['assigned_username']
        ] : null,
        'stats' => [
            'health' => (int)$dino['stat_health'],
            'stamina' => (int)$dino['stat_stamina'],
            'oxygen' => (int)$dino['stat_oxygen'],
            'food' => (int)$dino['stat_food'],
            'weight' => (int)$dino['stat_weight'],
            'damage' => (int)$dino['stat_damage'],
            'crafting' => (int)$dino['stat_crafting']
        ],
        'mutatedStats' => [
            'health' => (int)$dino['mutated_stat_health'],
            'stamina' => (int)$dino['mutated_stat_stamina'],
            'oxygen' => (int)$dino['mutated_stat_oxygen'],
            'food' => (int)$dino['mutated_stat_food'],
            'weight' => (int)$dino['mutated_stat_weight'],
            'damage' => (int)$dino['mutated_stat_damage'],
            'crafting' => (int)$dino['mutated_stat_crafting']
        ],
        'createdAt' => $dino['created_at']
    ];
}
