<?php
/**
 * Upload de bannière ou logo pour une tribu
 * POST /tribe-upload.php?type=banner|logo
 */

require_once 'config.php';
require_once 'middleware/auth.php';
require_once 'utils/security.php';

// Vérifier l'authentification
$pdo = getDbConnection();
$user = requireAuth($pdo);

if (!$user) {
    exit;
}

// Vérifier la méthode HTTP
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonError('Méthode non autorisée', 405);
}

// Note: CSRF protection is not needed with JWT Bearer token authentication
// The JWT in the Authorization header already provides protection against CSRF attacks

// Vérifier le type d'upload
$type = $_GET['type'] ?? null;
if (!in_array($type, ['banner', 'logo'])) {
    sendJsonError('Type invalide. Utilisez "banner" ou "logo"', 400);
}

// Vérifier qu'un fichier a été uploadé
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    sendJsonError('Aucune image uploadée ou erreur lors de l\'upload', 400);
}

$file = $_FILES['image'];

// Valider le type MIME
$allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $allowedMimes)) {
    sendJsonError('Format d\'image non supporté. Utilisez JPG, PNG ou WEBP', 400);
}

// Valider la taille (5MB pour les deux)
$maxSize = 5 * 1024 * 1024; // 5MB pour banner et logo
if ($file['size'] > $maxSize) {
    $maxMB = $maxSize / (1024 * 1024);
    sendJsonError("L'image est trop volumineuse. Taille maximum: {$maxMB}MB", 400);
}

try {
    // Récupérer la tribu de l'utilisateur
    $stmt = $pdo->prepare("
        SELECT t.id, tm.role
        FROM tribes t
        JOIN tribe_members tm ON t.id = tm.tribe_id
        WHERE tm.user_id = ? AND tm.is_validated = 1
        LIMIT 1
    ");
    $stmt->execute([$user['id']]);
    $tribe = $stmt->fetch();

    if (!$tribe) {
        sendJsonError('Vous n\'êtes pas membre d\'une tribu', 403);
        return;
    }

    $tribeId = $tribe['id'];

    // Créer le dossier de la tribu si nécessaire
    $uploadDir = __DIR__ . "/uploads/tribes/{$tribeId}";
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    // Déterminer l'extension et le nom du fichier
    $extension = match($mimeType) {
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        default => 'jpg'
    };

    $filename = $type . '.' . $extension;
    $filepath = $uploadDir . '/' . $filename;

    // Charger l'image source
    $sourceImage = match($mimeType) {
        'image/jpeg' => imagecreatefromjpeg($file['tmp_name']),
        'image/png' => imagecreatefrompng($file['tmp_name']),
        'image/webp' => imagecreatefromwebp($file['tmp_name']),
        default => null
    };

    if (!$sourceImage) {
        sendJsonError('Impossible de traiter l\'image', 500);
        return;
    }

    // Dimensions cibles
    $targetWidth = $type === 'banner' ? 1200 : 300;
    $targetHeight = $type === 'banner' ? 300 : 300;

    // Obtenir les dimensions source
    $sourceWidth = imagesx($sourceImage);
    $sourceHeight = imagesy($sourceImage);

    // Pour le logo: l'image est déjà recadrée côté client, juste redimensionner
    // Pour la bannière: appliquer le crop automatique
    if ($type === 'logo') {
        // Logo: redimensionner sans crop (l'image est déjà carrée du côté client)
        $cropX = 0;
        $cropY = 0;
        $tempWidth = $sourceWidth;
        $tempHeight = $sourceHeight;
    } else {
        // Bannière: calculer le ratio pour le redimensionnement (cover)
        $sourceRatio = $sourceWidth / $sourceHeight;
        $targetRatio = $targetWidth / $targetHeight;

        if ($sourceRatio > $targetRatio) {
            // Image trop large - crop horizontal
            $tempHeight = $sourceHeight;
            $tempWidth = $sourceHeight * $targetRatio;
            $cropX = ($sourceWidth - $tempWidth) / 2;
            $cropY = 0;
        } else {
            // Image trop haute - crop vertical
            $tempWidth = $sourceWidth;
            $tempHeight = $sourceWidth / $targetRatio;
            $cropX = 0;
            $cropY = ($sourceHeight - $tempHeight) / 2;
        }
    }

    // Créer l'image de destination
    $destImage = imagecreatetruecolor($targetWidth, $targetHeight);

    // Préserver la transparence pour PNG et WEBP
    if ($mimeType === 'image/png' || $mimeType === 'image/webp') {
        imagealphablending($destImage, false);
        imagesavealpha($destImage, true);
        $transparent = imagecolorallocatealpha($destImage, 0, 0, 0, 127);
        imagefill($destImage, 0, 0, $transparent);
    }

    // Redimensionner et copier
    imagecopyresampled(
        $destImage,
        $sourceImage,
        0, 0,
        $cropX, $cropY,
        $targetWidth, $targetHeight,
        $tempWidth, $tempHeight
    );

    // Supprimer l'ancienne image si elle existe
    if (file_exists($filepath)) {
        unlink($filepath);
    }

    // Sauvegarder l'image redimensionnée
    $saved = match($extension) {
        'jpg' => imagejpeg($destImage, $filepath, 90),
        'png' => imagepng($destImage, $filepath, 8),
        'webp' => imagewebp($destImage, $filepath, 90),
        default => false
    };

    // Libérer la mémoire
    imagedestroy($sourceImage);
    imagedestroy($destImage);

    if (!$saved) {
        sendJsonError('Erreur lors de la sauvegarde de l\'image', 500);
        return;
    }

    // URL relative de l'image (avec préfixe /api/)
    $imageUrl = "/uploads/tribes/{$tribeId}/{$filename}";

    // Mettre à jour la base de données
    $field = $type === 'banner' ? 'banner_url' : 'logo_url';
    $stmt = $pdo->prepare("UPDATE tribes SET {$field} = ? WHERE id = ?");
    $stmt->execute([$imageUrl, $tribeId]);

    // Retourner l'URL
    sendJsonResponse([
        'url' => $imageUrl,
        'message' => ucfirst($type) . ' uploadée avec succès'
    ]);

} catch (PDOException $e) {
    sendJsonError('Erreur lors de la mise à jour: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    sendJsonError('Erreur lors du traitement: ' . $e->getMessage(), 500);
}
