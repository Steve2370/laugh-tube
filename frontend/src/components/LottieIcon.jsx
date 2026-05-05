import React, { useRef } from 'react';
import Lottie from 'lottie-react';

const LottieIcon = ({ animationData, size = 32, loop = false, autoplay = false, playOnHover = true, className = '' }) => {
    const lottieRef = useRef(null);

    return (
        <div
            style={{ width: size, height: size }}
            className={`inline-flex items-center justify-center ${className}`}
            onMouseEnter={() => playOnHover && lottieRef.current?.play()}
            onMouseLeave={() => { playOnHover && lottieRef.current?.stop(); playOnHover && lottieRef.current?.goToAndStop(0, true); }}
        >
            <Lottie
                lottieRef={lottieRef}
                animationData={animationData}
                loop={loop}
                autoplay={autoplay}
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
};

export default LottieIcon;