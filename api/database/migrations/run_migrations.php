<?php
/**
 * Script d'exécution des migrations de base de données
 * Usage: php run_migrations.php
 */

require_once __DIR__ . '/../../config.php';

// Couleurs pour le terminal
function colorize($text, $color) {
    $colors = [
        'red' => "\033[31m",
        'green' => "\033[32m",
        'yellow' => "\033[33m",
        'blue' => "\033[34m",
        'reset' => "\033[0m"
    ];
    return $colors[$color] . $text . $colors['reset'];
}

echo colorize("\n=== ARKI'FAMILY - MIGRATIONS DE BASE DE DONNÉES ===\n\n", 'blue');

try {
    // Connexion à la base de données
    $pdo = getDbConnection();
    echo colorize("✓ Connexion à la base de données réussie\n", 'green');

    // Récupérer tous les fichiers SQL dans le dossier migrations
    $migrationFiles = glob(__DIR__ . '/*.sql');
    sort($migrationFiles); // Trier par nom de fichier

    if (empty($migrationFiles)) {
        echo colorize("⚠ Aucun fichier de migration trouvé\n", 'yellow');
        exit(0);
    }

    echo colorize("\nFichiers de migration trouvés : " . count($migrationFiles) . "\n\n", 'blue');

    // Exécuter chaque migration
    foreach ($migrationFiles as $file) {
        $filename = basename($file);
        echo "Exécution de : $filename\n";

        // Lire le contenu du fichier SQL
        $sql = file_get_contents($file);

        if (empty($sql)) {
            echo colorize("  ⚠ Fichier vide, ignoré\n\n", 'yellow');
            continue;
        }

        // Séparer les requêtes SQL
        $statements = array_filter(
            array_map('trim', explode(';', $sql)),
            function($stmt) {
                return !empty($stmt) &&
                       !preg_match('/^--/', $stmt) &&
                       $stmt !== 'DELIMITER //' &&
                       $stmt !== 'DELIMITER ;';
            }
        );

        $successCount = 0;
        $errorCount = 0;

        foreach ($statements as $statement) {
            if (empty(trim($statement))) continue;

            try {
                $pdo->exec($statement);
                $successCount++;
            } catch (PDOException $e) {
                // Ignorer les erreurs "already exists", "duplicate column" ou "duplicate key"
                if (stripos($e->getMessage(), 'Duplicate column') !== false ||
                    stripos($e->getMessage(), 'Duplicate key') !== false ||
                    stripos($e->getMessage(), 'already exists') !== false) {
                    echo colorize("  ⚠ Déjà appliqué (ignoré)\n", 'yellow');
                    continue;
                }
                echo colorize("  ✗ Erreur : " . $e->getMessage() . "\n", 'red');
                $errorCount++;
            }
        }

        if ($errorCount === 0) {
            echo colorize("  ✓ Migration appliquée avec succès ($successCount requêtes)\n\n", 'green');
        } else {
            echo colorize("  ⚠ Migration partiellement appliquée ($successCount succès, $errorCount erreurs)\n\n", 'yellow');
        }
    }

    echo colorize("\n=== MIGRATIONS TERMINÉES ===\n\n", 'green');

} catch (PDOException $e) {
    echo colorize("\n✗ ERREUR DE CONNEXION : " . $e->getMessage() . "\n\n", 'red');
    exit(1);
} catch (Exception $e) {
    echo colorize("\n✗ ERREUR : " . $e->getMessage() . "\n\n", 'red');
    exit(1);
}
