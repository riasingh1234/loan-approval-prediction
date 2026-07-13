import "../styles/financial-summary.css";

const ICONS = {
  income: <path d="M12 3v18M17 7.5c0-1.9-2.2-3.5-5-3.5S7 5.6 7 7.5 9.2 11 12 11s5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.6-5-3.5" strokeWidth="1.6" strokeLinecap="round" />,
  emi: <path d="M4 19h16M6 19V9l6-5 6 5v10M9 19v-6h6v6" strokeWidth="1.6" strokeLinejoin="round" />,
  dti: <path d="M3 17l5-5 4 4 8-8M14 8h6v6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />,
};

function formatINR(n) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

export default function FinancialSummary({ financials }) {
  if (!financials) return null;
  const cards = [
    { key: "income", label: "Total Income", value: `${formatINR(financials.total_income)}/mo` },
    { key: "emi", label: "Estimated EMI", value: `${formatINR(financials.estimated_emi)}/mo` },
    { key: "dti", label: "Debt-to-Income", value: `${Math.round(financials.debt_to_income_ratio * 100)}%` },
  ];

  return (
    <div className="financial-row">
      {cards.map((c) => (
        <div className="financial-card glass" key={c.key}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--signal-emerald)">
            {ICONS[c.key]}
          </svg>
          <div>
            <p className="financial-label">{c.label}</p>
            <p className="financial-value mono">{c.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
