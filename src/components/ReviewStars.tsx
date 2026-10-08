"use client";

type ReviewStarsProps = {
  rating: number;
  onChange?: (value: number) => void;
  size?: number;
  interactive?: boolean;
};

/** The existing rating API is kept; the public control is now purely typographic. */
export default function ReviewStars({
  rating,
  onChange,
  interactive = false,
}: ReviewStarsProps) {
  if (!interactive)
    return (
      <span
        className="rating-readout"
        aria-label={`Valutazione: ${rating} su 5`}
      >
        <strong>{rating}</strong>
        <span>/ 5</span>
      </span>
    );
  return (
    <div
      className="rating-scale"
      role="group"
      aria-label="Scegli un voto da 1 a 5"
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          type="button"
          key={value}
          className="rating-value"
          aria-label={`Assegna ${value} su 5`}
          aria-pressed={rating === value}
          onClick={() => onChange?.(value)}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
