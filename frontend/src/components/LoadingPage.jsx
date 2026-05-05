import React from 'react';
import Lottie from 'lottie-react';
import PacmanAnimation from '../assets/lottie/pacman.json';

const LoadingPage = ({ size = 80, message = '' }) => (
    <div className="flex flex-col items-center justify-center py-12">
        <Lottie
            animationData={PacmanAnimation}
            loop={true}
            autoplay={true}
            style={{ width: size, height: size }}
        />
        {message && <p className="text-gray-500 mt-2 text-sm">{message}</p>}
    </div>
);

export default LoadingPage;