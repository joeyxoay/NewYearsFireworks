import React, { useState } from 'react';

export const WebcamFeed = ({ videoRef, isLoaded }: any) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="absolute top-6 right-6 z-50 flex items-center justify-center transition-all duration-500"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        style={{
          width: isHovered ? '160px' : '12px',
          height: isHovered ? '120px' : '12px',
          borderRadius: isHovered ? '10px' : '50%',
          border: '1px solid #D4AF37',
          overflow: 'hidden',
          background: '#000',
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          boxShadow: isHovered ? '0 10px 30px rgba(0,0,0,0.5)' : '0 0 10px #D4AF37',
          position: 'relative'
        }}
      >
        <video
          ref={videoRef}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transform: 'scaleX(-1)', opacity: isHovered ? 0.8 : 0
          }}
          playsInline
          muted
        />
        
        {/* The Dot Indicator (Only visible when not hovered) */}
        {!isHovered && (
          <div style={{ 
            width: '100%', height: '100%', background: isLoaded ? '#D4AF37' : '#333',
            animation: isLoaded ? 'pulse 2s infinite' : 'none'
          }} />
        )}
      </div>
    </div>
  );
};