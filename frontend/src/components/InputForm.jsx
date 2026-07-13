import { useState } from "react";
import "../styles/input-form.css";

const DEFAULTS = {
  education: "Graduate",
  self_employed: "No",
  married: "Yes",
  dependents: "1",
  applicant_income: 55000,
  coapplicant_income: 12000,
  credit_score: 710,
  employment_years: 4,
  loan_amount: 350,
  loan_term: "240",
  property_area: "Semiurban",
};

const NUMERIC_FIELDS = [
  { key: "applicant_income", label: "Applicant Income", unit: "₹/mo", step: 500, group: "financial" },
  { key: "coapplicant_income", label: "Co-applicant Income", unit: "₹/mo", step: 500, group: "financial" },
  { key: "credit_score", label: "Credit Score", unit: "300-900", step: 1, group: "financial" },
  { key: "employment_years", label: "Employment", unit: "years", step: 0.5, group: "financial" },
  { key: "loan_amount", label: "Loan Amount", unit: "₹ thousand", step: 5, group: "loan" },
];

export default function InputForm({ onSubmit, loading }) {
  const [values, setValues] = useState(DEFAULTS);
  const [errors, setErrors] = useState({});

  const handleChange = (key, val) => setValues((v) => ({ ...v, [key]: val }));

  const validate = () => {
    const errs = {};
    NUMERIC_FIELDS.forEach(({ key }) => {
      const val = values[key];
      if (val === "" || val === null || Number.isNaN(Number(val))) errs[key] = "Required";
      else if (Number(val) < 0) errs[key] = "Must be ≥ 0";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = { ...values };
    NUMERIC_FIELDS.forEach(({ key }) => (payload[key] = Number(values[key])));
    payload.loan_term = Number(values.loan_term);
    onSubmit(payload);
  };

  const loadSample = (kind) => {
    const samples = {
      strong: { ...DEFAULTS, applicant_income: 85000, coapplicant_income: 25000, credit_score: 780, employment_years: 8, loan_amount: 300, loan_term: "180", education: "Graduate", self_employed: "No", married: "Yes", dependents: "0", property_area: "Urban" },
      average: DEFAULTS,
      weak: { applicant_income: 18000, coapplicant_income: 0, credit_score: 540, employment_years: 0.5, loan_amount: 500, loan_term: "360", education: "Not Graduate", self_employed: "Yes", married: "No", dependents: "3+", property_area: "Rural" },
    };
    setValues(samples[kind]);
    setErrors({});
  };

  return (
    <form className="input-form glass" onSubmit={handleSubmit}>
      <div className="form-header">
        <h2>Application Details</h2>
        <div className="sample-buttons">
          <button type="button" onClick={() => loadSample("strong")}>Strong</button>
          <button type="button" onClick={() => loadSample("average")}>Average</button>
          <button type="button" onClick={() => loadSample("weak")}>Weak</button>
        </div>
      </div>

      <div className="field-group">
        <p className="field-group-title">Applicant Profile</p>
        <div className="field-grid">
          <label className="field">
            <span className="field-label">Education</span>
            <select value={values.education} onChange={(e) => handleChange("education", e.target.value)}>
              <option>Graduate</option>
              <option>Not Graduate</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Self-Employed</span>
            <select value={values.self_employed} onChange={(e) => handleChange("self_employed", e.target.value)}>
              <option>No</option>
              <option>Yes</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Married</span>
            <select value={values.married} onChange={(e) => handleChange("married", e.target.value)}>
              <option>Yes</option>
              <option>No</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Dependents</span>
            <select value={values.dependents} onChange={(e) => handleChange("dependents", e.target.value)}>
              <option>0</option>
              <option>1</option>
              <option>2</option>
              <option>3+</option>
            </select>
          </label>
        </div>
      </div>

      <div className="field-group">
        <p className="field-group-title">Financial Details</p>
        <div className="field-grid">
          {NUMERIC_FIELDS.filter((f) => f.group === "financial").map((f) => (
            <label key={f.key} className={`field ${errors[f.key] ? "field-error" : ""}`}>
              <span className="field-label">
                {f.label} <span className="field-unit">{f.unit}</span>
              </span>
              <input
                type="number"
                step={f.step}
                value={values[f.key]}
                onChange={(e) => handleChange(f.key, e.target.value)}
              />
              {errors[f.key] && <span className="field-error-text">{errors[f.key]}</span>}
            </label>
          ))}
        </div>
      </div>

      <div className="field-group">
        <p className="field-group-title">Loan Details</p>
        <div className="field-grid">
          {NUMERIC_FIELDS.filter((f) => f.group === "loan").map((f) => (
            <label key={f.key} className={`field ${errors[f.key] ? "field-error" : ""}`}>
              <span className="field-label">
                {f.label} <span className="field-unit">{f.unit}</span>
              </span>
              <input
                type="number"
                step={f.step}
                value={values[f.key]}
                onChange={(e) => handleChange(f.key, e.target.value)}
              />
              {errors[f.key] && <span className="field-error-text">{errors[f.key]}</span>}
            </label>
          ))}
          <label className="field">
            <span className="field-label">Loan Term <span className="field-unit">months</span></span>
            <select value={values.loan_term} onChange={(e) => handleChange("loan_term", e.target.value)}>
              {[60, 120, 180, 240, 300, 360, 480].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Property Area</span>
            <select value={values.property_area} onChange={(e) => handleChange("property_area", e.target.value)}>
              <option>Urban</option>
              <option>Semiurban</option>
              <option>Rural</option>
            </select>
          </label>
        </div>
      </div>

      <button type="submit" className="predict-btn" disabled={loading}>
        {loading ? <span className="btn-spinner" /> : "Check Approval"}
      </button>
    </form>
  );
}
