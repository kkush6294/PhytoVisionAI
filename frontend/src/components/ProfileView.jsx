import React, { useState, useEffect } from "react";
import { getSavedPlants, removeSavedPlant } from "../services/api";

function ProfileView({ user, onOpenAuth, onLogout }) {
  const [savedPlants, setSavedPlants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  const fetchSaved = async () => {
    if (!user || user.isGuest) return;
    setLoading(true);
    setError("");
    try {
      const res = await getSavedPlants();
      setSavedPlants(res.savedPlants || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load saved plants.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaved();
  }, [user]);

  const handleRemove = async (plantId) => {
    try {
      await removeSavedPlant(plantId);
      setSavedPlants((prev) => prev.filter((item) => item.plantId?._id !== plantId && item._id !== plantId));
      setActionMsg("Plant removed from saved collection.");
      setTimeout(() => setActionMsg(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove plant.");
    }
  };

  if (!user || user.isGuest) {
    return (
      <div className="section-card locked-state-card">
        <div className="locked-icon">👤</div>
        <h2>Guest Researcher Session</h2>
        <p>
          You are currently using PlantVisionAI in guest mode. Register an account to persist saved
          medicinal specimens, record historical analyses, and personalize your laboratory workflow.
        </p>
        <div className="locked-actions">
          <button className="auth-action-btn primary" onClick={() => onOpenAuth("register")}>
            Create Full Account
          </button>
          <button className="auth-action-btn" onClick={() => onOpenAuth("login")}>
            Sign In Existing Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-view-container">
      <div className="profile-hero-card">
        <div className="profile-avatar-large">
          {user.name ? user.name.charAt(0).toUpperCase() : "U"}
        </div>
        <div className="profile-meta-details">
          <h2>{user.name}</h2>
          <p className="profile-email-text">{user.email}</p>
          <div className="profile-badges-row">
            <span className="profile-tag active">Verified Researcher</span>
            <span className="profile-tag">PhytoVisionAI Member</span>
          </div>
        </div>
        <button className="auth-action-btn logout-btn" onClick={onLogout}>
          Sign Out
        </button>
      </div>

      <div className="view-header-bar" style={{ marginTop: "32px" }}>
        <div>
          <h2>💚 Saved Medicinal Plants ({savedPlants.length})</h2>
          <p>Your curated laboratory collection of medicinal specimens.</p>
        </div>
        <button className="banner-action-btn secondary" onClick={fetchSaved} disabled={loading}>
          ↻ Refresh List
        </button>
      </div>

      {actionMsg && <div className="user-feedback-toast">{actionMsg}</div>}
      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading-card">
          <div className="spinner"></div>
          <p>Loading your saved plants collection...</p>
        </div>
      ) : savedPlants.length === 0 ? (
        <div className="empty-history-card">
          <span className="empty-icon">🌱</span>
          <h3>No Plants Saved in Your Library</h3>
          <p>Click "Save Plant" on any identification result page to add specimens here.</p>
        </div>
      ) : (
        <div className="saved-plants-grid">
          {savedPlants.map((item) => {
            const plant = item.plantId || {};
            return (
              <div key={item._id} className="saved-plant-card">
                <div className="saved-card-top">
                  <span className="rec-plant-badge">{plant.modelClass || "Specimen"}</span>
                  <button
                    className="remove-saved-icon-btn"
                    onClick={() => handleRemove(plant._id || item.plantId)}
                    title="Remove from saved collection"
                  >
                    ✕
                  </button>
                </div>

                <h3 className="saved-plant-name">{plant.commonName || "Medicinal Specimen"}</h3>
                <p className="saved-plant-sci">
                  <em>{plant.scientificName || "Taxonomy pending"}</em>
                </p>

                {plant.medicinalProperties?.length > 0 && (
                  <div className="saved-props-snippet">
                    <strong>Documented Uses:</strong>
                    <p>{plant.medicinalProperties[0]}</p>
                  </div>
                )}

                <div className="saved-card-footer">
                  <span className="saved-date-label">
                    Saved on {new Date(item.savedAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ProfileView;

