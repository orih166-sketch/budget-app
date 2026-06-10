export default function AppLogo({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5e07a"/>
          <stop offset="30%" stopColor="#c9a84c"/>
          <stop offset="60%" stopColor="#e8c96a"/>
          <stop offset="100%" stopColor="#a07828"/>
        </linearGradient>
        <linearGradient id="goldGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f5e07a"/>
          <stop offset="50%" stopColor="#c9a84c"/>
          <stop offset="100%" stopColor="#8a6520"/>
        </linearGradient>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a1a1a"/>
          <stop offset="100%" stopColor="#0a0a0a"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      {/* Background circle */}
      <circle cx="100" cy="100" r="98" fill="url(#bgGrad)"/>

      {/* Gold border */}
      <circle cx="100" cy="100" r="95" stroke="url(#goldGrad)" strokeWidth="2.5" fill="none"/>
      <circle cx="100" cy="100" r="91" stroke="url(#goldGrad)" strokeWidth="0.5" fill="none" opacity="0.4"/>

      {/* Bar chart — 3 gold bars */}
      {/* Bar 1 (left, shortest) */}
      <rect x="58" y="82" width="16" height="38" rx="2" fill="url(#goldGrad2)" filter="url(#glow)"/>
      <rect x="58" y="82" width="16" height="4" rx="2" fill="#f5e07a" opacity="0.9"/>
      {/* Bar 2 (middle) */}
      <rect x="80" y="68" width="16" height="52" rx="2" fill="url(#goldGrad2)" filter="url(#glow)"/>
      <rect x="80" y="68" width="16" height="4" rx="2" fill="#f5e07a" opacity="0.9"/>
      {/* Bar 3 (right, tallest) */}
      <rect x="102" y="54" width="16" height="66" rx="2" fill="url(#goldGrad2)" filter="url(#glow)"/>
      <rect x="102" y="54" width="16" height="4" rx="2" fill="#f5e07a" opacity="0.9"/>

      {/* Growth curve line */}
      <path d="M62 112 Q82 82 110 58" stroke="url(#goldGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round" filter="url(#glow)"/>

      {/* Arrow head */}
      <path d="M107 52 L116 56 L112 65" stroke="url(#goldGrad)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>

      {/* ₪ symbol at arrow tip */}
      <text x="118" y="52" fontSize="11" fontWeight="800" fill="url(#goldGrad)" fontFamily="Arial" textAnchor="middle" filter="url(#glow)">₪</text>

      {/* Sparkle top */}
      <path d="M100 20 L101.5 25 L106 26.5 L101.5 28 L100 33 L98.5 28 L94 26.5 L98.5 25 Z" fill="url(#goldGrad)" filter="url(#glow)"/>

      {/* Sparkle bottom-right */}
      <path d="M163 148 L164 151 L167 152 L164 153 L163 156 L162 153 L159 152 L162 151 Z" fill="url(#goldGrad)" opacity="0.7"/>

      {/* App name */}
      <text x="100" y="142" fontSize="17" fontWeight="800" fill="url(#goldGrad)" fontFamily="'Heebo', Arial, sans-serif" textAnchor="middle" filter="url(#glow)">כלכלת בית</text>

      {/* Subtitle */}
      <text x="100" y="158" fontSize="8.5" fontWeight="400" fill="url(#goldGrad)" fontFamily="'Heebo', Arial, sans-serif" textAnchor="middle" opacity="0.85">ניהול פיננסי פרימיום</text>
    </svg>
  )
}
