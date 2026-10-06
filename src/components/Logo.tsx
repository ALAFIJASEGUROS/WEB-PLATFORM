export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="28" height="28" viewBox="0 0 48 48" aria-hidden>
        <path
          d="M24 4L8 12v14c0 9 8 16 16 18 8-2 16-9 16-18V12L24 4z"
          fill="var(--color-heading)"
        />
        <path
          d="M16 25l6 6 11-12"
          stroke="#2ECCB3"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <span className="text-lg font-extrabold tracking-tight text-heading">
        Segu<span className="text-brand">AlaFija</span>
      </span>
    </span>
  );
}
