import React, { useState, useEffect } from 'react';
import { splashScreenAPI } from '../services/apiClient';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fadeOut, setFadeOut] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let completed = false;

    const finish = () => {
      if (completed) return;
      completed = true;
      setFadeOut(true);
      setTimeout(onComplete, 300);
    };

    // Auto-close after 2.5 seconds
    const timer = setTimeout(finish, 2500);

    // Fetch splash image from API
    splashScreenAPI.get().then(data => {
      if (completed) return;
      if (data?.imageUrl && data?.isActive !== false) {
        setImageUrl(data.imageUrl);
        // Close after image displays for duration
        setTimeout(finish, Math.min(data.duration || 2000, 2500));
      } else {
        finish();
      }
    }).catch((error) => {
      console.error('Failed to fetch splash screen:', error);
      if (!completed) finish();
    });

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Hide if no image or not active
  if (!imageUrl && fadeOut) return null;
  if (imageError && fadeOut) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] transition-opacity duration-300 ${fadeOut ? 'opacity-0' : 'opacity-100'} bg-white flex justify-center items-center`}
    >
      <div className="w-full max-w-md h-screen relative overflow-hidden bg-white shadow-2xl">
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Splash"
            className="w-full h-full object-fill"
            onError={(e) => {
              console.error('Splash image failed to load:', imageUrl);
              setImageError(true);
              setFadeOut(true);
              setTimeout(onComplete, 300);
            }}
            onLoad={() => {
              console.log('Splash image loaded successfully:', imageUrl);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default SplashScreen;
