import "../styles/approval-gauge.css";

const BANDS = [
  { max: 45, color: "var(--risk-high)" },
  { max: 70, color: "var(--risk-medium)" },
  { max: 100, color: "var(--risk-low)" },
];

const SWEEP_DEG = 270;
const START_DEG = -225;

export default function ApprovalGauge({ probability = 0, decision = "Awaiting input", color = "#34d399" }) {
  const pct = Math.max(0, Math.min(100, probability * 100));
  const fraction = pct / 100;
  const needleAngle = START_DEG + SWEEP_DEG * fraction;

  const R = 90;
  const CX = 110;
  const CY = 110;

  const polarToCartesian = (angleDeg) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
  };

  const arcPath = (startDeg, endDeg) => {
    const start = polarToCartesian(startDeg);
    const end = polarToCartesian(endDeg);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  let cursor = START_DEG;

  return (
    <div className="gauge-wrap">
      <svg viewBox="0 0 220 190" className="gauge-svg">
        {BANDS.map((band, i) => {
          const bandFraction = (band.max - (BANDS[i - 1]?.max || 0)) / 100;
          const segStart = cursor;
          const segEnd = cursor + SWEEP_DEG * bandFraction;
          cursor = segEnd;
          return (
            <path
              key={band.max}
              d={arcPath(segStart, segEnd)}
              stroke={band.color}
              strokeWidth="14"
              fill="none"
              strokeLinecap="round"
              opacity="0.85"
            />
          );
        })}

        <g style={{ transform: `rotate(${needleAngle}deg)`, transformOrigin: `${CX}px ${CY}px`, transition: "transform 1.1s cubic-bezier(.34,1.4,.4,1)" }}>
          <line x1={CX} y1={CY} x2={CX + R - 22} y2={CY} stroke={color} strokeWidth="3" strokeLinecap="round" />
          <circle cx={CX} cy={CY} r="6" fill={color} />
        </g>
      </svg>

      <div className="gauge-readout">
        <span className="gauge-value mono" style={{ color }}>
          {Math.round(pct)}%
        </span>
        <span className="gauge-label">{decision}</span>
      </div>
    </div>
  );
}
