import React from 'react';

interface IsometricTableProps {
  children: React.ReactNode;
  contentClassName?: string;
}

export const IsometricTable: React.FC<IsometricTableProps> = ({ children, contentClassName = '' }) => {
  return (
    <div className="rey-gameplay-stage">
      <div className="absolute inset-0 bg-radial from-transparent via-[#05110a]/25 to-[#020704]/90 pointer-events-none" />
      <div className="rey-gameplay-grid pointer-events-none" />

      <div className="rey-stage-prop rey-stage-prop-left" aria-hidden="true">
        <div className="rey-prop-card" />
        <div className="rey-prop-card" />
        <div className="rey-prop-card" />
      </div>
      <div className="rey-stage-prop rey-stage-prop-right" aria-hidden="true">
        <div className="rey-prop-leaf rey-prop-leaf-a" />
        <div className="rey-prop-leaf rey-prop-leaf-b" />
        <div className="rey-prop-leaf rey-prop-leaf-c" />
      </div>

      <div className="absolute top-1/4 left-1/6 w-1.5 h-1.5 rounded-full bg-amber-200/60 blur-xs animate-firefly pointer-events-none" />
      <div
        className="absolute top-1/3 right-1/5 w-1.5 h-1.5 rounded-full bg-yellow-300/50 blur-xs animate-firefly pointer-events-none"
        style={{ animationDelay: '1s' }}
      />
      <div
        className="absolute bottom-1/4 left-1/4 w-1.5 h-1.5 rounded-full bg-emerald-200/50 blur-xs animate-firefly pointer-events-none"
        style={{ animationDelay: '1.8s' }}
      />

      <div className={`rey-gameplay-content ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
};
