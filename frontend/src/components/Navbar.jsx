import "../styles/navbar.css";

export default function Navbar({ status }) {
  return (
    <header className="navbar glass">
      <div className="navbar-brand">
        <span className="navbar-mark" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <rect x="4" y="11" width="4" height="9" rx="1" fill="var(--signal-emerald)" opacity="0.55" />
            <rect x="11" y="7" width="4" height="13" rx="1" fill="var(--signal-emerald)" opacity="0.8" />
            <rect x="18" y="3" width="4" height="17" rx="1" fill="var(--signal-emerald)" />
          </svg>
        </span>
        <div>
          <h1>LoanIQ</h1>
          <p>Smart Loan Approval Predictor</p>
        </div>
      </div>

      <div className="navbar-status">
        <span className={`status-dot ${status}`} />
        <span className="status-label">
          {status === "online" ? "Model Online" : status === "loading" ? "Connecting…" : "Offline Mode"}
        </span>
      </div>
    </header>
  );
}
