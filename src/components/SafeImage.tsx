import { useState } from 'react';
import { Shield } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export function SafeImage({ src, alt, className = '', loading = 'lazy' }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#18181B] via-[#121215] to-[#09090B] text-zinc-500 select-none ${className}`}
      >
        <Shield className="w-8 h-8 text-[#DC2626]/70" aria-hidden="true" />
        <span className="font-brand text-xs tracking-[0.2em] text-zinc-400">BN_STONE</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
