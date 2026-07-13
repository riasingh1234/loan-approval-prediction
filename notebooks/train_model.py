"""
train_model.py
---------------
EDA + training pipeline for the LoanIQ approval predictor.

Steps:
1. Load data/loan_dataset.csv
2. Encode categoricals, quick EDA (saved as PNGs in outputs/)
3. Train/test split + scaling
4. Train Logistic Regression, Random Forest, and Gradient Boosting classifiers
5. Compare Accuracy / Precision / Recall / F1 / ROC-AUC
6. Save the best model + scaler + feature importance to backend/

Run from the notebooks/ folder:
    python train_model.py
"""

import json
import warnings

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, f1_score, precision_score,
                              recall_score, roc_auc_score)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")

DATA_PATH = "../data/loan_dataset.csv"
BACKEND_DIR = "../backend"
OUTPUTS_DIR = "../outputs"

# ---------------------------------------------------------------------------
# 1. Load + encode
# ---------------------------------------------------------------------------
df = pd.read_csv(DATA_PATH)
print(f"Loaded {len(df)} rows, approval rate {df['loan_status'].mean():.2%}")

df["education_graduate"] = (df["education"] == "Graduate").astype(int)
df["self_employed_yes"] = (df["self_employed"] == "Yes").astype(int)
df["married_yes"] = (df["married"] == "Yes").astype(int)
df["property_urban"] = (df["property_area"] == "Urban").astype(int)
df["property_semiurban"] = (df["property_area"] == "Semiurban").astype(int)
df["property_rural"] = (df["property_area"] == "Rural").astype(int)

FEATURES = [
    "applicant_income", "coapplicant_income", "credit_score", "employment_years",
    "loan_amount", "loan_term", "dependents_num",
    "education_graduate", "self_employed_yes", "married_yes",
    "property_urban", "property_semiurban", "property_rural",
]
TARGET = "loan_status"

# ---------------------------------------------------------------------------
# 2. Quick EDA plots
# ---------------------------------------------------------------------------
fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))
approved = df[df[TARGET] == 1]["credit_score"]
rejected = df[df[TARGET] == 0]["credit_score"]
axes[0].hist(approved, bins=30, alpha=0.7, label="Approved", color="#34d399")
axes[0].hist(rejected, bins=30, alpha=0.7, label="Rejected", color="#ef4444")
axes[0].set_title("Credit Score by Outcome")
axes[0].legend()

corr = df[FEATURES + [TARGET]].corr()[TARGET].drop(TARGET).sort_values()
axes[1].barh(corr.index, corr.values, color="#f2c14e")
axes[1].set_title("Feature Correlation with Approval")
plt.tight_layout()
plt.savefig(f"{OUTPUTS_DIR}/eda_overview.png", dpi=130)
plt.close()
print("Saved outputs/eda_overview.png")

# ---------------------------------------------------------------------------
# 3. Train/test split + scaling
# ---------------------------------------------------------------------------
X = df[FEATURES]
y = df[TARGET]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s = scaler.transform(X_test)

# ---------------------------------------------------------------------------
# 4. Train candidate models
# ---------------------------------------------------------------------------
models = {
    "LogisticRegression": LogisticRegression(max_iter=1000, C=1.0),
    "RandomForest": RandomForestClassifier(
        n_estimators=150, max_depth=8, min_samples_leaf=4, random_state=42, n_jobs=-1
    ),
    "GradientBoosting": GradientBoostingClassifier(
        n_estimators=150, max_depth=3, learning_rate=0.08, random_state=42
    ),
}

results = {}
trained = {}

for name, model in models.items():
    model.fit(X_train_s, y_train)
    preds = model.predict(X_test_s)
    probs = model.predict_proba(X_test_s)[:, 1]
    metrics = {
        "Accuracy": accuracy_score(y_test, preds),
        "Precision": precision_score(y_test, preds),
        "Recall": recall_score(y_test, preds),
        "F1": f1_score(y_test, preds),
        "ROC_AUC": roc_auc_score(y_test, probs),
    }
    results[name] = metrics
    trained[name] = model
    print(f"{name:>18}  Acc={metrics['Accuracy']:.3f}  F1={metrics['F1']:.3f}  ROC-AUC={metrics['ROC_AUC']:.3f}")

# ---------------------------------------------------------------------------
# 5. Pick best model by ROC-AUC
# ---------------------------------------------------------------------------
best_name = max(results, key=lambda k: results[k]["ROC_AUC"])
best_model = trained[best_name]
print(f"\nBest model: {best_name}  ({results[best_name]})")

# ---------------------------------------------------------------------------
# 6. Feature importance plot for the winning model
# ---------------------------------------------------------------------------
if hasattr(best_model, "feature_importances_"):
    importances = pd.Series(best_model.feature_importances_, index=FEATURES).sort_values()
elif hasattr(best_model, "coef_"):
    importances = pd.Series(np.abs(best_model.coef_[0]), index=FEATURES).sort_values()
else:
    importances = pd.Series(dtype=float)

if len(importances):
    plt.figure(figsize=(7, 5.5))
    plt.barh(importances.index, importances.values, color="#5b8def")
    plt.title(f"Feature Importance — {best_name}")
    plt.tight_layout()
    plt.savefig(f"{OUTPUTS_DIR}/feature_importance.png", dpi=130)
    plt.close()
    print("Saved outputs/feature_importance.png")
    feature_importance = importances.sort_values(ascending=False).round(4).to_dict()
else:
    feature_importance = {}

# ---------------------------------------------------------------------------
# 7. Persist model, scaler, metadata for the Flask backend
# ---------------------------------------------------------------------------
joblib.dump(best_model, f"{BACKEND_DIR}/model.pkl")
joblib.dump(scaler, f"{BACKEND_DIR}/scaler.pkl")

metadata = {
    "best_model": best_name,
    "features": FEATURES,
    "metrics": {k: {m: round(v, 4) for m, v in v_.items()} for k, v_ in results.items()},
    "feature_importance": feature_importance,
    "approval_rate_in_training_data": round(float(df[TARGET].mean()), 4),
}
with open(f"{BACKEND_DIR}/model_metadata.json", "w") as f:
    json.dump(metadata, f, indent=2)

print("\nSaved backend/model.pkl, backend/scaler.pkl, backend/model_metadata.json")
