import React, {createContext, useCallback, useContext, useEffect, useMemo, useState,} from "react";

const NavigationContext = createContext(null);

const getPageFromHash = () => {
    const hash = window.location.hash || "";
    const withoutPrefix = hash.replace(/^#\//, "").trim();
    const page = withoutPrefix.split("?")[0];
    return page || "home";
};

const getQueryFromHash = () => {
    const hash = window.location.hash || "";
    const withoutPrefix = hash.replace(/^#\//, "").trim();
    const queryString = withoutPrefix.split("?")[1] || "";
    const params = new URLSearchParams(queryString);
    return params.get("q") || "";
};

const setHashPage = (page) => {
    window.location.hash = `#/${page}`;
};

export const NavigationProvider = ({ children }) => {
    const [currentPage, setCurrentPage] = useState(getPageFromHash());
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [searchQuery, setSearchQuery] = useState(getQueryFromHash);
    const [navigationHistory, setNavigationHistory] = useState([getPageFromHash()]);

    useEffect(() => {
        const onHashChange = () => {
            const page = getPageFromHash();
            const query = getQueryFromHash();
            setCurrentPage(page);
            setSearchQuery(query);
            setNavigationHistory((prev) => {
                if (prev[prev.length - 1] === page) return prev;
                return [...prev, page];
            });
        };

        window.addEventListener("hashchange", onHashChange);

        const initial = getPageFromHash();
        if (!window.location.hash) setHashPage(initial);

        return () => window.removeEventListener("hashchange", onHashChange);
    }, []);

    const navigateTo = useCallback((page) => {
        setHashPage(page);
    }, []);

    const navigateToVideo = useCallback(
        (videoId, videoData = null) => {
            const video = videoData || { id: videoId, title: "Chargement en cours..." };
            setSelectedVideo(video);
            setHashPage("video");
        },
        []
    );

    const goBack = useCallback(() => {
        if (navigationHistory.length > 1) {
            window.history.back();
        } else {
            setHashPage("home");
        }
    }, [navigationHistory.length]);

    const goHome = useCallback(() => {
        setSelectedVideo(null);
        setNavigationHistory(["home"]);
        setHashPage("home");
    }, []);

    const updateSearch = useCallback((query) => {
        setSearchQuery(query);
    }, []);

    const value = useMemo(
        () => ({
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
        }),
        [
            currentPage,
            selectedVideo,
            searchQuery,
            navigationHistory,
            navigateTo,
            navigateToVideo,
            goBack,
            goHome,
            updateSearch,
        ]
    );

    return (
        <NavigationContext.Provider value={value}>
            {children}
        </NavigationContext.Provider>
    );
};

export const useNavigation = () => {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error("useNavigation must be used inside a NavigationProvider");
    }
    return context;
};