import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext.jsx';
import apiService from '../services/apiService.js';
import { Upload as UploadIcon, X, FileVideo, Check, Lock, AlertCircle } from 'lucide-react';

const Upload = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploading, setUploading] = useState(false);

    const { isAuthenticated, user, loading } = useAuth();
    const toast = useToast();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            toast.error("Vous devez être connecté pour uploader une vidéo");
            window.location.hash = '#/login';
        }
    }, [isAuthenticated, loading, toast]);

    const validateFile = (file) => {
        const maxSize = 500 * 1024 * 1024;
        const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/webm', 'video/quicktime'];

        if (file.size > maxSize) {
            toast.error("La vidéo ne doit pas dépasser 500 MB");
            return false;
        }

        if (!allowedTypes.includes(file.type)) {
            toast.error("Format non supporté. Utilisez MP4, AVI, MOV ou WebM");
            return false;
        }

        return true;
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (validateFile(file)) {
                setSelectedFile(file);
                setPreview(URL.createObjectURL(file));
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedFile) {
            toast.error("Veuillez sélectionner une vidéo");
            return;
        }

        if (!isAuthenticated) {
            toast.error("Vous devez être connecté pour uploader");
            window.location.hash = '#/login';
            return;
        }

        if (title.length < 3) {
            toast.error("Le titre doit contenir au moins 3 caractères");
            return;
        }

        if (title.length > 100) {
            toast.error("Le titre ne peut pas dépasser 100 caractères");
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('video', selectedFile);
            formData.append('title', title.trim());
            formData.append('description', description.trim());

            await apiService.uploadVideo(formData, (percent) => {
                setUploadProgress(percent);
            });

            toast.success("Vidéo uploadée avec succès !");
            setTitle('');
            setDescription('');
            setSelectedFile(null);
            setPreview(null);
            setUploadProgress(100);

            setTimeout(() => {
                window.location.hash = '#/home';
            }, 1500);

        } catch (err) {
            console.error('Erreur upload:', err);
            toast.error(err.message || "Erreur lors de l'upload");
            setUploadProgress(0);
        } finally {
            setUploading(false);
        }
    };

    const removeFile = () => {
        if (preview) {
            URL.revokeObjectURL(preview);
        }
        setSelectedFile(null);
        setPreview(null);
        setUploadProgress(0);
    };

    const navigateTo = (page) => {
        window.location.hash = `#/${page}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen pt-20 bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Chargement...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen pt-20 bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
                            <Lock size={40} className="text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Accès restreint
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Vous devez être connecté pour uploader une vidéo
                        </p>
                        <button
                            onClick={() => navigateTo('login')}
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3.5 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg"
                        >
                            Se connecter
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20 bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="container mx-auto px-4 py-8 max-w-3xl">
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-8 text-white">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-white bg-opacity-20 rounded-xl">
                                <UploadIcon size={32} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold">Uploader une vidéo</h1>
                                <p className="text-blue-100 mt-1">
                                    Partagez votre contenu avec la communauté
                                </p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Titre de la vidéo *
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Donnez un titre accrocheur à votre vidéo"
                                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                maxLength={100}
                                disabled={uploading}
                                required
                            />
                            <div className="mt-1 flex justify-end text-xs text-gray-500">
                                <span className={title.length > 90 ? 'text-orange-500 font-medium' : ''}>
                                    {title.length}/100
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Décrivez votre vidéo (optionnel)"
                                rows="4"
                                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                maxLength={5000}
                                disabled={uploading}
                            />
                            <div className="mt-1 flex justify-end text-xs text-gray-500">
                                <span className={description.length > 4500 ? 'text-orange-500 font-medium' : ''}>
                                    {description.length}/5000
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Fichier vidéo *
                            </label>

                            {!selectedFile ? (
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-500 hover:bg-blue-50 transition-all duration-300">
                                    <input
                                        type="file"
                                        accept="video/mp4,video/avi,video/mov,video/webm,video/quicktime"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="video-upload"
                                        disabled={uploading}
                                    />
                                    <label htmlFor="video-upload" className="cursor-pointer">
                                        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                                            <UploadIcon size={40} className="text-blue-600" />
                                        </div>
                                        <p className="text-lg font-medium text-gray-700 mb-2">
                                            Cliquez pour sélectionner une vidéo
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            MP4, AVI, MOV, WebM • Maximum 500 MB
                                        </p>
                                    </label>
                                </div>
                            ) : (
                                <div className="border-2 border-blue-200 rounded-xl p-6 bg-blue-50">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <FileVideo size={28} className="text-white" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-gray-900 truncate">
                                                    {selectedFile.name}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                        </div>
                                        {!uploading && (
                                            <button
                                                type="button"
                                                onClick={removeFile}
                                                className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                                            >
                                                <X size={24} />
                                            </button>
                                        )}
                                    </div>

                                    {preview && (
                                        <video
                                            src={preview}
                                            controls
                                            className="w-full rounded-lg shadow-md"
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        {uploadProgress > 0 && uploadProgress < 100 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-blue-900">
                                        Upload en cours...
                                    </span>
                                    <span className="font-semibold text-blue-600">
                                        {uploadProgress}%
                                    </span>
                                </div>
                                <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-blue-700 flex items-center gap-2">
                                    <AlertCircle size={14} />
                                    Ne fermez pas cette page pendant l'upload
                                </p>
                            </div>
                        )}

                        {uploadProgress === 100 && !uploading && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                                <div className="p-2 bg-green-500 rounded-full">
                                    <Check size={20} className="text-white" />
                                </div>
                                <p className="font-medium text-green-900">
                                    Punchline uploadée avec succès !
                                </p>
                            </div>
                        )}

                        <div className="flex gap-4 pt-4">
                            <button
                                type="submit"
                                disabled={!selectedFile || uploading}
                                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3.5 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                            >
                                {uploading
                                    ? `Upload en cours... ${uploadProgress}%`
                                    : 'Publier la puchline'}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigateTo('home')}
                                disabled={uploading}
                                className="px-8 py-3.5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Annuler
                            </button>
                        </div>
                    </form>
                </div>

                <div className="mt-6 space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <p className="text-sm text-blue-900">
                            <strong>Conseil :</strong> Les vidéos de bonne qualité avec des titres
                            descriptifs et des miniatures attrayantes obtiennent plus de vues.
                        </p>
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-sm text-amber-900">
                            <strong>Format recommandé :</strong> MP4 avec codec H.264 pour une meilleure compatibilité
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Upload;