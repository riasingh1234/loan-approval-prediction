import "../styles/key-factors.css";

const IMPACT_COLOR = {
  positive: "var(--signal-emerald)",
  negative: "var(--risk-high)",
  neutral: "var(--signal-gold)",
};

export default function KeyFactors({ result }) {
  return (
    <div className="factors-card glass">
      <h3>Key Factors</h3>

      {!result ? (
        <p className="placeholder">The factors driving your decision will appear here after submitting.</p>
      ) : result.key_factors.length === 0 ? (
        <p className="placeholder">No single factor stood out — this is a balanced application.</p>
      ) : (
        <div className="factors-list">
          {result.key_factors.map((f, i) => (
            <div className="factor-row" key={i}>
              <span className="factor-dot" style={{ background: IMPACT_COLOR[f.impact] }} />
              <div>
                <p className="factor-name">
                  {f.factor}
                  <span className="factor-impact" style={{ color: IMPACT_COLOR[f.impact] }}>
                    {f.impact}
                  </span>
                </p>
                <p className="factor-note">{f.note}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
