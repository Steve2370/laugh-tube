import React, { useEffect, useState, useCallback } from 'react';
import { useNavigation } from '../contexts/NavigationContext.jsx';
import VideoCard from '../components/VideoCard.jsx';
import apiService from '../services/apiService.js';
import { Search as SearchIcon } from 'lucide-react';

const Search = () => {
    const { searchQuery } = useNavigation();
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const doSearch = useCallback(async (query) => {
        if (!query.trim()) return;
        setLoading(true);
        setSearched(true);
        try {
            const response = await apiService.search(query);
            const videos = response.videos || response.results || response.data || [];
            setResults(Array.isArray(videos) ? videos : []);
        } catch (err) {
            console.error('Erreur recherche:', err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (searchQuery) {
            doSearch(searchQuery);
        }
    }, [searchQuery, doSearch]);

    const handleVideoClick = (video) => {
        localStorage.setItem('currentVideo', JSON.stringify(video));
        window.location.hash = '#/video';
    };

    return (
        <div className="pt-20 px-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <SearchIcon size={24} />
                    {searchQuery
                        ? `Résultats pour "${searchQuery}"`
                        : 'Recherche'}
                </h1>
                {searched && !loading && (
                    <p className="text-gray-500 mt-1">
                        {results.length} résultat{results.length !== 1 ? 's' : ''}
                    </p>
                )}
            </div>

            {loading && (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent"></div>
                </div>
            )}

            {!loading && searched && results.length === 0 && (
                <div className="text-center py-20">
                    <SearchIcon size={64} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucun résultat</h3>
                    <p className="text-gray-500">Essayez avec d'autres mots-clés</p>
                </div>
            )}

            {!loading && results.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {results.map((video) => (
                        <VideoCard
                            key={video.id}
                            video={video}
                            onClick={() => handleVideoClick(video)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Search;