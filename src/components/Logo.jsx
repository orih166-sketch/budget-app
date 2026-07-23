export default function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      <defs>
        <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e8d48a" />
          <stop offset="50%" stopColor="#c9a84c" />
          <stop offset="100%" stopColor="#8a6f2a" />
        </linearGradient>
        <linearGradient id="bar-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e8d48a" />
          <stop offset="100%" stopColor="#c9a84c" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="17" fill="#1a1830" stroke="url(#gold-gradient)" strokeWidth="1.5" />
      <rect x="8" y="18" width="4" height="8" rx="1" fill="url(#bar-gradient)" />
      <rect x="14" y="13" width="4" height="13" rx="1" fill="url(#bar-gradient)" />
      <rect x="20" y="9" width="4" height="17" rx="1" fill="url(#bar-gradient)" />
      <path d="M10 20 Q17 10 24 8" stroke="#e8d48a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <circle cx="24" cy="8" r="2" fill="#e8d48a" />
    </svg>
  )
}
