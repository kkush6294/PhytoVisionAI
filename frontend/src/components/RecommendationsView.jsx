import React, { useState, useEffect } from "react";
import { getRecommendationsByCondition } from "../services/api";

function RecommendationsView() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const popularConditions = ["digestive", "skin", "inflammatory", "ulcer", "antioxidant", "antimicrobial"];

  const executeSearch = async (term) => {
    if (!term || !term.trim()) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const res = await getRecommendationsByCondition(term.trim());
      setResults(res.recommendations || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to retrieve recommendations.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeSearch(query);
  };

  // Initial load with a common therapeutic condition
  useEffect(() => {
    executeSearch("skin");
  }, []);

  return (
    <div className="recommendations-view-container">
      <div className="view-header-bar">
        <div>
          <h2>🌱 Pharmacognosy Recommendations</h2>
          <p>Discover medicinal plants grounded in verified scientific indications and traditional pharmacology.</p>
        </div>
      </div>

      <div className="section-card search-filter-card">
        <form onSubmit={handleSubmit} className="condition-search-form large">
          <input
            type="text"
            placeholder="Search symptoms or conditions e.g. skin, digestive, inflammatory..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="condition-search-input"
          />
          <button type="submit" className="condition-search-btn" disabled={loading}>
            {loading ? "Searching..." : "🔍 Search Indications"}
          </button>
        </form>

        <div className="popular-tags-row">
          <span className="tags-label">Popular Indications:</span>
          {popularConditions.map((cond) => (
            <button
              key={cond}
              className="quick-tag-pill"
              onClick={() => {
                setQuery(cond);
                executeSearch(cond);
              }}
            >
              {cond}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading-card">
          <div className="spinner"></div>
          <p>Querying verified botanical monographs...</p>
        </div>
      ) : searched && results.length === 0 ? (
        <div className="empty-history-card">
          <span className="empty-icon">🔍</span>
          <h3>No Plants Found for "{query}"</h3>
          <p>Try searching for broader botanical properties such as <em>skin</em>, <em>digestive</em>, or <em>inflammatory</em>.</p>
        </div>
      ) : (
        <div className="recommendations-catalog-grid">
          {results.map((plant) => (
            <div key={plant.id} className="recommendation-plant-card">
              <div className="rec-card-top">
                <span className="rec-plant-badge">MEDICINAL SPECIMEN</span>
                <span className="rec-tox-pill">{plant.toxicityLevel ? "Toxicity Documented" : "Verified"}</span>
              </div>

              <h3 className="rec-plant-common">{plant.commonName}</h3>
              <p className="rec-plant-sci">
                <em>{plant.scientificName}</em>
              </p>

              {plant.dosage && (
                <div className="rec-dosage-box">
                  <strong>Recommended Dosage:</strong>
                  <p>{plant.dosage}</p>
                </div>
              )}

              {plant.medicinalProperties?.length > 0 && (
                <div className="rec-properties-section">
                  <strong>Documented Properties:</strong>
                  <ul className="rec-properties-list">
                    {plant.medicinalProperties.slice(0, 3).map((prop, idx) => (
                      <li key={idx}>✓ {prop}</li>
                    ))}
                  </ul>
                </div>
              )}

              {plant.precautions?.length > 0 && (
                <div className="rec-precautions-alert">
                  <strong>⚠️ Caution:</strong> {plant.precautions[0]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecommendationsView;

