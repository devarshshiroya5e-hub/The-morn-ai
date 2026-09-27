import React, { useState } from 'react';

interface InitialAvatarProps {
  name: string;
  src?: string | null;
  className?: string;
  textClassName?: string;
}

export const InitialAvatar: React.FC<InitialAvatarProps> = ({
  name,
  src,
  className = 'h-10 w-10 rounded-xl',
  textClassName = 'text-sm font-black',
}) => {
  const [broken, setBroken] = useState(false);
  const initial = (name.trim().charAt(0) || 'M').toUpperCase();

  return src && !broken ? (
    <img
      src={src}
      alt=""
      className={`${className} object-cover`}
      onError={() => setBroken(true)}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`${className} grid place-items-center border border-violet-200 bg-gradient-to-br from-violet-100 via-white to-sky-100 text-violet-700 shadow-sm ${textClassName}`}
    >
      {initial}
    </span>
  );
};
