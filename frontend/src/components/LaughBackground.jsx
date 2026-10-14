import React, { useEffect, useRef } from 'react';
import { createLaughDoodles } from '../utils/laughDoodles';
import { isMotionRunning, onFrame } from '../utils/lusionMotion';

// Fond animé de l'accueil : doodles au trait qui montent et piquent des fous rires.
// Branché sur la boucle rAF de lusionMotion (une seule boucle pour tout le site) ;
// image fixe quand l'appareil demande de réduire les animations.
const LaughBackground = () => {
    const ref = useRef(null);

    useEffect(() => {
        const animate = isMotionRunning();
        const scene = createLaughDoodles(ref.current, { animate });
        const off = animate ? onFrame(scene.frame) : () => {};
        return () => {
            off();
            scene.dispose();
        };
    }, []);

    return <div ref={ref} className="lt-bg" aria-hidden="true" />;
};

export default LaughBackground;
