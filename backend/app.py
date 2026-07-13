"""
LoanIQ — Smart Loan Approval Predictor API
--------------------------------------------
Flask backend that loads the trained classifier + scaler and serves
approval decisions with probability, risk banding, key contributing
factors, and actionable recommendations.

Run:
    pip install -r requirements.txt
    python app.py
Server starts on http://localhost:5000
"""

import json
import os

import joblib
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

model = joblib.load(os.path.join(BASE_DIR, "model.pkl"))
scaler = joblib.load(os.path.join(BASE_DIR, "scaler.pkl"))

with open(os.path.join(BASE_DIR, "model_metadata.json")) as f:
    METADATA = json.load(f)

FEATURES = METADATA["features"]

RAW_INPUT_FIELDS = [
    "applicant_income", "coapplicant_income", "credit_score", "employment_years",
    "loan_amount", "loan_term", "dependents",
    "education", "self_employed", "married", "property_area",
]

CREDIT_BANDS = [
    {"max": 579, "label": "Poor"},
    {"max": 669, "label": "Fair"},
    {"max": 739, "label": "Good"},
    {"max": 799, "label": "Very Good"},
    {"max": 900, "label": "Excellent"},
]


def credit_band(score):
    for b in CREDIT_BANDS:
        if score <= b["max"]:
            return b["label"]
    return CREDIT_BANDS[-1]["label"]


def risk_band(probability):
    if probability >= 0.7:
        return {"label": "Low Risk", "color": "#34d399"}
    if probability >= 0.45:
        return {"label": "Medium Risk", "color": "#f2c14e"}
    return {"label": "High Risk", "color": "#ef4444"}


def encode(payload):
    dependents_num = 3 if str(payload["dependents"]).strip() == "3+" else int(payload["dependents"])
    row = {
        "applicant_income": float(payload["applicant_income"]),
        "coapplicant_income": float(payload["coapplicant_income"]),
        "credit_score": float(payload["credit_score"]),
        "employment_years": float(payload["employment_years"]),
        "loan_amount": float(payload["loan_amount"]),
        "loan_term": float(payload["loan_term"]),
        "dependents_num": dependents_num,
        "education_graduate": 1 if payload["education"] == "Graduate" else 0,
        "self_employed_yes": 1 if payload["self_employed"] == "Yes" else 0,
        "married_yes": 1 if payload["married"] == "Yes" else 0,
        "property_urban": 1 if payload["property_area"] == "Urban" else 0,
        "property_semiurban": 1 if payload["property_area"] == "Semiurban" else 0,
        "property_rural": 1 if payload["property_area"] == "Rural" else 0,
    }
    return [row[f] for f in FEATURES]


def compute_financials(payload):
    total_income = float(payload["applicant_income"]) + float(payload["coapplicant_income"])
    principal = float(payload["loan_amount"]) * 1000
    monthly_rate = 0.105 / 12
    n = float(payload["loan_term"])
    emi = (principal * monthly_rate * (1 + monthly_rate) ** n) / ((1 + monthly_rate) ** n - 1) if n > 0 else 0
    dti = emi / total_income if total_income > 0 else 0
    loan_to_income = principal / (total_income * n) if total_income > 0 and n > 0 else 0
    return {
        "total_income": round(total_income, 0),
        "estimated_emi": round(emi, 0),
        "debt_to_income_ratio": round(dti, 3),
        "loan_to_income_ratio": round(loan_to_income, 3),
    }


def key_factors(payload, financials):
    factors = []
    cs = float(payload["credit_score"])
    if cs >= 740:
        factors.append({"factor": "Credit Score", "impact": "positive", "note": f"Strong credit score of {int(cs)}."})
    elif cs < 630:
        factors.append({"factor": "Credit Score", "impact": "negative", "note": f"Credit score of {int(cs)} is below typical approval thresholds."})

    if financials["debt_to_income_ratio"] > 0.5:
        factors.append({"factor": "Debt-to-Income", "impact": "negative", "note": "EMI would consume more than half of total monthly income."})
    elif financials["debt_to_income_ratio"] < 0.3:
        factors.append({"factor": "Debt-to-Income", "impact": "positive", "note": "EMI stays comfortably below 30% of monthly income."})

    if float(payload["employment_years"]) < 1:
        factors.append({"factor": "Employment History", "impact": "negative", "note": "Less than a year of employment history on record."})
    elif float(payload["employment_years"]) >= 5:
        factors.append({"factor": "Employment History", "impact": "positive", "note": "5+ years of stable employment history."})

    if payload["self_employed"] == "Yes":
        factors.append({"factor": "Employment Type", "impact": "neutral", "note": "Self-employed income is weighted with slightly more caution."})

    if financials["loan_to_income_ratio"] > 0.6:
        factors.append({"factor": "Loan Size", "impact": "negative", "note": "Requested loan is large relative to income and tenure."})

    return factors[:4]


def recommendations(payload, financials, approved):
    if approved:
        return ["Keep your credit utilization low before disbursal.", "Maintain consistent income documentation for faster processing."]

    tips = []
    if financials["debt_to_income_ratio"] > 0.45:
        tips.append("Consider a longer loan term or smaller loan amount to lower the EMI-to-income ratio.")
    if float(payload["credit_score"]) < 700:
        tips.append("Improving your credit score above 700 meaningfully raises approval odds.")
    if payload["married"] == "No" or float(payload["coapplicant_income"]) == 0:
        tips.append("Adding a co-applicant's income can strengthen the application.")
    if not tips:
        tips.append("Re-apply with updated income documentation or a smaller requested amount.")
    return tips[:3]


@app.route("/")
def index():
    return jsonify(message="LoanIQ Approval Prediction API Running")


@app.route("/health")
def health():
    return jsonify(status="ok", model=METADATA["best_model"])


@app.route("/metadata")
def metadata():
    return jsonify(METADATA)


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True)
    if not data:
        return jsonify(error="Missing or invalid JSON body"), 400

    missing = [f for f in RAW_INPUT_FIELDS if f not in data]
    if missing:
        return jsonify(error=f"Missing fields: {', '.join(missing)}"), 400

    try:
        encoded = encode(data)
    except (TypeError, ValueError) as e:
        return jsonify(error=f"Invalid input: {e}"), 400

    X = np.array(encoded).reshape(1, -1)
    X_scaled = scaler.transform(X)
    probability = float(model.predict_proba(X_scaled)[0][1])
    approved = probability >= 0.5

    band = risk_band(probability)
    financials = compute_financials(data)

    response = {
        "approved": approved,
        "decision": "Approved" if approved else "Rejected",
        "approval_probability": round(probability, 4),
        "risk_level": band["label"],
        "color": band["color"],
        "credit_score_band": credit_band(float(data["credit_score"])),
        "financial_summary": financials,
        "key_factors": key_factors(data, financials),
        "recommendations": recommendations(data, financials, approved),
        "model_used": METADATA["best_model"],
    }
    return jsonify(response)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
