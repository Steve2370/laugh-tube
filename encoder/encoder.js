require("dotenv").config();
const { exec } = require("child_process");
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const db = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

db.connect();

function run(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (err, stdout, stderr) => {
            if (err) return reject(new Error(stderr || err.message));
            resolve(stdout);
        });
    });
}

async function processNextVideo() {
    const result = await db.query(`
    SELECT eq.id AS queue_id, v.id AS video_id, v.filename
    FROM encoding_queue eq
    JOIN videos v ON eq.video_id = v.id
    WHERE eq.status = 'pending'
    ORDER BY eq.created_at
    LIMIT 1
  `);

    if (result.rows.length === 0) {
        console.log("Pas de vidéos à encoder...");
        return;
    }

    const { queue_id, video_id, filename } = result.rows[0];

    const uploadsDir = process.env.UPLOADS_DIR;
    const outputDir = process.env.OUTPUT_DIR;
    if (!uploadsDir || !outputDir) {
        console.error("UPDATES_DIR ou OUTPUT_DIR manquant dans les env");
        return;
    }

    const inputPath = path.join(uploadsDir, filename);
    if (!fs.existsSync(inputPath)) {
        console.log(`Fichier introuvable: ${inputPath}`);
        await db.query(`UPDATE encoding_queue SET status='failed' WHERE id=$1`, [queue_id]);
        return;
    }

    const outputFilename = filename.replace(/\.\w+$/, "") + ".mp4";
    const outputPath = path.join(outputDir, outputFilename);

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const thumbsDir = path.join(outputDir, "thumbs");
    if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true });

    console.log(`Encodage: ${filename} -> ${outputFilename}`);

    try {
        const encodeCmd = `ffmpeg -y -i "${inputPath}" -c:v libx264 -preset veryfast -crf 23 -c:a aac -b:a 128k "${outputPath}"`;
        await run(encodeCmd);

        const thumbName = outputFilename.replace(/\.mp4$/, ".jpg");
        const thumbPath = path.join(thumbsDir, thumbName);
        const thumbCmd = `ffmpeg -y -i "${outputPath}" -ss 00:00:03 -vframes 1 "${thumbPath}"`;
        await run(thumbCmd);

        await db.query(
            `UPDATE videos SET encoded=TRUE, filename=$1, thumbnail=$2 WHERE id=$3`,
            [outputFilename, thumbName, video_id]
        );
        await db.query(`UPDATE encoding_queue SET status='processing' WHERE id=$1`, [queue_id]);

        console.log(`Terminé: video_id=${video_id}`);
    } catch (e) {
        console.error("Erreur encodage:", e.message);
        await db.query(`UPDATE encoding_queue SET status='failed' WHERE id=$1`, [queue_id]);
    }
}

processNextVideo();
setInterval(processNextVideo, 10000);
