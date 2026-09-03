import React, { useState, useEffect } from "react";
import { getHistory, deleteHistoryItem } from "../services/api";

function HistoryView({ user, onOpenAuth, onSelectPlant, onNavigateIdentify }) {
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  const fetchHistory = async () => {
    if (!user || user.isGuest) return;
    setLoading(true);
    setError("");
    try {
      const res = await getHistory(1, 50);
      setHistoryList(res.history || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load identification history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const handleDelete = async (id) => {
    try {
      await deleteHistoryItem(id);
      setHistoryList((prev) => prev.filter((item) => item._id !== id));
      setActionMsg("Identification record deleted.");
      setTimeout(() => setActionMsg(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete history record.");
    }
  };

  if (!user || user.isGuest) {
    return (
      <div className="section-card locked-state-card">
        <div className="locked-icon">🔒</div>
        <h2>Identification History is Restricted</h2>
        <p>
          Identification histories are securely stored in your personal scientific library. Please sign
          in or create an account to view and manage past specimen analyses.
        </p>
        <div className="locked-actions">
          <button className="auth-action-btn primary" onClick={() => onOpenAuth("login")}>
            Sign In
          </button>
          <button className="auth-action-btn" onClick={() => onOpenAuth("register")}>
            Create Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="history-view-container">
      <div className="view-header-bar">
        <div>
          <h2>📜 Identification History</h2>
          <p>Chronological record of all medicinal plant specimens analyzed with AI model.</p>
        </div>
        <button className="banner-action-btn secondary" onClick={fetchHistory} disabled={loading}>
          ↻ Refresh
        </button>
      </div>

      {actionMsg && <div className="user-feedback-toast">{actionMsg}</div>}
      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading-card">
          <div className="spinner"></div>
          <p>Retrieving your identification records...</p>
        </div>
      ) : historyList.length === 0 ? (
        <div className="empty-history-card">
          <span className="empty-icon">🍃</span>
          <h3>No Identifications Recorded Yet</h3>
          <p>Upload a leaf image to generate your first AI medicinal plant identification.</p>
          <button className="predict-button" onClick={onNavigateIdentify}>
            🔍 Identify a Plant Now
          </button>
        </div>
      ) : (
        <div className="history-table-card">
          <table className="history-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Specimen</th>
                <th>Scientific Name</th>
                <th>Confidence</th>
                <th>Model</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {historyList.map((item) => (
                <tr key={item._id}>
                  <td className="history-date">
                    {new Date(item.uploadedAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>
                    <strong>{item.plantId?.commonName || item.plantId?.modelClass || "Identified Specimen"}</strong>
                  </td>
                  <td className="scientific-col">
                    <em>{item.scientificName || item.plantId?.scientificName || "Unknown"}</em>
                  </td>
                  <td>
                    <span className="history-confidence-pill">
                      {(item.confidence * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td>{item.modelName || "MobileNetV2"}</td>
                  <td>
                    <button
                      className="table-delete-btn"
                      onClick={() => handleDelete(item._id)}
                      title="Delete record"
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default HistoryView;

