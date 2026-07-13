import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import "../styles/comparison-chart.css";

// Typical approved-applicant benchmarks, expressed on a 0-100 "strength" scale,
// derived from the training data's approved-class averages.
const BENCHMARK = {
  creditScore: 74,   // ~740/900 normalized-ish
  income: 62,
  employment: 58,
  dtiHealth: 68,     // higher = healthier (lower DTI)
};

function normalize(payload, financials) {
  const creditScore = Math.min(100, Math.max(0, ((payload.credit_score - 300) / 600) * 100));
  const income = Math.min(100, ((payload.applicant_income + payload.coapplicant_income) / 120000) * 100);
  const employment = Math.min(100, (payload.employment_years / 12) * 100);
  const dtiHealth = Math.min(100, Math.max(0, 100 - financials.debt_to_income_ratio * 180));
  return { creditScore, income, employment, dtiHealth };
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="comparison-tooltip">
      <p className="mono">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="mono" style={{ color: p.fill }}>
          {p.name}: {Math.round(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function ComparisonChart({ inputs, financials }) {
  const hasData = inputs && financials;
  const applicant = hasData ? normalize(inputs, financials) : { creditScore: 0, income: 0, employment: 0, dtiHealth: 0 };

  const data = [
    { label: "Credit Score", "Your Profile": applicant.creditScore, "Typical Approved": BENCHMARK.creditScore },
    { label: "Income Level", "Your Profile": applicant.income, "Typical Approved": BENCHMARK.income },
    { label: "Employment Stability", "Your Profile": applicant.employment, "Typical Approved": BENCHMARK.employment },
    { label: "Debt-to-Income Health", "Your Profile": applicant.dtiHealth, "Typical Approved": BENCHMARK.dtiHealth },
  ];

  return (
    <div className="comparison-card glass">
      <div className="card-heading">
        <h3>Profile Comparison</h3>
        <span className="comparison-hint">Your profile vs. a typical approved applicant</span>
      </div>
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }} barGap={4}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" stroke="var(--ink-tertiary)" fontSize={10.5} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--ink-tertiary)" fontSize={11} tickLine={false} axisLine={false} width={30} domain={[0, 100]} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Legend wrapperStyle={{ fontSize: "0.72rem", color: "var(--ink-secondary)" }} />
          <Bar dataKey="Your Profile" fill="#34d399" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Typical Approved" fill="#5b8def" radius={[4, 4, 0, 0]} opacity={0.55} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
