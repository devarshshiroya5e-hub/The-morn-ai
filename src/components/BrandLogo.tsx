import React from 'react';
import logoSrc from '../assets/mornai-logo.jpg';

interface BrandLogoProps {
  className?: string;
  imgClassName?: string;
  alt?: string;
}

/** Official MornAI mark — curved edges by default for header/chrome. */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = 'grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-[0_10px_26px_rgba(15,23,42,.14)] ring-1 ring-slate-200/80',
  imgClassName = 'h-full w-full rounded-[inherit] object-cover',
  alt = 'MornAI',
}) => (
  <span className={className}>
    <img src={logoSrc} alt={alt} className={imgClassName} draggable={false} />
  </span>
);

export { logoSrc as mornaiLogoSrc };
