import { useState } from "react";


interface AppStoreBannerProps {
    appStoreUrl: string;
    appName?: string;
    appTagline?: string;
    logoSrc?: string;
}

const isIPhone = (): boolean => /iPhone/i.test(navigator.userAgent);

const useVisibility = (initialVisible: boolean) => {
    const [visible, setVisible] = useState(initialVisible);
    const hide = () => setVisible(false);
    return { visible, hide };
};

interface AppLogoProps {
    src: string;
    alt: string;
}

const AppLogo: React.FC<AppLogoProps> = ({ src, alt }) => (
    <img
        src={src}
alt={alt}
style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, objectFit: 'cover' }}
/>
);

interface AppInfoProps {
    name: string;
    tagline: string;
}

const AppInfo: React.FC<AppInfoProps> = ({ name, tagline }) => (
    <div style={{ flex: 1, minWidth: 0 }}>
<div style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>
{name}
</div>
<div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>
{tagline}
</div>
</div>
);

interface DownloadButtonProps {
    url: string;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ url }) => (
    <a
        href={url}
target="_blank"
rel="noopener noreferrer"
style={{
    background: '#0A84FF',
        color: '#fff',
        borderRadius: 20,
        padding: '6px 14px',
        fontSize: 13,
        fontWeight: 600,
        textDecoration: 'none',
        flexShrink: 0,
        whiteSpace: 'nowrap',
}}
>
Télécharger
</a>
);

interface CloseButtonProps {
    onClose: () => void;
}

const CloseButton: React.FC<CloseButtonProps> = ({ onClose }) => (
    <button
        onClick={onClose}
aria-label="Fermer"
style={{
    background: 'none',
        border: 'none',
        color: 'rgba(255,255,255,0.4)',
        cursor: 'pointer',
        padding: 4,
        flexShrink: 0,
        fontSize: 16,
        lineHeight: 1,
}}
>
✕
    </button>
);

const AppStoreBanner: React.FC<AppStoreBannerProps> = ({
    appStoreUrl,
    appName = "LaughTube",
    appTagline = "La plateforme québécoise de l'humour",
    logoSrc = "/Laugh Tale Version2.png"
}) => {
    const { visible, hide } = useVisibility(true);

    if (!isIPhone() || !visible) return null;

    return (
        <div
            role="banner"
    style={{
        position: 'fixed',
            top: 0, left: 0, right: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            borderBottom: '0.5px solid rgba(255,255,255,0.1)',
    }}
>
    <AppLogo src={logoSrc} alt={appName} />
    <AppInfo name={appName} tagline={appTagline} />
    <DownloadButton url={appStoreUrl} />
    <CloseButton onClose={hide} />
    </div>
);
};

export default AppStoreBanner;