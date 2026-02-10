<?php
namespace App\Services;

use AllowDynamicProperties;
use App\Interfaces\DatabaseInterface;
use App\Models\Video;

#[AllowDynamicProperties]
class VideoStreamService
{
    private const CHUNK_SIZE = 1024 * 256;
    private const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
    private const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    public function __construct(
        DatabaseInterface $db,
        ?Video $videoModel = null,
        ?string $videosDir = null,
        ?string $thumbsDir = null
    ) {
        $this->videoModel = $videoModel ?? new Video($db);
        $this->videosDir  = $videosDir ?? ($_ENV['OUTPUT_DIR'] ?? __DIR__ . '/../../videos');
        $this->thumbsDir  = $thumbsDir ?? ($this->videosDir . '/thumbs');
    }

    public function stream(int $videoId): void
    {
        try {
            $filename = $this->videoModel->getFilename($videoId);

            if (!$filename) {
                $this->sendError(404, 'Vidéo introuvable ou non disponible');
                return;
            }

            $filename = basename($filename);
            $filepath = $this->videosDir . '/' . $filename;

            if (!file_exists($filepath)) {
                $this->sendError(404, 'Fichier vidéo introuvable');
                return;
            }

            $realPath = realpath($filepath);
            $realVideosDir = realpath($this->videosDir);

            if ($realPath === false || strpos($realPath, $realVideosDir) !== 0) {
                $this->sendError(403, 'Accès refusé');
                return;
            }

            $mimeType = $this->getMimeType($filepath);

            if (!in_array($mimeType, self::ALLOWED_VIDEO_TYPES, true)) {
                $this->sendError(415, 'Type de fichier non supporté');
                return;
            }

            $this->streamFile($filepath, $mimeType);

        } catch (\Exception $e) {
            error_log("VideoStreamService::stream - Error: " . $e->getMessage());
            $this->sendError(500, 'Erreur lors du streaming');
        }
    }

    public function serveThumbnail(int $videoId): void
    {
        try {
            $thumbnail = $this->videoModel->getThumbnail($videoId);

            if (!$thumbnail) {
                $this->sendError(404, 'Miniature introuvable');
                return;
            }

            $thumbnail = basename($thumbnail);
            $thumbPath = $this->thumbsDir . '/' . $thumbnail;

            if (!file_exists($thumbPath)) {
                $this->sendError(404, 'Fichier miniature introuvable');
                return;
            }

            $realPath = realpath($thumbPath);
            $realThumbsDir = realpath($this->thumbsDir);

            if ($realPath === false || strpos($realPath, $realThumbsDir) !== 0) {
                $this->sendError(403, 'Accès refusé');
                return;
            }

            $imageInfo = @getimagesize($thumbPath);

            if (!$imageInfo) {
                $this->sendError(415, 'Fichier image invalide');
                return;
            }

            if (!in_array($imageInfo['mime'], self::ALLOWED_IMAGE_TYPES, true)) {
                $this->sendError(415, 'Type d\'image non supporté');
                return;
            }

            $this->serveImage($thumbPath, $imageInfo);

        } catch (\Exception $e) {
            error_log("VideoStreamService::serveThumbnail - Error: " . $e->getMessage());
            $this->sendError(500, 'Erreur lors du chargement');
        }
    }

    private function streamFile(string $filepath, string $mimeType): void
    {
        $fileSize = filesize($filepath);
        $range = $_SERVER['HTTP_RANGE'] ?? null;

        header('Content-Type: ' . $mimeType);
        header('Accept-Ranges: bytes');
        header('Cache-Control: public, max-age=3600');
        header('Last-Modified: ' . gmdate('D, d M Y H:i:s', filemtime($filepath)) . ' GMT');

        if ($range) {
            $this->streamRange($filepath, $fileSize, $range, $mimeType);
        } else {
            $this->streamFull($filepath, $fileSize);
        }
    }

    private function streamRange(string $filepath, int $fileSize, string $range, string $mimeType): void
    {
        $ranges = explode('=', $range, 2);

        if (count($ranges) !== 2 || $ranges[0] !== 'bytes') {
            http_response_code(400);
            return;
        }

        $range = explode('-', $ranges[1], 2);
        $start = intval($range[0]);
        $end = isset($range[1]) && $range[1] !== '' ? intval($range[1]) : $fileSize - 1;

        if ($start > $end || $start >= $fileSize || $end >= $fileSize) {
            http_response_code(416); // Range Not Satisfiable
            header("Content-Range: bytes */$fileSize");
            return;
        }

        $length = $end - $start + 1;

        http_response_code(206);
        header("Content-Range: bytes $start-$end/$fileSize");
        header("Content-Length: $length");

        $file = fopen($filepath, 'rb');

        if ($file === false) {
            http_response_code(500);
            return;
        }

        fseek($file, $start);

        $remaining = $length;

        while ($remaining > 0 && !feof($file)) {
            $chunkSize = min(self::CHUNK_SIZE, $remaining);
            echo fread($file, $chunkSize);
            $remaining -= $chunkSize;

            if (connection_aborted()) {
                break;
            }

            flush();
        }

        fclose($file);
    }

    private function streamFull(string $filepath, int $fileSize): void
    {
        header('Content-Length: ' . $fileSize);

        $file = fopen($filepath, 'rb');

        if ($file === false) {
            http_response_code(500);
            return;
        }

        while (!feof($file)) {
            echo fread($file, self::CHUNK_SIZE);

            if (connection_aborted()) {
                break;
            }

            flush();
        }

        fclose($file);
    }

    private function serveImage(string $imagePath, array $imageInfo): void
    {
        $fileSize = filesize($imagePath);

        header('Content-Type: ' . $imageInfo['mime']);
        header('Content-Length: ' . $fileSize);
        header('Cache-Control: public, max-age=86400'); // 24h cache
        header('Expires: ' . gmdate('D, d M Y H:i:s', time() + 86400) . ' GMT');

        $etag = md5_file($imagePath);
        header('ETag: "' . $etag . '"');

        if (isset($_SERVER['HTTP_IF_NONE_MATCH'])) {
            $clientEtag = trim($_SERVER['HTTP_IF_NONE_MATCH'], '"');

            if ($clientEtag === $etag) {
                http_response_code(304);
                return;
            }
        }

        readfile($imagePath);
    }

    private function getMimeType(string $filepath): string
    {
        if (!function_exists('finfo_open')) {
            return 'application/octet-stream';
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $filepath);
        finfo_close($finfo);

        return $mimeType ?: 'application/octet-stream';
    }

    private function sendError(int $code, string $message): void
    {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode([
            'error' => $message,
            'code' => $code
        ]);
    }

    public function getVideoInfo(int $videoId): ?array
    {
        try {
            $filename = $this->videoModel->getFilename($videoId);

            if (!$filename) {
                return null;
            }

            $filename = basename($filename);
            $filepath = $this->videosDir . '/' . $filename;

            if (!file_exists($filepath)) {
                return null;
            }

            return [
                'filename' => $filename,
                'size' => filesize($filepath),
                'mime_type' => $this->getMimeType($filepath),
                'modified' => filemtime($filepath)
            ];

        } catch (\Exception $e) {
            error_log("VideoStreamService::getVideoInfo - Error: " . $e->getMessage());
            return null;
        }
    }

    public function videoFileExists(int $videoId): bool
    {
        try {
            $filename = $this->videoModel->getFilename($videoId);

            if (!$filename) {
                return false;
            }

            $filename = basename($filename);
            $filepath = $this->videosDir . '/' . $filename;

            return file_exists($filepath);

        } catch (\Exception $e) {
            return false;
        }
    }

    public function getVideoDuration(int $videoId): ?int
    {
        try {
            $filename = $this->videoModel->getFilename($videoId);

            if (!$filename) {
                return null;
            }

            $filename = basename($filename);
            $filepath = $this->videosDir . '/' . $filename;

            if (!file_exists($filepath)) {
                return null;
            }

            if (function_exists('shell_exec')) {
                $cmd = "ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 " . escapeshellarg($filepath);
                $output = shell_exec($cmd);

                if ($output) {
                    return (int)round((float)$output);
                }
            }

            return null;

        } catch (\Exception $e) {
            error_log("VideoStreamService::getVideoDuration - Error: " . $e->getMessage());
            return null;
        }
    }
}