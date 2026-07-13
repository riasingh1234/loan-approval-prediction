import "../styles/decision-card.css";

export default function DecisionCard({ result }) {
  return (
    <div className="decision-card glass">
      <div className="card-heading">
        <h3>Decision & Recommendations</h3>
        {result && (
          <span
            className="chip"
            style={{ background: `${result.color}22`, color: result.color, borderColor: `${result.color}55` }}
          >
            {result.decision}
          </span>
        )}
      </div>

      {!result ? (
        <p className="placeholder">Submit an application to see the decision and next steps.</p>
      ) : (
        <>
          <div className="decision-banner" style={{ borderColor: `${result.color}55`, background: `${result.color}12` }}>
            <span className="decision-banner-text" style={{ color: result.color }}>
              {result.approved ? "Loan Likely Approved" : "Loan Likely Rejected"}
            </span>
            <span className="decision-banner-sub mono">{Math.round(result.approval_probability * 100)}% confidence</span>
          </div>

          <p className="advice-heading">{result.approved ? "To keep it on track:" : "To improve your odds:"}</p>
          <ul className="advice-list">
            {result.recommendations.map((line, i) => (
              <li key={i}>
                <span className="advice-dot" style={{ background: result.color }} />
                {line}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
