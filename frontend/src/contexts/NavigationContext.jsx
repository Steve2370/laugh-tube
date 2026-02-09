import React, { createContext, useContext, useState, useCallback } from "react";

const NavigationContext = createContext(null);

export const NavigationProvider = ({ children }) => {
    const [currentPage, setCurrentPage] = useState('home');
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [navigationHistory, setNavigationHistory] = useState(['home']);

    const navigateTo = useCallback((page) => {
        setCurrentPage(page);
        setNavigationHistory(prev => [...prev, page]);
    }, []);

    const navigateToVideo = useCallback((videoId, videoData = null) => {
        const video = videoData || {
            id: videoId,
            title: 'Chargement en cours...',
        };
        setSelectedVideo(video);
        navigateTo('video');
    }, [navigateTo]);

    const goBack = useCallback(() => {
        if (navigationHistory.length > 1) {
            const newHistory = [...navigationHistory];
            newHistory.pop();
            const previousPage = newHistory[newHistory.length - 1];
            setNavigationHistory(newHistory);
            setCurrentPage(previousPage);
        } else {
            setCurrentPage('home');
        }
    }, [navigationHistory]);

    const goHome = useCallback(() => {
        setCurrentPage('home');
        setNavigationHistory(['home']);
        setSelectedVideo(null);
    }, []);

    const updateSearch = useCallback((query) => {
        setSearchQuery(query);
    }, []);

    const value = {
        currentPage,
        selectedVideo,
        searchQuery,
        navigationHistory,
        navigateTo,
        navigateToVideo,
        goBack,
        goHome,
        updateSearch,
        setSelectedVideo,
    };

    return (
        <NavigationContext.Provider value={value}>
            {children}
        </NavigationContext.Provider>
    );
};

export const useNavigation = () => {
    const context = useContext(NavigationContext);

    if (!context) {
        throw new Error(
            "useNavigation must be used inside a NavigationProvider"
        );
    }

    return context;
};
