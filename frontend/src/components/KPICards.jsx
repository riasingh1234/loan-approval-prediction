import "../styles/kpi-cards.css";

export default function KPICards({ result }) {
  const items = [
    { label: "Decision", value: result?.decision || "—", accent: result?.color },
    { label: "Approval Probability", value: result ? `${Math.round(result.approval_probability * 100)}%` : "—", accent: result?.color },
    { label: "Risk Level", value: result?.risk_level || "—", accent: result?.color },
    { label: "Credit Score Band", value: result?.credit_score_band || "—", accent: "var(--signal-emerald)" },
  ];

  return (
    <div className="kpi-row">
      {items.map((item) => (
        <div className="kpi-card glass" key={item.label}>
          <p className="kpi-label">{item.label}</p>
          <p className="kpi-value mono" style={{ color: item.accent || "var(--ink-primary)" }}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
