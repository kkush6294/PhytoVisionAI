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
          <h3>No documented plant associations found for "{query}".</h3>
          <p>No verified scientific associations exist in the catalog for this specific query.</p>
        </div>
      ) : (
        <div className="recommendations-catalog-grid">
          {results.map((plant) => (
            <div key={plant.id} className="recommendation-plant-card">
              <div className="rec-card-top">
                <span className="rec-plant-badge">MEDICINAL SPECIMEN</span>
                <span className="rec-tox-pill">{plant.toxicityLevel ? "Toxicity Documented" : "Monograph Grounded"}</span>
              </div>

              <h3 className="rec-plant-common">{plant.commonName || plant.plant}</h3>
              <p className="rec-plant-sci">
                <em>{plant.scientificName}</em>
              </p>

              {/* Transparent Recommendation Provenance */}
              <div className="rec-basis-info">
                <span className="rec-basis-label">Matched indication:</span> {plant.matchedIndication || query}
              </div>
              <div className="rec-basis-info">
                <span className="rec-basis-label">Evidence basis:</span> {plant.evidenceType ? plant.evidenceType.replace(/_/g, " ") : "traditional use reported"}
              </div>
              {plant.evidenceSource && (
                <div className="rec-basis-info">
                  <span className="rec-basis-label">Evidence source:</span> {plant.evidenceSource}
                </div>
              )}
              {plant.citation && (
                <div className="rec-citation-snippet">
                  <small><em>Citation:</em> {plant.citation}</small>
                </div>
              )}

              {plant.dosage && (
                <div className="rec-dosage-box">
                  <strong>Source-Reported Dosage:</strong>
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

      {/* Mandatory Medical Disclaimer */}
      <div className="recommendations-disclaimer-card">
        <p>
          ⚕️ <strong>Medical Disclaimer:</strong> Research and educational information only. This information is not medical advice and should not be used to diagnose, treat, cure, or prevent disease. Dosage and treatment decisions should be made with a qualified healthcare professional.
        </p>
      </div>
    </div>
  );
}

export default RecommendationsView;

