import { useEffect, useState } from "react";
import ApprovalGauge from "./components/ApprovalGauge";
import ComparisonChart from "./components/ComparisonChart";
import DecisionCard from "./components/DecisionCard";
import FinancialSummary from "./components/FinancialSummary";
import InputForm from "./components/InputForm";
import KeyFactors from "./components/KeyFactors";
import KPICards from "./components/KPICards";
import Navbar from "./components/Navbar";
import SignalField from "./components/SignalField";
import { predictLoan } from "./api";
import "./styles/layout.css";

const RISK_BANDS = [
  { max: 0.45, label: "High Risk", color: "#ef4444" },
  { max: 0.7, label: "Medium Risk", color: "#f2c14e" },
  { max: 1.01, label: "Low Risk", color: "#34d399" },
];

const CREDIT_BANDS = [
  { max: 579, label: "Poor" },
  { max: 669, label: "Fair" },
  { max: 739, label: "Good" },
  { max: 799, label: "Very Good" },
  { max: 900, label: "Excellent" },
];

function riskBand(p) {
  return RISK_BANDS.find((b) => p <= b.max) || RISK_BANDS[RISK_BANDS.length - 1];
}
function creditBand(score) {
  return (CREDIT_BANDS.find((b) => score <= b.max) || CREDIT_BANDS[CREDIT_BANDS.length - 1]).label;
}

function computeFinancials(payload) {
  const totalIncome = Number(payload.applicant_income) + Number(payload.coapplicant_income);
  const principal = Number(payload.loan_amount) * 1000;
  const monthlyRate = 0.105 / 12;
  const n = Number(payload.loan_term);
  const emi = n > 0 ? (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1) : 0;
  const dti = totalIncome > 0 ? emi / totalIncome : 0;
  const loanToIncome = totalIncome > 0 && n > 0 ? principal / (totalIncome * n) : 0;
  return {
    total_income: Math.round(totalIncome),
    estimated_emi: Math.round(emi),
    debt_to_income_ratio: Math.round(dti * 1000) / 1000,
    loan_to_income_ratio: Math.round(loanToIncome * 1000) / 1000,
  };
}

// Fallback offline predictor mirrors backend/app.py's logic so the
// dashboard stays fully functional even if the Flask server isn't running.
function offlinePredict(payload) {
  const financials = computeFinancials(payload);
  const dependentsNum = payload.dependents === "3+" ? 3 : Number(payload.dependents);

  let logit =
    0.65 +
    (payload.credit_score - 650) / 110 +
    payload.employment_years * 0.045 -
    financials.debt_to_income_ratio * 7.5 -
    dependentsNum * 0.1 +
    (payload.education === "Graduate" ? 0.3 : 0) -
    (payload.self_employed === "Yes" ? 0.22 : 0) +
    (payload.property_area === "Semiurban" ? 0.35 : payload.property_area === "Rural" ? -0.25 : 0.05) -
    financials.loan_to_income_ratio * 2.4;

  const probability = 1 / (1 + Math.exp(-logit));
  const approved = probability >= 0.5;
  const band = riskBand(probability);

  const keyFactors = [];
  if (payload.credit_score >= 740) keyFactors.push({ factor: "Credit Score", impact: "positive", note: `Strong credit score of ${payload.credit_score}.` });
  else if (payload.credit_score < 630) keyFactors.push({ factor: "Credit Score", impact: "negative", note: `Credit score of ${payload.credit_score} is below typical approval thresholds.` });
  if (financials.debt_to_income_ratio > 0.5) keyFactors.push({ factor: "Debt-to-Income", impact: "negative", note: "EMI would consume more than half of total monthly income." });
  else if (financials.debt_to_income_ratio < 0.3) keyFactors.push({ factor: "Debt-to-Income", impact: "positive", note: "EMI stays comfortably below 30% of monthly income." });
  if (payload.employment_years < 1) keyFactors.push({ factor: "Employment History", impact: "negative", note: "Less than a year of employment history on record." });
  else if (payload.employment_years >= 5) keyFactors.push({ factor: "Employment History", impact: "positive", note: "5+ years of stable employment history." });

  const recommendations = approved
    ? ["Keep your credit utilization low before disbursal.", "Maintain consistent income documentation for faster processing."]
    : [
        financials.debt_to_income_ratio > 0.45 && "Consider a longer loan term or smaller loan amount to lower the EMI-to-income ratio.",
        payload.credit_score < 700 && "Improving your credit score above 700 meaningfully raises approval odds.",
        (payload.married === "No" || payload.coapplicant_income == 0) && "Adding a co-applicant's income can strengthen the application.",
      ].filter(Boolean);

  return {
    approved,
    decision: approved ? "Approved" : "Rejected",
    approval_probability: Math.round(probability * 10000) / 10000,
    risk_level: band.label,
    color: band.color,
    credit_score_band: creditBand(payload.credit_score),
    financial_summary: financials,
    key_factors: keyFactors.slice(0, 4),
    recommendations: recommendations.length ? recommendations.slice(0, 3) : ["Re-apply with updated income documentation or a smaller requested amount."],
    model_used: "Offline heuristic (backend unreachable)",
  };
}

export default function App() {
  const [status, setStatus] = useState("loading");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastInputs, setLastInputs] = useState(null);

  useEffect(() => {
    predictLoan({
      applicant_income: 50000, coapplicant_income: 10000, credit_score: 700,
      employment_years: 3, loan_amount: 300, loan_term: 240, dependents: "0",
      education: "Graduate", self_employed: "No", married: "Yes", property_area: "Urban",
    })
      .then(() => setStatus("online"))
      .catch(() => setStatus("offline"));
  }, []);

  const handleSubmit = async (payload) => {
    setLoading(true);
    setError(null);
    setLastInputs(payload);
    try {
      const data = await predictLoan(payload);
      setResult(data);
      setStatus("online");
    } catch (err) {
      setStatus("offline");
      setResult(offlinePredict(payload));
      setError("Backend unreachable — showing an offline estimate. Start the Flask API for live model predictions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <SignalField color={result?.color ?? "#34d399"} intensity={result ? 1 - result.approval_probability : 0.25} />

      <div className="app-container">
        <Navbar status={status} />

        <section className="hero glass">
          <div className="hero-copy">
            <p className="hero-eyebrow">Live Decision Support</p>
            <h2>Know your loan odds before you apply</h2>
            <p className="hero-sub">
              Enter applicant, financial, and loan details to get a predicted approval decision, risk
              level, and a breakdown of what's actually driving the outcome — powered by a classifier
              trained on EMI and debt-to-income underwriting logic.
            </p>
            {error && <p className="hero-warning">{error}</p>}
          </div>
          <ApprovalGauge
            probability={result?.approval_probability ?? 0}
            decision={result?.decision ?? "Awaiting input"}
            color={result?.color ?? "#34d399"}
          />
        </section>

        <KPICards result={result} />

        <div className="main-grid">
          <div className="col-left">
            <InputForm onSubmit={handleSubmit} loading={loading} />
          </div>

          <div className="col-right">
            {result && <FinancialSummary financials={result.financial_summary} />}
            <ComparisonChart inputs={lastInputs} financials={result?.financial_summary} />
            <div className="split-row">
              <DecisionCard result={result} />
              <KeyFactors result={result} />
            </div>
          </div>
        </div>

        <footer className="app-footer">
          <span>LoanIQ — Smart Loan Approval Predictor</span>
          <span className="mono">{result ? `Model: ${result.model_used}` : "Model idle"}</span>
        </footer>
      </div>
    </div>
  );
}
