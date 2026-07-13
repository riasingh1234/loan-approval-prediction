# LoanIQ — Smart Loan Approval Predictor

A full-stack machine learning web application that predicts whether a loan
application would be approved, based on applicant profile, financial
details, and loan terms — with a probability score, risk banding, key
contributing factors, and actionable recommendations. Wrapped in a
finance-themed glassmorphism dashboard.

**Live demo:** _add your deployed URL here after following the Deployment section_

---

## Overview

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite, Recharts, Axios |
| Backend | Flask + Flask-CORS |
| ML | scikit-learn (Logistic Regression / Random Forest / Gradient Boosting classifiers), Joblib |
| Data | Synthetic dataset generated from EMI + debt-to-income underwriting logic (`data/generate_data.py`) |

## Architecture

```
Browser (React dashboard)
      │  POST /predict  { applicant_income, coapplicant_income, credit_score,
      │                    employment_years, loan_amount, loan_term, dependents,
      │                    education, self_employed, married, property_area }
      ▼
Flask API (backend/app.py)
      │  encode categoricals → scaler.transform → model.predict_proba
      ▼
Trained model.pkl (best classifier by ROC-AUC, chosen automatically during training)
      │
      ▼
JSON response: { decision, approval_probability, risk_level, color,
                 credit_score_band, financial_summary, key_factors, recommendations }
```

## Project Structure

```
LoanIQ-System/
├── frontend/           React + Vite dashboard
│   └── src/
│       ├── components/ ApprovalGauge, InputForm, KPICards, DecisionCard,
│       │               KeyFactors, FinancialSummary, ComparisonChart,
│       │               Navbar, SignalField
│       └── styles/      per-component CSS + design tokens
├── backend/             Flask API + trained model.pkl / scaler.pkl
├── notebooks/           train_model.py (EDA + model comparison + training)
├── data/                generate_data.py + loan_dataset.csv
├── outputs/              EDA plots, feature importance chart
├── requirements.txt
└── README.md
```

## Getting Started

### 1. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # optional but recommended
pip install -r requirements.txt
python app.py
```

The API starts on `http://localhost:5000`.

- `GET /` → health check message
- `GET /health` → `{status, model}`
- `GET /metadata` → training metrics + feature importance
- `POST /predict` → approval prediction (see payload below)

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env      # points the app at localhost:5000 by default
npm run dev
```

Open `http://localhost:5173`. If the backend isn't running, the dashboard
automatically falls back to a client-side heuristic estimate so the UI stays
fully interactive (useful for demoing without a server).

### 3. (Optional) Retrain the model

```bash
cd data && python generate_data.py         # regenerate the synthetic dataset
cd ../notebooks && python train_model.py    # retrain, compares LR / RF / GB, saves the best
```

This overwrites `backend/model.pkl`, `backend/scaler.pkl`, and
`backend/model_metadata.json`, and refreshes the plots in `outputs/`.

## API Reference

**POST `/predict`**

Request body:

```json
{
  "applicant_income": 55000, "coapplicant_income": 12000,
  "credit_score": 710, "employment_years": 4,
  "loan_amount": 350, "loan_term": 240, "dependents": "1",
  "education": "Graduate", "self_employed": "No",
  "married": "Yes", "property_area": "Semiurban"
}
```

Response:

```json
{
  "approved": true,
  "decision": "Approved",
  "approval_probability": 0.8027,
  "risk_level": "Low Risk",
  "color": "#34d399",
  "credit_score_band": "Good",
  "financial_summary": {
    "total_income": 67000, "estimated_emi": 3494,
    "debt_to_income_ratio": 0.052, "loan_to_income_ratio": 0.022
  },
  "key_factors": [
    {"factor": "Debt-to-Income", "impact": "positive", "note": "EMI stays comfortably below 30% of monthly income."}
  ],
  "recommendations": ["Keep your credit utilization low before disbursal.", "..."],
  "model_used": "LogisticRegression"
}
```

## Model Performance

Trained on 6,000 synthetic applications generated from an EMI/DTI-based
underwriting model (see `data/generate_data.py`), 80/20 stratified split:

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---|---|---|---|---|
| **Logistic Regression (selected)** | ~0.71 | ~0.72 | ~0.89 | ~0.79 | ~0.76 |
| Gradient Boosting | ~0.71 | ~0.73 | ~0.86 | ~0.79 | ~0.75 |
| Random Forest | ~0.70 | ~0.71 | ~0.88 | ~0.79 | ~0.75 |

Credit score is consistently the strongest predictor, followed by income,
employment history, and loan term — matching real-world underwriting
priorities. ROC-AUC is deliberately in the 0.75 range rather than near-perfect:
real approval decisions include human discretion and noise, so the generator
injects randomness rather than producing an artificially perfect signal.

> Note: this dataset is synthetic. Swap `data/loan_dataset.csv` for a real,
> properly licensed loan dataset (e.g. an anonymized bank dataset) and rerun
> `train_model.py` to retrain — no other code changes required, since the
> feature schema stays identical.

## Deployment

**Backend → Render**
1. Push this repo to GitHub.
2. New Web Service on Render → point at `backend/`.
3. Build command: `pip install -r requirements.txt`
4. Start command: `gunicorn app:app`

**Frontend → Vercel**
1. Import the repo, set root directory to `frontend/`.
2. Add environment variable `VITE_API_URL` = your Render backend URL.
3. Deploy.

## Future Improvements

- Real bank dataset integration (with proper anonymization/licensing).
- SHAP-based explainable AI for per-application feature attribution.
- Multi-applicant / joint-loan scenarios.
- Downloadable PDF decision report.
- Application history and re-scoring over time.
- Interest-rate sensitivity slider (currently fixed at 10.5% p.a. for EMI estimation).

## Responsible Use Note

This is a portfolio/educational project. Real lending decisions are subject
to fair-lending regulations (e.g. ECOA in the US, RBI fair practices code in
India) and must not use protected characteristics (race, gender, religion,
etc.) as model features. This project intentionally avoids them — only
income, credit history, and loan structure are used.

## License

MIT — free to use for academic, portfolio, or resume purposes.
