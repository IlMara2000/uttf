'use client'

import { Star } from 'lucide-react';

type ReviewStarsProps = {
  rating: number;
  onChange?: (value: number) => void;
  size?: number;
  interactive?: boolean;
};

export default function ReviewStars({
  rating,
  onChange,
  size = 28,
  interactive = false,
}: ReviewStarsProps) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const fill = Math.max(0, Math.min(1, rating - index));

        return (
          <div
            key={index}
            className={`relative ${interactive ? 'cursor-pointer' : ''}`}
            style={{ width: size, height: size }}
          >
            {interactive && onChange ? (
              <button
                type="button"
                aria-label={`Assegna ${index + 1} stelle su 5`}
                className="absolute inset-0 z-20 h-full w-full"
                onClick={() => onChange(index + 1)}
              />
            ) : null}

            <Star
              size={size}
              className="absolute inset-0 text-zinc-700 transition-transform duration-200"
              strokeWidth={1.8}
            />

            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star
                size={size}
                className="fill-[#FF914D] text-[#FF914D] drop-shadow-[0_0_10px_rgba(255,145,77,0.15)]"
                strokeWidth={1.8}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
