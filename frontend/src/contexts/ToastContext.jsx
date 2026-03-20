import React, { createContext, useContext, useCallback, useMemo, useState, useEffect, useRef } from 'react';

const ToastContext = createContext(null);

const Icons = {
    success: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="10" fill="rgba(255,255,255,0.2)" />
            <path d="M6 10.5L8.5 13L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    error: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="10" fill="rgba(255,255,255,0.2)" />
            <path d="M7 7L13 13M13 7L7 13" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),
    info: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="10" fill="rgba(255,255,255,0.2)" />
            <path d="M10 9V14" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <circle cx="10" cy="6.5" r="1" fill="white" />
        </svg>
    ),
};

const STYLES = {
    success: {
        bg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
        glow: 'rgba(16, 185, 129, 0.4)',
    },
    error: {
        bg: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
        glow: 'rgba(220, 38, 38, 0.4)',
    },
    info: {
        bg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        glow: 'rgba(37, 99, 235, 0.4)',
    },
};

function Toast({ id, message, type, duration, onRemove }) {
    const [phase, setPhase] = useState('enter'); // 'enter' → 'idle' → 'exit'
    const timerRef = useRef(null);
    const style = STYLES[type] || STYLES.info;

    useEffect(() => {
        const enterTimeout = setTimeout(() => setPhase('idle'), 350);

        timerRef.current = setTimeout(() => setPhase('exit'), duration - 400);

        return () => {
            clearTimeout(enterTimeout);
            clearTimeout(timerRef.current);
        };
    }, [duration]);

    const handleExitEnd = () => {
        if (phase === 'exit') onRemove(id);
    };

    const containerStyle = {
        background: style.bg,
        boxShadow: `0 4px 24px ${style.glow}, 0 1px 3px rgba(0,0,0,0.15)`,
        transform: phase === 'exit' ? 'translateX(calc(100% + 24px)) scale(0.92)' : 'translateX(0) scale(1)',
        opacity: phase === 'exit' ? 0 : 1,
        transition: phase === 'enter'
            ? 'transform 0.42s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease'
            : 'transform 0.35s cubic-bezier(0.55, 0, 1, 1), opacity 0.25s ease',
    };

    const progressStyle = {
        width: phase === 'exit' ? '0%' : phase === 'idle' ? '0%' : '100%',
        transition: phase === 'idle'
            ? `width ${duration - 400}ms linear`
            : 'none',
    };

    return (
        <div
            style={containerStyle}
            onTransitionEnd={handleExitEnd}
            className="relative w-[340px] rounded-xl overflow-hidden text-white select-none"
            role="status"
            aria-live="polite"
        >
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 50%)',
                }}
            />

            <div className="relative flex items-start gap-3 px-4 py-3.5">
                <div className="flex-shrink-0 mt-0.5">{Icons[type] || Icons.info}</div>
                <div className="flex-1 text-sm font-medium leading-snug">{message}</div>
                <button
                    onClick={() => setPhase('exit')}
                    className="flex-shrink-0 text-white/60 hover:text-white transition-colors duration-150 mt-0.5"
                    aria-label="Fermer"
                    style={{ lineHeight: 1 }}
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                </button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/20">
                <div
                    className="h-full bg-white/50 rounded-full"
                    style={progressStyle}
                />
            </div>
        </div>
    );
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const remove = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const show = useCallback((message, type = 'info', duration = 3500) => {
        const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        setToasts(prev => [...prev, { id, message, type, duration }]);
    }, []);

    const api = useMemo(() => ({
        success: (msg, d) => show(msg, 'success', d),
        error:   (msg, d) => show(msg, 'error',   d),
        info:    (msg, d) => show(msg, 'info',    d),
        show,
    }), [show]);

    return (
        <ToastContext.Provider value={api}>
            {children}

            <div
                className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5"
                style={{ perspective: '800px' }}
            >
                {toasts.map(t => (
                    <Toast
                        key={t.id}
                        id={t.id}
                        message={t.message}
                        type={t.type}
                        duration={t.duration}
                        onRemove={remove}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast() doit être utilisé dans <ToastProvider>');
    return context;
}