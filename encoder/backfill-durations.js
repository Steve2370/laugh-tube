/**
 * Script de rattrapage : calcule et enregistre la durée des vidéos déjà
 * encodées avant l'ajout de l'extraction ffprobe dans encoder.js.
 *
 * Ne touche qu'aux vidéos encoded = TRUE et duration IS NULL — n'affecte
 * jamais les vidéos en attente d'encodage ni celles déjà correctement
 * renseignées. Purement additif, aucune suppression.
 *
 * Usage (depuis le conteneur encodeur, ou tout environnement ayant accès
 * à Postgres, au dossier des vidéos encodées, et au binaire ffprobe) :
 *   node backfill-durations.js
 */
require("dotenv").config();
const { execFile } = require("child_process");
const { Pool } = require("pg");
const path = require("path");

const CONFIG = {
    db: {
        host: process.env.DB_HOST || 'postgres',
        port: Number(process.env.DB_PORT || 5432),
        database: process.env.DB_NAME || 'laughtube',
        user: process.env.DB_USER || 'laughtube_user',
        password: process.env.DB_PASSWORD || 'changeme',
    },
    paths: {
        encoded: process.env.OUTPUT_DIR || '/app/uploads/encoded',
    },
};

function execFileAsync(cmd, args, timeout) {
    return new Promise((resolve, reject) => {
        execFile(cmd, args, { timeout, maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
            if (err) reject(new Error(stderr || err.message));
            else resolve(stdout);
        });
    });
}

async function getDuration(filePath) {
    const out = await execFileAsync('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        filePath,
    ], 60000);
    const parsed = Math.round(parseFloat(out.trim()));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function main() {
    const pool = new Pool(CONFIG.db);

    const { rows } = await pool.query(`
        SELECT id, encoded_filename
        FROM videos
        WHERE encoded = TRUE
          AND duration IS NULL
          AND encoded_filename IS NOT NULL
        ORDER BY id
    `);

    console.log(`${rows.length} vidéo(s) à traiter.`);

    let ok = 0, failed = 0, skipped = 0;

    for (const row of rows) {
        const filePath = path.join(CONFIG.paths.encoded, row.encoded_filename);
        try {
            const duration = await getDuration(filePath);
            if (duration === null) {
                console.warn(`[skip] vidéo ${row.id} — durée illisible (${row.encoded_filename})`);
                skipped++;
                continue;
            }
            await pool.query('UPDATE videos SET duration = $1 WHERE id = $2', [duration, row.id]);
            console.log(`[ok]   vidéo ${row.id} — ${duration}s`);
            ok++;
        } catch (err) {
            console.error(`[fail] vidéo ${row.id} (${row.encoded_filename}) — ${err.message}`);
            failed++;
        }
    }

    console.log(`Terminé. ${ok} mise(s) à jour, ${skipped} ignorée(s), ${failed} échec(s).`);
    await pool.end();
}

main().catch((err) => {
    console.error('Erreur fatale:', err);
    process.exit(1);
});
