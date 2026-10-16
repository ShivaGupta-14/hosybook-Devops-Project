const INK = "#0c0c0d";
const AMBER = "#f2a516";

function Eyes({ pose }) {
  if (pose === "happy") {
    return (
      <g stroke="#fff" strokeWidth="7" strokeLinecap="round" fill="none">
        <path d="M62 92 Q76 74 90 92" />
        <path d="M110 92 Q124 74 138 92" />
      </g>
    );
  }
  if (pose === "sleep") {
    return (
      <g>
        <path d="M54 88 a22 22 0 0 0 44 0 Z" fill="#fff" />
        <path d="M102 88 a22 22 0 0 0 44 0 Z" fill="#fff" />
        <circle cx="78" cy="94" r="7" fill={INK} />
        <circle cx="122" cy="94" r="7" fill={INK} />
        <path d="M52 88 H100 M100 88 H148" stroke={INK} strokeWidth="6" />
      </g>
    );
  }
  const look = {
    default: [4, 4],
    hello: [4, 4],
    thinking: [6, -6],
    empty: [0, 8],
    sorry: [0, 6],
  }[pose] || [4, 4];
  return (
    <g>
      <circle cx="76" cy="86" r="23" fill="#fff" />
      <circle cx="124" cy="86" r="23" fill="#fff" />
      <circle cx={76 + look[0]} cy={86 + look[1]} r="9" fill={INK} />
      <circle cx={124 - (pose === "thinking" ? -look[0] : look[0])} cy={86 + look[1]} r="9" fill={INK} />
      {pose === "sorry" && (
        <g stroke={INK} strokeWidth="7" strokeLinecap="round">
          <path d="M54 64 L94 72" />
          <path d="M146 64 L106 72" />
        </g>
      )}
    </g>
  );
}

export default function Hosy({ pose = "default", size = 64, className = "" }) {
  return (
    <svg
      className={className}
      width={size}
      height={size * 1.2}
      viewBox="0 0 200 240"
      role="img"
      aria-label="Hosy"
    >
      {pose === "hello" && (
        <g>
          <path d="M150 112 Q178 92 172 62" stroke={INK} strokeWidth="20" strokeLinecap="round" fill="none" />
          <path d="M186 50 q8 10 4 22 M196 40 q12 16 6 34" stroke="#b9b9bd" strokeWidth="4" strokeLinecap="round" fill="none" />
        </g>
      )}
      <rect x="44" y="18" width="112" height="196" rx="56" fill={INK} />
      <path d="M56 40 Q62 30 72 26" stroke="#fff" strokeOpacity="0.18" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M44 128 H156" stroke="#2a2a2d" strokeWidth="5" />
      <Eyes pose={pose} />
      <g stroke={AMBER} strokeWidth="9" strokeLinecap="round">
        <path d="M100 152 V180" />
        <path d="M86 166 H114" />
      </g>
      <path d="M82 212 V230 M118 212 V230" stroke={AMBER} strokeWidth="7" strokeLinecap="round" />
      {pose === "thinking" && (
        <text x="166" y="44" fontSize="40" fontWeight="800" fill={AMBER} fontFamily="Geist, sans-serif">?</text>
      )}
      {pose === "sleep" && (
        <text x="160" y="40" fontSize="26" fontWeight="700" fill="#b9b9bd" fontFamily="Geist, sans-serif">z</text>
      )}
      {pose === "empty" && (
        <g>
          <rect x="70" y="140" width="60" height="48" rx="6" fill="#fff" />
          <path d="M80 154 H120 M80 166 H112 M80 178 H104" stroke="#b9b9bd" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
