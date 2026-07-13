"""
generate_data.py
-----------------
Generates a synthetic (but underwriting-realistic) loan application dataset.

Real bank loan data is private/regulated, so this script builds a dataset
using an EMI + debt-to-income based generative model — the same style of
"real formula, synthetic sampling" approach used by the classic Analytics
Vidhya Loan Prediction dataset, so the trained model reflects genuine
underwriting logic (credit score, DTI, employment stability, loan-to-income
ratio) rather than arbitrary noise.

Run:
    python generate_data.py
Produces:
    data/loan_dataset.csv
"""

import numpy as np
import pandas as pd

np.random.seed(42)
N = 6000

# ---------------------------------------------------------------------------
# 1. Applicant profile
# ---------------------------------------------------------------------------
education = np.random.choice(["Graduate", "Not Graduate"], size=N, p=[0.78, 0.22])
self_employed = np.random.choice(["Yes", "No"], size=N, p=[0.14, 0.86])
married = np.random.choice(["Yes", "No"], size=N, p=[0.65, 0.35])
dependents_num = np.random.choice([0, 1, 2, 3], size=N, p=[0.55, 0.2, 0.16, 0.09])
property_area = np.random.choice(["Urban", "Semiurban", "Rural"], size=N, p=[0.38, 0.38, 0.24])

employment_years = np.clip(np.random.exponential(5, N), 0, 35).round(1)

# ---------------------------------------------------------------------------
# 2. Financial profile. Self-employed applicants have noisier, on-average
#    lower reported income (matches real underwriting patterns).
# ---------------------------------------------------------------------------
base_income = np.random.lognormal(mean=10.95, sigma=0.42, size=N)  # ~ INR/month
self_emp_penalty = np.where(self_employed == "Yes", np.random.uniform(0.7, 1.1, N), 1.0)
applicant_income = np.clip(base_income * self_emp_penalty, 12000, 300000).round(0)

has_coapplicant = married == "Yes"
coapplicant_income = np.where(
    has_coapplicant,
    np.clip(np.random.lognormal(mean=10.2, sigma=0.55, size=N), 0, 150000),
    0,
).round(0)

# CIBIL-style credit score, 300-900, correlated loosely with income stability
credit_score = np.clip(
    np.random.normal(680, 95, N)
    + (employment_years * 2.2)
    - (self_employed == "Yes") * 25
    + (education == "Graduate") * 12,
    300,
    900,
).round(0)

# ---------------------------------------------------------------------------
# 3. Loan request
# ---------------------------------------------------------------------------
total_income = applicant_income + coapplicant_income
loan_amount = np.clip(
    (total_income * np.random.uniform(6, 30, N)) / 1000, 40, 700
).round(0)  # in thousands
loan_term = np.random.choice([60, 120, 180, 240, 300, 360, 480], size=N,
                              p=[0.05, 0.1, 0.15, 0.2, 0.2, 0.22, 0.08])

# ---------------------------------------------------------------------------
# 4. Underwriting math: EMI, DTI, loan-to-income ratio -> approval logit
# ---------------------------------------------------------------------------
annual_rate = 0.105
monthly_rate = annual_rate / 12
n_months = loan_term
principal = loan_amount * 1000
emi = (principal * monthly_rate * (1 + monthly_rate) ** n_months) / (
    (1 + monthly_rate) ** n_months - 1
)
dti = emi / np.maximum(total_income, 1)
loan_to_income = principal / np.maximum(total_income * n_months, 1)

property_effect = np.select(
    [property_area == "Semiurban", property_area == "Urban", property_area == "Rural"],
    [0.35, 0.05, -0.25],
)

logit = (
    0.65
    + (credit_score - 650) / 110
    + employment_years * 0.045
    - dti * 7.5
    - dependents_num * 0.10
    + (education == "Graduate") * 0.30
    - (self_employed == "Yes") * 0.22
    + property_effect
    - loan_to_income * 2.4
    + np.random.normal(0, 0.55, N)  # underwriter discretion / noise
)

approval_prob = 1 / (1 + np.exp(-logit))
loan_status = (np.random.uniform(0, 1, N) < approval_prob).astype(int)

df = pd.DataFrame({
    "applicant_income": applicant_income,
    "coapplicant_income": coapplicant_income,
    "credit_score": credit_score,
    "employment_years": employment_years,
    "loan_amount": loan_amount,
    "loan_term": loan_term,
    "dependents_num": dependents_num,
    "education": education,
    "self_employed": self_employed,
    "married": married,
    "property_area": property_area,
    "approval_probability_true": approval_prob.round(4),
    "loan_status": loan_status,
})

df.to_csv("loan_dataset.csv", index=False)
print(f"Saved {len(df)} rows to loan_dataset.csv")
print(f"Approval rate: {df['loan_status'].mean():.2%}")
print(df.describe(include="all"))
