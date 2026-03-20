import React from 'react';

const LoadingSpinner = ({ size = 'default', fullScreen = true }) => {
    const sizeClasses = {
        small: 'h-6 w-6 border-2',
        default: 'h-12 w-12 border-b-2',
        large: 'h-16 w-16 border-4'
    };

    const spinner = (
        <div className={`animate-spin rounded-full ${sizeClasses[size]} border-blue-500`}></div>
    );

    if (fullScreen) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                {spinner}
            </div>
        );
    }

    return spinner;
};

export default LoadingSpinner;