<?php

namespace App\Services;

class UploadService
{
    private const MAX_VIDEO_SIZE = 524288000;
    private const MAX_IMAGE_SIZE = 5242880;
    private const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'];
    private const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    private const ALLOWED_VIDEO_MIMES = [
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-matroska'
    ];

    private const ALLOWED_IMAGE_MIMES = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
    ];

    public function __construct(
        private string $uploadDir = '',
        private ?AuditService $auditService = null
    ) {
        if (empty($this->uploadDir)) {
            $this->uploadDir = __DIR__ . '/../../public/uploads/';
        }

        $this->ensureDirectoriesExist();
    }

    public function uploadVideo(array $file, int $userId): array
    {
        $validation = $this->validateFile($file, 'video');

        if (!$validation['success']) {
            return $validation;
        }

        try {
            $mimeType = $this->getRealMimeType($file['tmp_name']);

            if (!in_array($mimeType, self::ALLOWED_VIDEO_MIMES, true)) {
                return [
                    'success' => false,
                    'message' => 'Type de fichier vidéo invalide',
                    'code' => 400
                ];
            }

            $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $filename = $this->generateSecureFilename('video', $extension);
            $targetDir = $this->uploadDir . 'videos/';
            $targetPath = $targetDir . $filename;

            if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
                error_log("UPLOAD FAILED - tmp: " . $file['tmp_name']);
                error_log("UPLOAD FAILED - target: " . $targetPath);
                error_log("UPLOAD FAILED - target dir exists: " . (is_dir($targetDir) ? 'YES' : 'NO'));
                error_log("UPLOAD FAILED - target dir writable: " . (is_writable($targetDir) ? 'YES' : 'NO'));

                return [
                    'success' => false,
                    'message' => 'Impossible de sauvegarder le fichier',
                    'code' => 500
                ];
            }

            chmod($targetPath, 0644);

            if ($this->auditService) {
                $this->auditService->logSecurityEvent(
                    $userId,
                    'video_uploaded',
                    [
                        'filename' => $filename,
                        'size' => $file['size'],
                        'mime_type' => $mimeType
                    ]
                );
            }

            return [
                'success' => true,
                'filename' => $filename,
                'path' => 'uploads/videos/' . $filename,
                'size' => $file['size'],
                'mime_type' => $mimeType
            ];

        } catch (\Exception $e) {
            error_log("UploadService::uploadVideo - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de l\'upload',
                'code' => 500
            ];
        }
    }

    public function uploadImage(array $file, int $userId, string $type = 'profile'): array
    {
        $validation = $this->validateFile($file, 'image');

        if (!$validation['success']) {
            return $validation;
        }

        try {
            $mimeType = $this->getRealMimeType($file['tmp_name']);

            if (!in_array($mimeType, self::ALLOWED_IMAGE_MIMES, true)) {
                return [
                    'success' => false,
                    'message' => 'Type d\'image invalide',
                    'code' => 400
                ];
            }

            $imageInfo = @getimagesize($file['tmp_name']);

            if ($imageInfo === false) {
                return [
                    'success' => false,
                    'message' => 'Fichier image corrompu',
                    'code' => 400
                ];
            }

            $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $filename = $this->generateSecureFilename($type, $extension);

            $subdir = match($type) {
                'profile', 'avatar' => 'profiles/',
                'cover' => 'covers/',
                'thumbnail' => 'thumbnails/',
                default => 'images/'
            };

            $targetDir = $this->uploadDir . $subdir;
            $targetPath = $targetDir . $filename;

            if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
                return [
                    'success' => false,
                    'message' => 'Impossible de sauvegarder l\'image',
                    'code' => 500
                ];
            }

            chmod($targetPath, 0644);

            if ($this->auditService) {
                $this->auditService->logSecurityEvent(
                    $userId,
                    'image_uploaded',
                    [
                        'type' => $type,
                        'filename' => $filename,
                        'size' => $file['size']
                    ]
                );
            }

            return [
                'success' => true,
                'filename' => $filename,
                'path' => 'uploads/' . $subdir . $filename,
                'size' => $file['size'],
                'dimensions' => [
                    'width' => $imageInfo[0],
                    'height' => $imageInfo[1]
                ]
            ];

        } catch (\Exception $e) {
            error_log("UploadService::uploadImage - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de l\'upload',
                'code' => 500
            ];
        }
    }

    public function deleteFile(string $filename, string $type = 'video'): array
    {
        try {
            $filename = basename($filename);

            $subdir = match($type) {
                'video' => 'videos/',
                'profile', 'avatar' => 'profiles/',
                'cover' => 'covers/',
                'thumbnail' => 'thumbnails/',
                default => ''
            };

            $filePath = $this->uploadDir . $subdir . $filename;

            if (!file_exists($filePath)) {
                return [
                    'success' => false,
                    'message' => 'Fichier introuvable',
                    'code' => 404
                ];
            }

            $realPath = realpath($filePath);
            $realUploadDir = realpath($this->uploadDir);

            if ($realPath === false || strpos($realPath, $realUploadDir) !== 0) {
                return [
                    'success' => false,
                    'message' => 'Chemin de fichier invalide',
                    'code' => 400
                ];
            }

            if (@unlink($filePath)) {
                return [
                    'success' => true,
                    'message' => 'Fichier supprimé'
                ];
            }

            return [
                'success' => false,
                'message' => 'Impossible de supprimer le fichier',
                'code' => 500
            ];

        } catch (\Exception $e) {
            error_log("UploadService::deleteFile - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de la suppression',
                'code' => 500
            ];
        }
    }

    private function validateFile(array $file, string $type): array
    {
        if (!isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
            $errorMessage = $this->getUploadErrorMessage($file['error'] ?? UPLOAD_ERR_NO_FILE);

            return [
                'success' => false,
                'message' => $errorMessage,
                'code' => 400
            ];
        }

        $maxSize = ($type === 'video') ? self::MAX_VIDEO_SIZE : self::MAX_IMAGE_SIZE;

        if ($file['size'] > $maxSize) {
            $maxSizeMB = round($maxSize / 1048576, 2);

            return [
                'success' => false,
                'message' => "Fichier trop volumineux (max {$maxSizeMB} MB)",
                'code' => 400
            ];
        }

        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowedExtensions = ($type === 'video')
            ? self::ALLOWED_VIDEO_EXTENSIONS
            : self::ALLOWED_IMAGE_EXTENSIONS;

        if (!in_array($extension, $allowedExtensions, true)) {
            return [
                'success' => false,
                'message' => 'Extension de fichier non autorisée',
                'code' => 400
            ];
        }

        if (!is_uploaded_file($file['tmp_name'])) {
            return [
                'success' => false,
                'message' => 'Fichier upload invalide',
                'code' => 400
            ];
        }

        return ['success' => true];
    }

    private function getRealMimeType(string $filepath): string
    {
        if (!function_exists('finfo_open')) {
            return mime_content_type($filepath);
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $filepath);
        finfo_close($finfo);

        return $mimeType ?: 'application/octet-stream';
    }

    private function generateSecureFilename(string $prefix, string $extension): string
    {
        $timestamp = time();
        $random = bin2hex(random_bytes(8));

        return "{$prefix}_{$timestamp}_{$random}.{$extension}";
    }

    private function getUploadErrorMessage(int $errorCode): string
    {
        return match($errorCode) {
            UPLOAD_ERR_INI_SIZE => 'Fichier trop volumineux (limite serveur)',
            UPLOAD_ERR_FORM_SIZE => 'Fichier trop volumineux (limite formulaire)',
            UPLOAD_ERR_PARTIAL => 'Fichier partiellement uploadé',
            UPLOAD_ERR_NO_FILE => 'Aucun fichier uploadé',
            UPLOAD_ERR_NO_TMP_DIR => 'Répertoire temporaire manquant',
            UPLOAD_ERR_CANT_WRITE => 'Impossible d\'écrire sur le disque',
            UPLOAD_ERR_EXTENSION => 'Upload bloqué par extension PHP',
            default => 'Erreur inconnue lors de l\'upload'
        };
    }

    private function ensureDirectoriesExist(): void
    {
        $directories = [
            $this->uploadDir . 'videos/',
            $this->uploadDir . 'profiles/',
            $this->uploadDir . 'covers/',
            $this->uploadDir . 'thumbnails/',
            $this->uploadDir . 'images/'
        ];

        foreach ($directories as $dir) {
            if (!is_dir($dir)) {
                @mkdir($dir, 0755, true);
            }
        }
    }
}