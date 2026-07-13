import { useMemo } from "react";
import "../styles/signal-field.css";

/**
 * Signature background element: slow-drifting signal points whose color
 * reflects the current decision — emerald when approval odds are strong,
 * amber/red as risk rises — like a ledger quietly reacting to the numbers.
 */
export default function SignalField({ color = "#34d399", intensity = 0.3 }) {
  const count = 22 + Math.round(intensity * 30);
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 1 + Math.random() * 2.6,
        duration: 20 + Math.random() * 24,
        delay: Math.random() * -32,
        drift: (Math.random() - 0.5) * 50,
      })),
    [count]
  );

  return (
    <div className="signal-field" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="signal-particle"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, ${color}88 0%, ${color}00 70%)`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            "--drift": `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
