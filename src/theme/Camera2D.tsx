import React from 'react';

// Camera2D — a motivated virtual camera over the 1920×1080 canvas. Maps a focus
// point (x,y in canvas space) to screen centre at a given zoom, so a scene can
// push in on a detail and pan between elements. The child draws at full canvas
// coordinates; this wrapper reframes it. The x/y/zoom are already interpolated
// by the choreography engine, so this component is a pure transform.
export const Camera2D: React.FC<{
  x: number;
  y: number;
  zoom: number;
  children: React.ReactNode;
}> = ({x, y, zoom, children}) => {
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          width: 1920,
          height: 1080,
          transformOrigin: '0 0',
          transform: `translate(${960 - x * zoom}px, ${540 - y * zoom}px) scale(${zoom})`,
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
};
