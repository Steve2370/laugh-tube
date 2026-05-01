export const getAvatarUrl = (avatarUrl, username = '') => {
    if (!avatarUrl || avatarUrl.includes('default')) return null;
    if (avatarUrl.startsWith('http')) return avatarUrl;
    if (avatarUrl.startsWith('/')) return avatarUrl;
    return `/uploads/profiles/${avatarUrl}`;
};

export const getAvatarFallback = (username = '') => {
    return username ? username.charAt(0).toUpperCase() : '?';
};