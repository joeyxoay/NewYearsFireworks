import React, { useState } from 'react';

export const WebcamFeed = ({ videoRef, isLoaded }: any) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="webcam-container"
      style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.5s ease',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        style={{
          width: isHovered ? '240px' : '160px', // Expands when you look at it
          height: isHovered ? '180px' : '120px',
          borderRadius: '12px',
          border: '1px solid rgba(212, 175, 55, 0.5)', // Gold border
          overflow: 'hidden',
          background: '#000',
          boxShadow: isHovered ? '0 0 20px rgba(212, 175, 55, 0.3)' : '0 0 10px rgba(0,0,0,0.5)',
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          position: 'relative'
        }}
      >
        {/* The Video Element */}
        <video
          ref={videoRef}
          style={{
            width: '100%', 
            height: '100%', 
            objectFit: 'cover',
            transform: 'scaleX(-1)', // Mirror effect so movement feels natural
            opacity: isLoaded ? 0.8 : 0 // Fade in when ready
          }}
          playsInline
          muted
        />
        
        {/* Status Indicator (Red dot if loading, Green dot if active) */}
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isLoaded ? '#00FF00' : '#FF0000',
          boxShadow: isLoaded ? '0 0 5px #00FF00' : 'none'
        }} />
        
        {!isLoaded && (
           <div style={{
             position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
             color: '#D4AF37', fontFamily: 'monospace', fontSize: '10px'
           }}>
             INITIALIZING...
           </div>
        )}
      </div>
    </div>
  );
};