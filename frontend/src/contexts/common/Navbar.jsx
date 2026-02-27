import React, { useEffect, useRef, useState } from "react";
import {
    ChevronDown,
    LayoutDashboard,
    LogOut,
    MessageSquare,
    Search,
    Settings,
    Upload,
    User,
} from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import { useToast } from "../ToastContext.jsx";
import NotificationDropdown from "./NotificationDropdown";

export default function Navbar() {
    const { user, logout, isAuthenticated } = useAuth();
    const toast = useToast();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef(null);

    const [navEmojis, setNavEmojis] = useState([]);
    const emojiPool = ['😂','🤣','😁','🔥','👏','😭','💯','🎭'];
    useEffect(() => {
        const spawn = () => {
            const emoji = emojiPool[Math.floor(Math.random() * emojiPool.length)];
            const id = Date.now();
            setNavEmojis(prev => [...prev, {
                id,
                emoji,
                left: `${5 + Math.random() * 90}%`,
                delay: 0,
            }]);
            setTimeout(() => setNavEmojis(prev => prev.filter(e => e.id !== id)), 2000);
        };
        const interval = setInterval(spawn, 1800);
        return () => clearInterval(interval);
    }, []);

    const navigateTo = (route) => {
        window.location.hash = `#/${route}`;
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigateTo(`search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleDropdownItemClick = (action) => {
        setIsDropdownOpen(false);
        action();
    };

    const handleLogout = async () => {
        await logout();
        toast.success('Déconnexion réussie');
        navigateTo('home');
    };

    const isAdmin = user?.role === 'admin' || user?.is_admin === true;

    const profileImage = user?.id
        ? `/api/users/${user.id}/profile-image`
        : null;

    return (
        <header
            className="fixed top-0 left-0 right-0 z-50 text-black text-sm shadow-md backdrop-blur-md"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.3)" }}
        >
            <style>{`
                @keyframes navEmojiFloat {
                    0%   { opacity: 0; transform: translateY(0) scale(0.6); }
                    15%  { opacity: 1; transform: translateY(-4px) scale(1); }
                    85%  { opacity: 1; transform: translateY(-18px) scale(1); }
                    100% { opacity: 0; transform: translateY(-26px) scale(0.8); }
                }
                .nav-emoji {
                    position: absolute;
                    bottom: 2px;
                    font-size: 1rem;
                    pointer-events: none;
                    animation: navEmojiFloat 2s ease-in-out forwards;
                    z-index: 0;
                }
            `}</style>

            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {navEmojis.map(e => (
                    <span key={e.id} className="nav-emoji" style={{ left: e.left }}>
                        {e.emoji}
                    </span>
                ))}
            </div>
            <nav className="container mx-auto px-6 py-2">
                <div className="grid grid-cols-3 items-center gap-8">
                    <div className="flex justify-start">
                        <button
                            onClick={() => navigateTo("home")}
                            className="text-black flex items-center"
                        >
                            <img
                                src="/Laugh Tale Version2.png"
                                alt="Laugh Tube Logo"
                                className="h-12 w-auto scale-125 object-contain"
                            />
                        </button>
                    </div>

                    <div className="flex justify-center">
                        <div className="w-full max-w-md -ml-10">
                            <form onSubmit={handleSearch} className="relative w-full">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Rechercher..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-white bg-opacity-20 backdrop-blur-sm border border-gray-300 border-opacity-30 rounded-full text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all duration-300"
                                    />
                                    <Search
                                        size={18}
                                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black"
                                    />
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="flex justify-end items-center space-x-3">
                        {isAuthenticated && user ? (
                            <>
                                <NotificationDropdown />

                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        onClick={() => setIsDropdownOpen((v) => !v)}
                                        className="flex items-center gap-2 text-black hover:text-gray-600 hover:bg-gray-200 hover:bg-opacity-50 px-3 py-2 rounded-lg transition-all duration-300 text-sm font-medium"
                                    >
                                        <div className="relative">
                                            {profileImage ? (
                                                <img
                                                    src={profileImage}
                                                    alt={`Photo de profil de ${user.username}`}
                                                    className="w-6 h-6 rounded-full object-cover border-2 border-gray-300 border-opacity-50 shadow-md"
                                                />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center border-2 border-gray-300 border-opacity-50 shadow-md">
                                                    <User size={14} className="text-white" />
                                                </div>
                                            )}
                                        </div>

                                        <span className="hidden xl:inline">{user.username}</span>

                                        <ChevronDown
                                            size={16}
                                            className={`transition-transform duration-200 ${
                                                isDropdownOpen ? "rotate-180" : ""
                                            }`}
                                        />
                                    </button>

                                    {isDropdownOpen && (
                                        <div className="absolute right-0 mt-2 w-52 bg-white bg-opacity-95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 border-opacity-50 py-1 z-50">
                                            <div className="px-4 py-3 border-b border-gray-200 border-opacity-50">
                                                <div className="flex items-center gap-3">
                                                    {profileImage ? (
                                                        <img
                                                            src={profileImage}
                                                            alt={`Photo de profil de ${user.username}`}
                                                            className="w-8 h-8 rounded-full object-cover border-2 border-gray-300"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                                                            <User size={16} className="text-white" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate">
                                                            {user.username}
                                                        </p>
                                                        <p className="text-xs text-gray-500 truncate">
                                                            {user.email}
                                                        </p>
                                                        {isAdmin && (
                                                            <span className="inline-block mt-0.5 text-xs font-semibold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">
                                                                Admin
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="py-1">
                                                <button
                                                    onClick={() =>
                                                        handleDropdownItemClick(() => navigateTo("profile"))
                                                    }
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:bg-opacity-50 flex items-center gap-3 transition-colors"
                                                >
                                                    <User size={16} />
                                                    Profile
                                                </button>

                                                <button
                                                    onClick={() =>
                                                        handleDropdownItemClick(() => navigateTo("upload"))
                                                    }
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:bg-opacity-50 flex items-center gap-3 transition-colors"
                                                >
                                                    <Upload size={16} />
                                                    Uploader une punchline
                                                </button>

                                                <button
                                                    onClick={() =>
                                                        handleDropdownItemClick(() => navigateTo("settings"))
                                                    }
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:bg-opacity-50 flex items-center gap-3 transition-colors"
                                                >
                                                    <Settings size={16} />
                                                    Paramètres
                                                </button>

                                                {isAdmin && (
                                                    <>
                                                        <div className="my-1 border-t border-gray-100" />
                                                        <button
                                                            onClick={() =>
                                                                handleDropdownItemClick(() => navigateTo("admin"))
                                                            }
                                                            className="w-full text-left px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50 flex items-center gap-3 transition-colors"
                                                        >
                                                            <LayoutDashboard size={16} />
                                                            Dashboard Admin
                                                        </button>
                                                    </>
                                                )}
                                            </div>

                                            <button
                                                onClick={() =>
                                                    handleDropdownItemClick(() => navigateTo("contact"))
                                                }
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:bg-opacity-50 flex items-center gap-3 transition-colors"
                                            >
                                                <MessageSquare size={16} />
                                                Nous contacter
                                            </button>

                                            <div className="border-t border-gray-200 border-opacity-50 py-1">
                                                <button
                                                    onClick={() => handleDropdownItemClick(handleLogout)}
                                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:bg-opacity-50 flex items-center gap-3 transition-colors"
                                                >
                                                    <LogOut size={16} />
                                                    Déconnexion
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => navigateTo("contact")}
                                    className="flex items-center gap-2 text-black hover:text-gray-600 hover:bg-gray-200 hover:bg-opacity-50 px-3 py-2 rounded-lg transition-all duration-300 text-sm font-medium"
                                >
                                    <MessageSquare size={16} />
                                    <span className="hidden lg:inline">Contact</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </nav>
        </header>
    );
}