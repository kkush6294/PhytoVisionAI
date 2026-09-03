import React, { useState } from "react";
import { loginUser, registerUser, createGuestSession } from "../services/api";

function AuthModal({ initialMode = "login", onClose, onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        const res = await loginUser(email, password);
        localStorage.setItem("phyto_token", res.token);
        onAuthSuccess(res.user, res.token);
        onClose();
      } else {
        const res = await registerUser(name, email, password);
        localStorage.setItem("phyto_token", res.token);
        onAuthSuccess(res.user, res.token);
        onClose();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (mode === "login" ? "Invalid login credentials." : "Registration failed.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAccess = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await createGuestSession();
      localStorage.setItem("phyto_token", res.token);
      onAuthSuccess({ name: "Guest Researcher", isGuest: true }, res.token);
      onClose();
    } catch (err) {
      setError("Failed to initialize guest session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog auth-modal">
        <button className="modal-close-btn" onClick={onClose}>
          ✕
        </button>

        <div className="auth-modal-header">
          <span className="auth-modal-logo">🌿</span>
          <h2>{mode === "login" ? "Sign In to PlantVisionAI" : "Create Researcher Account"}</h2>
          <p>
            {mode === "login"
              ? "Access your saved medicinal plants and identification history."
              : "Register to save plant profiles and track laboratory identifications."}
          </p>
        </div>

        {error && <div className="auth-error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "register" && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Dr. Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="researcher@institution.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? "Processing..." : mode === "login" ? "Sign In" : "Register Account"}
          </button>
        </form>

        <div className="auth-modal-divider">
          <span>OR</span>
        </div>

        <button className="guest-access-btn" onClick={handleGuestAccess} disabled={loading}>
          🧪 Continue with Instant Guest Access
        </button>

        <div className="auth-toggle-footer">
          {mode === "login" ? (
            <p>
              Don't have an account?{" "}
              <button className="text-link" onClick={() => setMode("register")}>
                Register here
              </button>
            </p>
          ) : (
            <p>
              Already registered?{" "}
              <button className="text-link" onClick={() => setMode("login")}>
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;

