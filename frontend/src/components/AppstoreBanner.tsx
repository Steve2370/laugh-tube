import { useEffect, useState } from "react";

// Bannière « Télécharge l'app » affichée tout en haut du site, au-dessus du menu,
// pour chaque visiteur sur iPhone (l'app n'existe que sur l'App Store).
// Fermée avec ✕ : elle ne revient pas pendant la visite, mais réapparaît à la suivante.

interface AppStoreBannerProps {
    appStoreUrl: string;
    appName?: string;
    appTagline?: string;
    logoSrc?: string;
}

export const APP_BANNER_HEIGHT = 64;
const CLOSED_KEY = "lt_app_banner_closed";

// iPhone / iPod seulement (les iPad récents se présentent comme un Mac).
const isIPhone = (): boolean => /iPhone|iPod/i.test(navigator.userAgent);

// Site ouvert depuis l'écran d'accueil : inutile de proposer l'app.
const isStandalone = (): boolean =>
    window.matchMedia?.("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const closedThisVisit = (): boolean => {
    try {
        return sessionStorage.getItem(CLOSED_KEY) === "1";
    } catch {
        return false;
    }
};

const AppStoreBanner = ({
    appStoreUrl,
    appName = "LaughTube",
    appTagline = "L'humour québécois",
    logoSrc = "/app-icon.png",
}: AppStoreBannerProps) => {
    const [visible, setVisible] = useState(() => isIPhone() && !isStandalone() && !closedThisVisit());

    // Décale le menu et la page de la hauteur de la bannière tant qu'elle est affichée.
    useEffect(() => {
        const root = document.documentElement;
        if (visible) root.style.setProperty("--app-banner-h", `${APP_BANNER_HEIGHT}px`);
        else root.style.removeProperty("--app-banner-h");
        return () => root.style.removeProperty("--app-banner-h");
    }, [visible]);

    const close = () => {
        try {
            sessionStorage.setItem(CLOSED_KEY, "1");
        } catch {
            /* navigation privée : on ferme quand même */
        }
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div
            role="region"
            aria-label={`Télécharger l'application ${appName}`}
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                height: APP_BANNER_HEIGHT,
                zIndex: 60,
                background: "rgba(10,10,15,0.96)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "0 12px 0 16px",
                borderBottom: "0.5px solid rgba(255,255,255,0.1)",
            }}
        >
            <img
                src={logoSrc}
                alt=""
                width={44}
                height={44}
                style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, objectFit: "contain", background: "#fff" }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{appName}</div>
                <div
                    style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.6)",
                        marginTop: 2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {appTagline}
                </div>
            </div>
            <a
                href={appStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    background: "#0A84FF",
                    color: "#fff",
                    borderRadius: 20,
                    padding: "7px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                }}
            >
                Télécharger
            </a>
            <button
                type="button"
                onClick={close}
                aria-label="Fermer"
                style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255,255,255,0.5)",
                    cursor: "pointer",
                    padding: 6,
                    flexShrink: 0,
                    fontSize: 16,
                    lineHeight: 1,
                }}
            >
                ✕
            </button>
        </div>
    );
};

export default AppStoreBanner;
