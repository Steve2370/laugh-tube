require("dotenv").config();
const { exec } = require("child_process");
const { Pool } = require("pg");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");

const CONFIG = {
    db: {
        host: process.env.DB_HOST || 'postgres',
        port: Number(process.env.DB_PORT || 5432),
        database: process.env.DB_NAME || 'laughtube',
        user: process.env.DB_USER || 'laughtube_user',
        password: process.env.DB_PASSWORD || 'changeme',
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    },
    paths: {
        uploads: process.env.UPLOADS_DIR || '/app/uploads/videos',
        encoded: process.env.OUTPUT_DIR || '/app/uploads/encoded',
        thumbs: process.env.THUMBS_DIR || '/app/uploads/thumbnails',
    },
    encoder: {
        maxWorkers: Number(process.env.MAX_WORKERS) || Math.max(2, os.cpus().length - 1),
        pollInterval: Number(process.env.POLL_INTERVAL) || 5000,

        videoPreset: process.env.VIDEO_PRESET || 'veryfast',
        videoCRF: Number(process.env.VIDEO_CRF) || 23,
        audioBitrate: process.env.AUDIO_BITRATE || '128k',

        encodingTimeout: Number(process.env.ENCODING_TIMEOUT) || 600000,
    },
    logging: {
        verbose: process.env.VERBOSE === 'true',
    }
};

const pool = new Pool(CONFIG.db);

pool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err);
    process.exit(1);
});

pool.connect()
    .then(client => {
        console.log('Connecté à PostgreSQL');
        client.release();
    })
    .catch(err => {
        console.error('Impossible de se connecter à PostgreSQL:', err.message);
        process.exit(1);
    });

function execCommand(cmd, timeout = CONFIG.encoder.encodingTimeout) {
    return new Promise((resolve, reject) => {
        const process = exec(cmd, { timeout }, (err, stdout, stderr) => {
            if (err) {
                reject(new Error(stderr || err.message));
            } else {
                resolve(stdout);
            }
        });

        process.on('error', reject);
    });
}

async function ensureDirectories() {
    try {
        await fs.mkdir(CONFIG.paths.encoded, { recursive: true });
        await fs.mkdir(CONFIG.paths.thumbs, { recursive: true });
        console.log('Répertoires créés');
    } catch (err) {
        console.error('Erreur création répertoires:', err.message);
        throw err;
    }
}

async function fileExists(filepath) {
    try {
        await fs.access(filepath);
        return true;
    } catch {
        return false;
    }
}

async function getFileSize(filepath) {
    try {
        const stats = await fs.stat(filepath);
        return (stats.size / 1024 / 1024).toFixed(2);
    } catch {
        return 0;
    }
}

function logInfo(msg) {
    console.log(`[${new Date().toISOString()}] ℹ️  ${msg}`);
}

function logSuccess(msg) {
    console.log(`[${new Date().toISOString()}] ✅ ${msg}`);
}

function logError(msg) {
    console.error(`[${new Date().toISOString()}] ❌ ${msg}`);
}

function logDebug(msg) {
    if (CONFIG.logging.verbose) {
        console.log(`[${new Date().toISOString()}] 🔍 ${msg}`);
    }
}

class VideoEncoder {
    constructor(workerId) {
        this.workerId = workerId;
        this.isProcessing = false;
    }

    async processNextVideo() {
        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        try {
            const client = await pool.connect();

            try {
                const result = await client.query(`
                    UPDATE encoding_queue
                    SET status = 'processing',
                        started_at = NOW()
                    WHERE id = (
                        SELECT id
                        FROM encoding_queue
                        WHERE status = 'pending'
                        ORDER BY priority DESC, created_at ASC
                        LIMIT 1
                            FOR UPDATE SKIP LOCKED
                    )
                    RETURNING
                        encoding_queue.id AS queue_id,
                        encoding_queue.video_id,
                        videos.filename,
                        videos.titre AS title
                    FROM videos
                    WHERE videos.id = encoding_queue.video_id
                `);

                if (result.rows.length === 0) {
                    logDebug(`Worker ${this.workerId}: Aucune vidéo en attente`);
                    return;
                }

                const job = result.rows[0];
                await this.encodeVideo(job);

            } finally {
                client.release();
            }

        } catch (err) {
            logError(`Worker ${this.workerId} - Erreur: ${err.message}`);
        } finally {
            this.isProcessing = false;
        }
    }

    async encodeVideo(job) {
        const { queue_id, video_id, filename, title } = job;

        logInfo(`Worker ${this.workerId} - Encodage vidéo: ${title || filename} (ID: ${video_id})`);

        const inputPath = path.join(CONFIG.paths.uploads, filename);

        if (!await fileExists(inputPath)) {
            logError(`Fichier introuvable: ${inputPath}`);
            await pool.query(
                `UPDATE encoding_queue
                 SET status = 'failed',
                     error_message = 'Fichier source introuvable',
                     completed_at = NOW()
                 WHERE id = $1`,
                [queue_id]
            );
            return;
        }

        const inputSize = await getFileSize(inputPath);
        logDebug(`Taille source: ${inputSize} MB`);

        const baseFilename = path.basename(filename, path.extname(filename));
        const outputFilename = `${baseFilename}_encoded.mp4`;
        const thumbFilename = `${baseFilename}_thumb.jpg`;

        const outputPath = path.join(CONFIG.paths.encoded, outputFilename);
        const thumbPath = path.join(CONFIG.paths.thumbs, thumbFilename);

        const startTime = Date.now();

        try {
            logInfo(`Worker ${this.workerId} - Encodage en cours...`);

            const encodeCmd = `ffmpeg -y -i "${inputPath}" \
                -c:v libx264 \
                -preset ${CONFIG.encoder.videoPreset} \
                -crf ${CONFIG.encoder.videoCRF} \
                -profile:v high \
                -level 4.0 \
                -pix_fmt yuv420p \
                -movflags +faststart \
                -c:a aac \
                -b:a ${CONFIG.encoder.audioBitrate} \
                -ar 44100 \
                -ac 2 \
                -max_muxing_queue_size 1024 \
                "${outputPath}" 2>&1`;

            await execCommand(encodeCmd);

            const outputSize = await getFileSize(outputPath);
            const encodingTime = ((Date.now() - startTime) / 1000).toFixed(2);

            logSuccess(`Worker ${this.workerId} - Encodé: ${outputSize} MB en ${encodingTime}s`);
            logInfo(`Worker ${this.workerId} - Génération thumbnail...`);

            const thumbCmd = `ffmpeg -y -i "${outputPath}" \
                -ss 00:00:03 \
                -vframes 1 \
                -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" \
                -q:v 2 \
                "${thumbPath}" 2>&1`;

            await execCommand(thumbCmd);

            logSuccess(`Worker ${this.workerId} - Thumbnail créé`);

            await pool.query(`
                BEGIN;
                
                UPDATE videos 
                SET encoded = TRUE,
                    encoded_filename = $1,
                    thumbnail = $2,
                    file_size = $3,
                    encoding_duration = $4
                WHERE id = $5;
                
                UPDATE encoding_queue
                SET status = 'completed',
                    completed_at = NOW()
                WHERE id = $6;
                
                COMMIT;
            `, [
                outputFilename,
                thumbFilename,
                outputSize,
                encodingTime,
                video_id,
                queue_id
            ]);

            logSuccess(`Worker ${this.workerId} - Vidéo ${video_id} encodée avec succès!`);

            if (process.env.DELETE_SOURCE === 'true') {
                try {
                    await fs.unlink(inputPath);
                    logInfo(`Source supprimée: ${filename}`);
                } catch (err) {
                    logError(`Erreur suppression source: ${err.message}`);
                }
            }

        } catch (err) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            logError(`Worker ${this.workerId} - Échec après ${duration}s: ${err.message}`);

            await pool.query(`
                UPDATE encoding_queue
                SET status = 'failed',
                    error_message = $1,
                    completed_at = NOW()
                WHERE id = $2
            `, [err.message.substring(0, 500), queue_id]);

            try {
                if (await fileExists(outputPath)) await fs.unlink(outputPath);
                if (await fileExists(thumbPath)) await fs.unlink(thumbPath);
            } catch {}
        }
    }
}


class EncoderManager {
    constructor() {
        this.workers = [];
        this.running = false;
    }

    async start() {
        logInfo('Démarrage Encoder Manager...');

        logInfo(`Configuration:`);
        logInfo(`  - Workers: ${CONFIG.encoder.maxWorkers}`);
        logInfo(`  - Preset: ${CONFIG.encoder.videoPreset}`);
        logInfo(`  - CRF: ${CONFIG.encoder.videoCRF}`);
        logInfo(`  - Poll interval: ${CONFIG.encoder.pollInterval}ms`);
        logInfo(`  - Uploads: ${CONFIG.paths.uploads}`);
        logInfo(`  - Encoded: ${CONFIG.paths.encoded}`);
        logInfo(`  - Thumbnails: ${CONFIG.paths.thumbs}`);

        await ensureDirectories();

        for (let i = 1; i <= CONFIG.encoder.maxWorkers; i++) {
            const worker = new VideoEncoder(i);
            this.workers.push(worker);
            logInfo(`Worker ${i} créé`);
        }

        this.running = true;
        logSuccess('Encoder Manager démarré!');

        this.poll();
    }

    async poll() {
        while (this.running) {
            await Promise.all(
                this.workers.map(worker => worker.processNextVideo())
            );

            await new Promise(resolve => setTimeout(resolve, CONFIG.encoder.pollInterval));
        }
    }

    async stop() {
        logInfo('Arrêt Encoder Manager...');
        this.running = false;
        await pool.end();
        logSuccess('Encoder Manager arrêté');
    }
}

const manager = new EncoderManager();

process.on('SIGINT', async () => {
    console.log('Signal SIGINT reçu');
    await manager.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Signal SIGTERM reçu');
    await manager.stop();
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

manager.start().catch(err => {
    console.error('Échec démarrage:', err);
    process.exit(1);
});