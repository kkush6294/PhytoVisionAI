import React, { useState, useEffect } from "react";
import { comparePlants } from "../services/api";

export default function PlantComparisonModal({ initialPlants = [], isOpen, onClose }) {
  const [plantsData, setPlantsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && initialPlants.length >= 2) {
      fetchComparison();
    }
  }, [isOpen, initialPlants]);

  const fetchComparison = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await comparePlants({
        modelClasses: initialPlants
      });
      if (res && res.success) {
        setPlantsData(res.plants || []);
      } else {
        setError(res?.message || "Could not retrieve plant comparison.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to compare plants.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="comparison-modal-backdrop" onClick={onClose}>
      <div
        className="comparison-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="comparison-modal-header">
          <div>
            <span className="comparison-badge">Factual Plant Comparison</span>
            <h3 className="comparison-title">Side-by-Side Botanical & Evidence Profile</h3>
          </div>
          <button type="button" className="comparison-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="comparison-disclaimer-banner">
          <small>
            Botanical and chemical characteristics are presented for factual comparison only. PhytoVisionAI does not rank plants or provide medical efficacy comparisons.
          </small>
        </div>

        {loading && (
          <div className="comparison-loading">
            <p>Loading botanical comparison data...</p>
          </div>
        )}

        {error && (
          <div className="comparison-error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && plantsData.length > 0 && (
          <div className="comparison-grid-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th className="comparison-metric-col">Characteristic</th>
                  {plantsData.map((p) => (
                    <th key={p.id || p.modelClass} className="comparison-plant-col">
                      <div className="comparison-header-local">{p.localName || p.modelClass}</div>
                      <div className="comparison-header-sci">
                        <em>{p.scientificName}</em>
                      </div>
                      <div className="comparison-header-common">{p.commonName}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="comparison-row-label">Taxonomy</td>
                  {plantsData.map((p) => (
                    <td key={p.id || p.modelClass}>
                      <div>Family: {p.family}</div>
                      <div>Genus: {p.genus}</div>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="comparison-row-label">Reported Medicinal Indications</td>
                  {plantsData.map((p) => (
                    <td key={p.id || p.modelClass}>
                      {p.reportedMedicinalUses && p.reportedMedicinalUses.length > 0 ? (
                        <ul className="comparison-list">
                          {p.reportedMedicinalUses.slice(0, 5).map((u, i) => (
                            <li key={i}>
                              {u.term} <span className="comparison-pill">({u.evidenceType})</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="comparison-empty">No monograph indications</span>
                      )}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="comparison-row-label">Reported Phytochemicals</td>
                  {plantsData.map((p) => (
                    <td key={p.id || p.modelClass}>
                      {p.reportedCompounds && p.reportedCompounds.length > 0 ? (
                        <div className="comparison-chips">
                          {p.reportedCompounds.slice(0, 5).map((c, i) => (
                            <span key={i} className="comparison-chip">{c}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="comparison-empty">No candidate compounds</span>
                      )}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="comparison-row-label">Extraction Protocol</td>
                  {plantsData.map((p) => (
                    <td key={p.id || p.modelClass}>
                      {p.extraction?.hasProtocol ? (
                        <div>
                          <div>Method: {p.extraction.method || "Reported"}</div>
                          <div>Solvent: {p.extraction.solvent || "Reported"}</div>
                        </div>
                      ) : (
                        <span className="comparison-empty">Monograph unavailable</span>
                      )}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="comparison-row-label">Safety Profile</td>
                  {plantsData.map((p) => (
                    <td key={p.id || p.modelClass}>
                      <div>Toxicity: {p.safety?.toxicityLevel}</div>
                      <div>Precautions: {p.safety?.precautionsCount} documented</div>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="comparison-row-label">Total Documented Evidence</td>
                  {plantsData.map((p) => (
                    <td key={p.id || p.modelClass}>
                      <strong>{p.evidenceSummary?.totalEvidenceCount || 0} records</strong>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
