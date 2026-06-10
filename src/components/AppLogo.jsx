export default function AppLogo({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#f9eda0"/>
          <stop offset="40%"  stopColor="#d4a832"/>
          <stop offset="100%" stopColor="#8a6010"/>
        </linearGradient>
        <linearGradient id="g2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#f9eda0"/>
          <stop offset="50%"  stopColor="#c9a030"/>
          <stop offset="100%" stopColor="#7a5010"/>
        </linearGradient>
        <linearGradient id="gSide" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#8a6010"/>
          <stop offset="100%" stopColor="#c9a030"/>
        </linearGradient>
        <linearGradient id="gTop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#f9eda0"/>
          <stop offset="100%" stopColor="#d4a832"/>
        </linearGradient>
        <linearGradient id="gRing" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#f9eda0"/>
          <stop offset="25%"  stopColor="#c9a030"/>
          <stop offset="50%"  stopColor="#f0d060"/>
          <stop offset="75%"  stopColor="#9a7020"/>
          <stop offset="100%" stopColor="#f9eda0"/>
        </linearGradient>
        <linearGradient id="gCurve" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#c9a030"/>
          <stop offset="100%" stopColor="#f9eda0"/>
        </linearGradient>
        <radialGradient id="gBg" cx="50%" cy="40%" r="60%">
          <stop offset="0%"   stopColor="#2a2a2a"/>
          <stop offset="100%" stopColor="#050505"/>
        </radialGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      {/* Background */}
      <circle cx="100" cy="100" r="99" fill="url(#gBg)"/>

      {/* Gold ring border — outer */}
      <circle cx="100" cy="100" r="96" stroke="url(#gRing)" strokeWidth="3" fill="none"/>
      {/* Gold ring border — inner thin */}
      <circle cx="100" cy="100" r="90" stroke="url(#gRing)" strokeWidth="0.8" fill="none" opacity="0.5"/>

      {/* ── BAR 1 (left, short) 3D cuboid ── */}
      {/* Front face */}
      <rect x="52" y="90" width="18" height="30" fill="url(#g2)"/>
      {/* Top face */}
      <polygon points="52,90 70,90 74,85 56,85" fill="url(#gTop)"/>
      {/* Right side face */}
      <polygon points="70,90 74,85 74,115 70,120" fill="url(#gSide)" opacity="0.7"/>

      {/* ── BAR 2 (middle) 3D cuboid ── */}
      {/* Front face */}
      <rect x="80" y="74" width="18" height="46" fill="url(#g2)"/>
      {/* Top face */}
      <polygon points="80,74 98,74 102,69 84,69" fill="url(#gTop)"/>
      {/* Right side face */}
      <polygon points="98,74 102,69 102,115 98,120" fill="url(#gSide)" opacity="0.7"/>

      {/* ── BAR 3 (right, tall) 3D cuboid ── */}
      {/* Front face */}
      <rect x="108" y="56" width="18" height="64" fill="url(#g2)"/>
      {/* Top face */}
      <polygon points="108,56 126,56 130,51 112,51" fill="url(#gTop)"/>
      {/* Right side face */}
      <polygon points="126,56 130,51 130,115 126,120" fill="url(#gSide)" opacity="0.7"/>

      {/* Base line under bars */}
      <line x1="48" y1="120" x2="134" y2="120" stroke="url(#g1)" strokeWidth="1.5" opacity="0.6"/>

      {/* Growth curve line */}
      <path d="M56 112 C70 95, 95 72, 122 45"
        stroke="url(#gCurve)" strokeWidth="2.8" fill="none"
        strokeLinecap="round" filter="url(#glow)"/>

      {/* Arrow head at curve end */}
      <path d="M118 42 L126 44 L122 52"
        stroke="url(#g1)" strokeWidth="2.2" fill="none"
        strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)"/>

      {/* ₪ at arrow tip */}
      <text x="134" y="43" fontSize="13" fontWeight="900" fill="url(#g1)"
        fontFamily="Arial, sans-serif" textAnchor="middle" filter="url(#glow)">₪</text>

      {/* Top sparkle (4-pointed star) */}
      <path d="M100 18 L101.8 24.5 L108 26 L101.8 27.5 L100 34 L98.2 27.5 L92 26 L98.2 24.5 Z"
        fill="url(#g1)" filter="url(#glow)"/>

      {/* Small sparkle bottom-right */}
      <path d="M160 152 L161.2 155.5 L165 156.5 L161.2 157.5 L160 161 L158.8 157.5 L155 156.5 L158.8 155.5 Z"
        fill="url(#g1)" opacity="0.6"/>

      {/* Text: כלכלת בית */}
      <text x="100" y="145" fontSize="19" fontWeight="800"
        fill="url(#g1)" fontFamily="'Heebo', Arial, sans-serif"
        textAnchor="middle" filter="url(#glow)">כלכלת בית</text>

      {/* Text: ניהול פיננסי פרימיום */}
      <text x="100" y="161" fontSize="8" fontWeight="400"
        fill="url(#g1)" fontFamily="'Heebo', Arial, sans-serif"
        textAnchor="middle" opacity="0.85" letterSpacing="0.3">ניהול פיננסי פרימיום</text>
    </svg>
  )
}
