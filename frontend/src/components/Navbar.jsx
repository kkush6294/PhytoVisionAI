import React from "react";

function Navbar({ currentView, setCurrentView, user, onOpenAuth, onLogout }) {
  return (
    <header className="navbar-container">
      <div className="navbar-brand" onClick={() => setCurrentView("identify")}>
        <div className="navbar-logo">🌿</div>
        <div className="navbar-brand-text">
          <span className="navbar-title">PlantVisionAI</span>
          <span className="navbar-subtitle">Medicinal Plant Identification & Pharmacognosy</span>
        </div>
      </div>

      <nav className="navbar-links">
        <button
          className={`nav-link ${currentView === "identify" ? "active" : ""}`}
          onClick={() => setCurrentView("identify")}
        >
          🔍 Identify
        </button>
        <button
          className={`nav-link ${currentView === "result" ? "active" : ""}`}
          onClick={() => setCurrentView("result")}
        >
          📊 Results
        </button>
        <button
          className={`nav-link ${currentView === "analysis" ? "active" : ""}`}
          onClick={() => setCurrentView("analysis")}
        >
          🔬 Analysis
        </button>
        <button
          className={`nav-link ${currentView === "recommendations" ? "active" : ""}`}
          onClick={() => setCurrentView("recommendations")}
        >
          🌱 Recommendations
        </button>
        <button
          className={`nav-link ${currentView === "history" ? "active" : ""}`}
          onClick={() => setCurrentView("history")}
        >
          📜 History
        </button>
        <button
          className={`nav-link ${currentView === "profile" ? "active" : ""}`}
          onClick={() => setCurrentView("profile")}
        >
          👤 Profile
        </button>
      </nav>

      <div className="navbar-user-section">
        {user ? (
          <div className="user-profile-badge">
            <span className="user-avatar-circle">
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </span>
            <div className="user-info-text">
              <span className="user-name-label">{user.name || "User"}</span>
              <span className="user-role-tag">
                {user.isGuest ? "Guest Access" : "Registered User"}
              </span>
            </div>
            {user.isGuest ? (
              <button className="auth-action-btn upgrade-btn" onClick={() => onOpenAuth("login")}>
                Sign In
              </button>
            ) : (
              <button className="auth-action-btn logout-btn" onClick={onLogout}>
                Sign Out
              </button>
            )}
          </div>
        ) : (
          <div className="auth-button-group">
            <button className="auth-action-btn" onClick={() => onOpenAuth("guest")}>
              Guest Mode
            </button>
            <button className="auth-action-btn primary" onClick={() => onOpenAuth("login")}>
              Log In
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;

