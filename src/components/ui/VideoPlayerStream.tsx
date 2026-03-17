import React from 'react';
import { cn } from '../../lib/utils';
import { BUNNY } from '../../lib/bunny';

interface VideoPlayerStreamProps {
  videoId: string;
  className?: string;
}

export const VideoPlayerStream = ({ 
  videoId, 
  className 
}: VideoPlayerStreamProps) => {
  if (!videoId) return null;

  return (
    <div 
      className={cn("relative rounded-2xl overflow-hidden bg-black aspect-video shadow-2xl border border-slate-800", className)}
    >
      <iframe
        src={`https://iframe.mediadelivery.net/embed/${BUNNY.libraryId}/${videoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`}
        loading="lazy"
        style={{ border: 0, position: "absolute", top: 0, height: "100%", width: "100%" }}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen={true}
      />
      
      {/* Overlay to block right-click and common download attempts */}
      <div 
        className="absolute inset-0 pointer-events-none"
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
};
