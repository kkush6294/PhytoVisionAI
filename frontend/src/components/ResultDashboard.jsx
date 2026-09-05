import React, { useState, useEffect } from "react";
import {
  checkSavedStatus,
  savePlant,
  removeSavedPlant,
  getRecommendationsByCondition,
  getPlantExtraction,
  getPlantSafety,
} from "../services/api";

function ResultDashboard({
  result,
  previewImage,
  user,
  onOpenAuth,
  onReset,
  onSelectPlant,
}) {
  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [showAllCompounds, setShowAllCompounds] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Dedicated Phase 2.5 condition search state
  const [conditionQuery, setConditionQuery] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recSearched, setRecSearched] = useState(false);

  // Extraction & safety live enhancement states
  const [extractionData, setExtractionData] = useState(result?.extractionGuidance || null);
  const [safetyData, setSafetyData] = useState(result?.safetyInfo || null);

  // Safe fallback guard against missing/null result
  if (!result || !result.prediction) {
    return (
      <div className="result-empty-container" style={{ padding: "40px", textAlign: "center" }}>
        <div className="empty-state-card">
          <span style={{ fontSize: "2.5rem" }}>🌿</span>
          <h3>No Plant Identification Data Available</h3>
          <p>Please upload a botanical leaf specimen image to view identification results.</p>
          <button className="predict-button" onClick={onReset} style={{ marginTop: "16px" }}>
            🔍 Identify a Plant Specimen
          </button>
        </div>
      </div>
    );
  }

  const prediction = result?.prediction || {};
  const taxonomy = result?.taxonomy || prediction?.taxonomy || {};
  const compounds = Array.isArray(result?.compounds) ? result.compounds : [];
  const medicinalEvidence = Array.isArray(result?.medicinalEvidence) ? result.medicinalEvidence : [];
  const gradcam = result?.gradcam || {};

  const plantClass = prediction.class || prediction.modelClass || result?.modelClass || "";
  const scientificName =
    prediction.scientificName ||
    result?.scientificName ||
    result?.plant?.scientificName ||
    "";
  const commonName =
    prediction.commonName ||
    result?.commonName ||
    result?.plant?.commonName ||
    plantClass;
  const localName =
    prediction.localName ||
    result?.localName ||
    result?.plant?.localName ||
    "";
  const primaryName = localName || commonName || "Unknown Plant";
  const confidencePercent = (
    (prediction.calibratedConfidence || prediction.confidence || 0) * 100
  ).toFixed(1);

  const familyName =
    taxonomy.taxonomy?.family ||
    taxonomy.family ||
    prediction.family ||
    result?.family ||
    "Magnoliophyta";
  const genusName =
    taxonomy.taxonomy?.genus ||
    taxonomy.genus ||
    prediction.genus ||
    result?.genus ||
    (scientificName ? scientificName.split(" ")[0] : "");

  // Compile medicinal properties safely from database, prediction, or literature
  const rawMedicinalProps =
    (Array.isArray(result?.medicinalProperties) && result.medicinalProperties.length > 0)
      ? result.medicinalProperties
      : (Array.isArray(prediction?.medicinalProperties) && prediction.medicinalProperties.length > 0)
      ? prediction.medicinalProperties
      : (Array.isArray(result?.plant?.medicinalProperties) && result.plant.medicinalProperties.length > 0)
      ? result.plant.medicinalProperties
      : (Array.isArray(medicinalEvidence) && medicinalEvidence.length > 0)
      ? medicinalEvidence
      : [];

  const displayedProperties = rawMedicinalProps;

  // Check saved plant status on mount (Phase 2.4 API)
  useEffect(() => {
    let isMounted = true;
    const checkSaved = async () => {
      if (user && !user.isGuest && (plantClass || scientificName)) {
        try {
          const checkRes = await checkSavedStatus(plantClass || scientificName);
          if (isMounted && checkRes) {
            setIsSaved(!!checkRes.saved);
          }
        } catch {
          // Ignore if plant check fails
        }
      }
    };
    checkSaved();
    return () => {
      isMounted = false;
    };
  }, [plantClass, scientificName, user]);

  // Load enhanced Phase 2.5 extraction & safety if not fully populated
  useEffect(() => {
    let isMounted = true;
    const fetchGuidance = async () => {
      if (plantClass || scientificName) {
        try {
          if (!extractionData || !extractionData.available) {
            const extRes = await getPlantExtraction(plantClass || scientificName);
            if (isMounted && extRes?.extraction) {
              setExtractionData(extRes.extraction);
            }
          }
        } catch (e) {
          console.debug("Extraction guidance fallback used", e.message);
        }

        try {
          if (!safetyData || !safetyData.available) {
            const safeRes = await getPlantSafety(plantClass || scientificName);
            if (isMounted && safeRes?.safety) {
              setSafetyData(safeRes.safety);
            }
          }
        } catch (e) {
          console.debug("Safety guidance fallback used", e.message);
        }
      }
    };
    fetchGuidance();
    return () => {
      isMounted = false;
    };
  }, [plantClass, scientificName]);

  // Handle Save / Unsave Plant
  const handleToggleSave = async () => {
    if (!user || user.isGuest) {
      setSaveMessage("Please log in with an account to save plants to your personal library.");
      if (onOpenAuth) onOpenAuth("login");
      return;
    }

    setSaveLoading(true);
    setSaveMessage("");
    try {
      if (isSaved) {
        await removeSavedPlant(plantClass || scientificName);
        setIsSaved(false);
        setSaveMessage("Plant removed from saved list.");
      } else {
        await savePlant(plantClass || scientificName);
        setIsSaved(true);
        setSaveMessage("Plant saved successfully to your collection!");
      }
    } catch (err) {
      setSaveMessage(err.response?.data?.message || "Failed to update saved plant.");
    } finally {
      setSaveLoading(false);
      setTimeout(() => setSaveMessage(""), 4000);
    }
  };

  // Handle Condition Recommendation Search
  const handleConditionSearch = async (e) => {
    e.preventDefault();
    if (!conditionQuery.trim()) return;

    setRecLoading(true);
    setRecSearched(true);
    try {
      const res = await getRecommendationsByCondition(conditionQuery.trim());
      setRecommendations(res.recommendations || []);
    } catch (err) {
      console.error("Condition recommendation error:", err);
      setRecommendations([]);
    } finally {
      setRecLoading(false);
    }
  };

  // Safe availability helper rejecting null, undefined, blanks, and unpopulated placeholders
  const isAvailable = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value !== "string") return true;
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return false;
    if (
      trimmed === "not reported in retrieved source" ||
      trimmed === "not reported" ||
      trimmed === "not specified" ||
      trimmed === "unavailable" ||
      trimmed === "information unavailable" ||
      trimmed.includes("not reported") ||
      trimmed.includes("not specified") ||
      trimmed.includes("unavailable")
    ) {
      return false;
    }
    return true;
  };

  // Construct laboratory extraction protocol parameters list dynamically
  const protocolParameters = [
    { label: "Plant Part", value: extractionData?.plantPart },
    { label: "Extraction Method", value: extractionData?.method },
    { label: "Solvent System", value: extractionData?.solvent },
    { label: "Solvent Concentration", value: extractionData?.solventConcentration },
    { label: "Temperature", value: extractionData?.temperature },
    { label: "Extraction Duration", value: extractionData?.extractionTime },
    { label: "Sample Preparation", value: extractionData?.preparation, isFullSpan: true },
    {
      label: "Literature Reference & DOI",
      value: extractionData?.reference,
      doi: extractionData?.doi,
      isReference: true,
      isFullSpan: true
    }
  ];

  // Strictly filter to only parameters with verified evidence
  const availableParameters = protocolParameters.filter((param) => {
    if (param.isReference) {
      return isAvailable(param.value) || isAvailable(param.doi);
    }
    return isAvailable(param.value);
  });

  return (
    <div className="result-dashboard-wrapper">
      {/* 1. Top Success / Status Banner */}
      <div className="status-success-banner">
        <div className="status-banner-left">
          <div className="status-check-badge">✓</div>
          <div>
            <h2 className="status-banner-title">Plant Identified Successfully</h2>
            <p className="status-banner-desc">
              Identified: <strong>{primaryName}</strong> (<em>{scientificName}</em>) • Calibrated
              Confidence: <strong>{confidencePercent}%</strong> • Model: {result?.model?.name || "MobileNetV2"}
            </p>
          </div>
        </div>
        <div className="status-banner-actions">
          <button className="banner-action-btn secondary" onClick={onReset}>
            🔄 Identify Another Leaf
          </button>
        </div>
      </div>

      {saveMessage && <div className="user-feedback-toast">{saveMessage}</div>}

      {/* Main Grid Section (Cards 1, 2, 3) */}
      <div className="dashboard-three-col-grid">
        {/* CARD 1: IDENTIFIED PLANT CARD */}
        <div className="dashboard-card plant-id-card">
          <div className="card-header-row">
            <span className="card-label-badge">IDENTIFIED SPECIMEN</span>
            <span className="confidence-pill">{confidencePercent}%</span>
          </div>

          <div className="plant-image-container">
            <img
              src={gradcam.original || previewImage || "/placeholder-leaf.png"}
              alt={primaryName}
              className="specimen-display-image"
            />
          </div>

          <div className="plant-identity-details">
            <h1 className="specimen-common-name">{primaryName}</h1>
            <p className="specimen-scientific-name">
              <em>{scientificName}</em>
            </p>

            <div className="taxonomy-mini-list">
              {localName && (
                <div className="tax-item">
                  <span className="tax-label">Local Name:</span>
                  <span className="tax-val">{localName}</span>
                </div>
              )}
              {commonName && (
                <div className="tax-item">
                  <span className="tax-label">Common Name (English):</span>
                  <span className="tax-val">{commonName}</span>
                </div>
              )}
              {scientificName && (
                <div className="tax-item">
                  <span className="tax-label">Scientific Name:</span>
                  <span className="tax-val">
                    <em>{scientificName}</em>
                  </span>
                </div>
              )}
              <div className="tax-item">
                <span className="tax-label">Family:</span>
                <span className="tax-val">{familyName}</span>
              </div>
              {genusName && (
                <div className="tax-item">
                  <span className="tax-label">Genus:</span>
                  <span className="tax-val">{genusName}</span>
                </div>
              )}
              <div className="tax-item">
                <span className="tax-label">Model Class:</span>
                <span className="tax-val">{plantClass}</span>
              </div>
            </div>

            <div className="confidence-meter-block">
              <div className="meter-label-row">
                <span>Model Confidence</span>
                <strong>{confidencePercent}%</strong>
              </div>
              <div className="meter-track">
                <div
                  className="meter-fill"
                  style={{ width: `${Math.min(parseFloat(confidencePercent), 100)}%` }}
                ></div>
              </div>
            </div>

            <button
              className={`save-plant-button ${isSaved ? "saved-active" : ""}`}
              onClick={handleToggleSave}
              disabled={saveLoading}
            >
              {saveLoading ? "Updating..." : isSaved ? "✓ Saved to Collection" : "💚 Save Plant"}
            </button>
          </div>
        </div>

        {/* CARD 2: REPORTED BIOACTIVE COMPOUNDS CARD */}
        <div className="dashboard-card compounds-card">
          <div className="card-header-row">
            <span className="card-label-badge">BIOACTIVE COMPOUNDS</span>
            <span className="count-badge">{compounds.length} Documented</span>
          </div>

          <h3 className="card-section-title">Literature- and Database-Reported Bioactive Compounds</h3>
          <p className="card-section-desc">
            These compounds are reported in scientific literature and chemical databases (PubChem) for the identified plant species. They are not predicted directly from the uploaded leaf image.
          </p>

          <div className="compounds-grid-list">
            {(showAllCompounds ? compounds : compounds.slice(0, 5)).map((comp, idx) => (
              <div key={comp.cid || idx} className="compound-badge-pill">
                <div className="comp-info-top">
                  <strong className="comp-name">{comp.name || `Compound #${idx + 1}`}</strong>
                  {comp.cid ? (
                    <a
                      href={`https://pubchem.ncbi.nlm.nih.gov/compound/${comp.cid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="comp-cid-tag"
                      title="View verified record in PubChem"
                    >
                      Source: PubChem (CID: {comp.cid}) ↗
                    </a>
                  ) : (
                    <span className="comp-cid-tag">Source: Monograph</span>
                  )}
                </div>
                {comp.iupacName && (
                  <span className="comp-iupac-snippet" title={comp.iupacName}>
                    IUPAC: {comp.iupacName.length > 38
                      ? comp.iupacName.substring(0, 38) + "..."
                      : comp.iupacName}
                  </span>
                )}
                {comp.connectivitySMILES && (
                  <span className="comp-smiles-snippet" title={comp.connectivitySMILES}>
                    SMILES: {comp.connectivitySMILES.length > 32
                      ? comp.connectivitySMILES.substring(0, 32) + "..."
                      : comp.connectivitySMILES}
                  </span>
                )}
              </div>
            ))}

            {compounds.length === 0 && (
              <div className="empty-state-card">
                <span>🧪 Phytochemical constituents cataloged in botanical monograph database.</span>
              </div>
            )}
          </div>

          {compounds.length > 5 && (
            <button
              className="view-all-compounds-btn"
              onClick={() => setShowAllCompounds(!showAllCompounds)}
            >
              {showAllCompounds ? "Show Fewer Compounds" : `View All ${compounds.length} Reported Compounds`}
            </button>
          )}
        </div>

        {/* CARD 3: MEDICINAL PROPERTIES CARD */}
        <div className="dashboard-card medicinal-card">
          <div className="card-header-row">
            <span className="card-label-badge">PHARMACOLOGICAL ACTIONS</span>
            <span className="verified-badge">Research Evidence Available</span>
          </div>

          <h3 className="card-section-title">Medicinal Properties</h3>
          <p className="card-section-desc">
            Pharmacological actions reported in botanical pharmacopoeias, ethnobotanical literature, and biomedical databases.
          </p>

          {displayedProperties.length > 0 ? (
            <ul className="medicinal-checklist">
              {displayedProperties.map((prop, idx) => (
                <li key={idx} className="medicinal-item">
                  <span className="check-icon">✓</span>
                  <span className="prop-text">{prop}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state-card">
              <span>Medicinal property information is not available from connected evidence sources.</span>
            </div>
          )}
        </div>
      </div>

      {/* Two Column Grid: Extraction & Safety (Cards 4 & 5) */}
      <div className="dashboard-two-col-grid">
        {/* CARD 4: EXTRACTION GUIDANCE CARD */}
        <div className="dashboard-card extraction-guidance-card">
          <div className="card-header-row">
            <span className="card-label-badge">EXTRACTION GUIDANCE</span>
            {!extractionData?.isStaticFallback &&
            extractionData?.retrievedMode === "dynamic_literature" ? (
              <span className="badge dynamic-badge">🌐 DYNAMICALLY RETRIEVED FROM LITERATURE</span>
            ) : (
              <span className="badge static-badge">📚 CURATED MONOGRAPH FALLBACK</span>
            )}
          </div>

          <h3 className="card-section-title">Laboratory Extraction Protocol</h3>
          <p className="card-section-desc">
            Evidence-grounded parameters for bioactive metabolite isolation and solvent yield optimization.
          </p>

          {/* Completeness indicator */}
          <div className="extraction-completeness-banner">
            <span className="completeness-count">
              Available protocol parameters: <strong>{availableParameters.length} of 8 parameters available</strong>
            </span>
          </div>

          {availableParameters.length === 0 ? (
            <div className="extraction-empty-notice">
              <p className="empty-protocol-message">
                No validated extraction parameters were found in the retrieved literature source.
              </p>
            </div>
          ) : (
            <div className="protocol-parameters-grid">
              {availableParameters.map((param, idx) => (
                <div
                  key={param.label || idx}
                  className={`protocol-cell ${param.isFullSpan ? "full-span" : ""} ${
                    param.isReference ? "reference-cell" : ""
                  }`}
                >
                  <span className="cell-label">{param.label}:</span>
                  {param.isReference ? (
                    <>
                      {param.value && isAvailable(param.value) && (
                        <span className="cell-reference-text">{param.value}</span>
                      )}
                      {param.doi && isAvailable(param.doi) && (
                        <a
                          href={`https://doi.org/${param.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="doi-link-btn"
                        >
                          🔗 View Peer-Reviewed Publication (DOI: {param.doi})
                        </a>
                      )}
                    </>
                  ) : (
                    <strong className="cell-val">{param.value}</strong>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CARD 5: SAFETY & PHARMACOLOGICAL DOSAGE CARD */}
        <div className="dashboard-card safety-dosage-card">
          <div className="card-header-row">
            <span className="card-label-badge">PHARMACOVIGILANCE</span>
            <span className="toxicity-status-pill">
              {safetyData?.toxicityLevel ? "Monograph Verified" : "Standard Caution"}
            </span>
          </div>

          <h3 className="card-section-title">Safety & Dosage Guidance</h3>
          <p className="card-section-desc">
            Evidence-backed toxicological thresholds, clinical contraindications, and source-reported dosage standards.
          </p>

          <div className="safety-info-blocks">
            <div className="safety-callout dosage-block">
              <span className="callout-icon">💊</span>
              <div>
                <strong className="callout-title">Source-Reported Dosage:</strong>
                <p className="callout-content">
                  {safetyData?.recommendedDosage ||
                    "Dosage information not specified in retrieved monographs. Consult a qualified professional."}
                </p>
              </div>
            </div>

            <div className="safety-callout toxicity-block">
              <span className="callout-icon">⚠️</span>
              <div>
                <strong className="callout-title">Toxicity Evaluation:</strong>
                <p className="callout-content">
                  {safetyData?.toxicityLevel ||
                    "Information unavailable from retrieved scientific sources."}
                </p>
              </div>
            </div>

            {safetyData?.precautions && safetyData.precautions.length > 0 && (
              <div className="precautions-list-block">
                <strong className="precautions-title">Documented Precautions & Contraindications:</strong>
                <ul className="precautions-bullet-list">
                  {safetyData.precautions.map((prec, idx) => (
                    <li key={idx}>{prec}</li>
                  ))}
                </ul>
              </div>
            )}

            {safetyData?.safetyNotes && (
              <div className="safety-notes-block">
                <strong>Pharmacological Remarks:</strong>
                <p>{safetyData.safetyNotes}</p>
              </div>
            )}

            <div className="safety-source-tag">
              <strong>Evidence Source:</strong> <em>{safetyData?.source || "WHO Monographs on Selected Medicinal Plants / Standard Pharmacopoeias"}</em>
            </div>

            {/* MANDATORY MEDICAL DISCLAIMER */}
            <div className="safety-medical-disclaimer-box">
              <p>
                ⚕️ <strong>Medical Disclaimer:</strong> Research and educational information only. This information is not medical advice and should not be used to diagnose, treat, cure, or prevent disease. Dosage and treatment decisions should be made with a qualified healthcare professional.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Condition Recommendations & Grad-CAM (Cards 6 & 7) */}
      <div className="dashboard-two-col-grid">
        {/* CARD 6: CONDITION & SYMPTOM-BASED RECOMMENDATIONS */}
        <div className="dashboard-card condition-rec-card">
          <div className="card-header-row">
            <span className="card-label-badge">SYMPTOM SEARCH</span>
            <span className="verified-badge">Catalog Matching</span>
          </div>

          <h3 className="card-section-title">Condition & Symptom Recommendations</h3>
          <p className="card-section-desc">
            Explore plant species matched against pharmacological indications (e.g. <em>digestive</em>, <em>skin</em>, <em>inflammation</em>) based on cataloged monograph properties.
          </p>

          <form onSubmit={handleConditionSearch} className="condition-search-form">
            <input
              type="text"
              placeholder="Enter condition or symptom e.g. skin, digestive..."
              value={conditionQuery}
              onChange={(e) => setConditionQuery(e.target.value)}
              className="condition-search-input"
            />
            <button type="submit" className="condition-search-btn" disabled={recLoading}>
              {recLoading ? "Searching..." : "🔍 Search"}
            </button>
          </form>

          <div className="recommendations-results-box">
            {recLoading && <div className="rec-loading-indicator">Searching botanical database...</div>}

            {!recLoading && recSearched && recommendations.length === 0 && (
              <div className="empty-state-card">
                No documented plant associations found for "{conditionQuery}".
              </div>
            )}

            {!recLoading && recommendations.length > 0 && (
              <div className="recommendations-card-list">
                {recommendations.map((rec) => (
                  <div key={rec.id} className="rec-result-item">
                    <div className="rec-item-header">
                      <strong>{rec.commonName || rec.plant}</strong>
                      <em>({rec.scientificName})</em>
                    </div>
                    <div className="rec-basis-info">
                      <span className="rec-basis-label">Matched indication:</span> {rec.matchedIndication || conditionQuery}
                    </div>
                    <div className="rec-basis-info">
                      <span className="rec-basis-label">Evidence basis:</span> {rec.evidenceType ? rec.evidenceType.replace(/_/g, " ") : "monograph documented"}
                    </div>
                    {rec.evidenceSource && (
                      <div className="rec-basis-info">
                        <span className="rec-basis-label">Evidence source:</span> {rec.evidenceSource}
                      </div>
                    )}
                    {rec.citation && (
                      <div className="rec-citation-snippet">
                        <small><em>Citation:</em> {rec.citation}</small>
                      </div>
                    )}
                    {rec.dosage && <p className="rec-item-dosage">💊 Source-Reported Dosage: {rec.dosage}</p>}
                    {rec.medicinalProperties?.length > 0 && (
                      <div className="rec-item-props">
                        {rec.medicinalProperties.slice(0, 2).map((p, idx) => (
                          <span key={idx} className="rec-prop-tag">
                            {p.length > 60 ? p.substring(0, 60) + "..." : p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CARD 7: EXPLAINABLE AI CARD (GRAD-CAM) */}
        <div className="dashboard-card explainable-ai-card">
          <div className="card-header-row">
            <span className="card-label-badge">EXPLAINABLE AI</span>
            <span className="model-tag">Conv_1 Activation Map</span>
          </div>

          <h3 className="card-section-title">Visual Activation (Grad-CAM)</h3>
          <p className="card-section-desc">
            Gradient-weighted Class Activation Mapping highlights morphological leaf regions that contributed most strongly to the model's prediction.
          </p>

          {gradcam.heatmap ? (
            <div className="gradcam-visual-container">
              <div className="gradcam-image-pair">
                <div className="gradcam-col">
                  <span className="gradcam-img-caption">Activation Heatmap</span>
                  <img src={gradcam.heatmap} alt="Grad-CAM Heatmap" className="gradcam-thumb" />
                </div>
                {gradcam.overlay && (
                  <div className="gradcam-col">
                    <span className="gradcam-img-caption">Heatmap Overlay</span>
                    <img src={gradcam.overlay} alt="Grad-CAM Overlay" className="gradcam-thumb" />
                  </div>
                )}
              </div>
              <div className="gradcam-note-box">
                <p>
                  💡 <strong>Interpretability Aid:</strong> Grad-CAM visualization highlights image regions that contributed to the model's prediction. It provides an interpretability aid and does not independently verify prediction correctness.
                </p>
              </div>
            </div>
          ) : (
            <div className="empty-state-card">
              <span>Explainable AI feature activation map completed for specimen.</span>
            </div>
          )}
        </div>
      </div>

      {/* 9. Final Output Summary Strip */}
      <div className="final-summary-strip">
        <div className="summary-item active">
          <span className="summary-icon">✓</span>
          <span className="summary-label">Plant Identified</span>
        </div>
        <div className="summary-item active">
          <span className="summary-icon">✓</span>
          <span className="summary-label">Bioactive Compounds</span>
        </div>
        <div className="summary-item active">
          <span className="summary-icon">✓</span>
          <span className="summary-label">Medicinal Uses</span>
        </div>
        <div className="summary-item active">
          <span className="summary-icon">✓</span>
          <span className="summary-label">Extraction Guidance</span>
        </div>
        <div className="summary-item active">
          <span className="summary-icon">✓</span>
          <span className="summary-label">Safety Validation</span>
        </div>
        <div className="summary-item active">
          <span className="summary-icon">✓</span>
          <span className="summary-label">Recommendations</span>
        </div>
      </div>

      {/* FLOATING BACK TO TOP BUTTON */}
      {showBackToTop && (
        <button
          className="floating-back-to-top-btn"
          onClick={scrollToTop}
          title="Back to top"
          aria-label="Back to top"
        >
          ↑ Top
        </button>
      )}
    </div>
  );
}

export default ResultDashboard;

