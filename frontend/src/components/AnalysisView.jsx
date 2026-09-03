import React from "react";
import "../AnalysisView.css";

function AnalysisView({ result, previewImage, onNavigateIdentify }) {
  // Empty State: No analysis available yet
  if (!result || !result.prediction) {
    return (
      <div className="analysis-empty-container">
        <div className="empty-analysis-card">
          <span className="empty-analysis-icon">🔬</span>
          <h2>No Analysis Available</h2>
          <p>
            Please upload a leaf specimen image on the Identify page first.
            Once identified, detailed neural network predictions, calibration metrics,
            and Grad-CAM visual activations will appear here.
          </p>
          <button className="predict-button" onClick={onNavigateIdentify}>
            🔍 Identify a Plant Specimen
          </button>
        </div>
      </div>
    );
  }

  const { prediction, model, gradcam } = result;
  const isRejected = prediction.rejected === true || prediction.class === "Unknown";
  const primaryClass = prediction.class || "Unknown";
  const primaryCommon = prediction.commonName || primaryClass;
  const primarySci = prediction.scientificName || "Species Unconfirmed";
  const calibratedConfidence = prediction.calibratedConfidence || 0;
  const rawConfidence = prediction.rawConfidence || 0;

  // Extract Top-5 predictions from backend response
  const topPredictions = Array.isArray(prediction.topPredictions)
    ? prediction.topPredictions.slice(0, 5)
    : [];

  // Model metadata
  const modelName = model?.name || "MobileNetV2";
  const modelVersion = model?.version || "1.0.0";
  const inputSize = model?.inputSize || "224x224";
  const temperature = "0.8037"; // Calibrated temperature scalar
  const calibrationECE = "0.0110"; // Test set Expected Calibration Error
  const rejectionThreshold = prediction.rejectionThreshold
    ? Number(prediction.rejectionThreshold).toFixed(4)
    : "0.6234";

  // Grad-CAM images
  const gradcamAvailable = gradcam?.available;
  const origImg = gradcam?.original || previewImage;
  const heatmapImg = gradcam?.heatmap;
  const overlayImg = gradcam?.overlay;
  const targetLayer = gradcam?.targetLayer || "Conv_1";

  return (
    <div className="analysis-view-container">
      {/* 1. ANALYSIS HEADER */}
      <header className="analysis-header-banner">
        <div className="analysis-header-left">
          <span className="analysis-header-icon">🔬</span>
          <div>
            <h1 className="analysis-title">AI Model & Explainability Analysis</h1>
            <p className="analysis-subtitle">
              Detailed analysis of model predictions, temperature-scaled calibration, and visual feature activations.
            </p>
          </div>
        </div>

        <div className="analysis-specimen-badge">
          {isRejected ? (
            <span className="specimen-tag rejected">⚠️ Out-of-Distribution / Unknown</span>
          ) : (
            <div className="specimen-tag-group">
              <span className="specimen-tag-common">{primaryCommon}</span>
              <span className="specimen-tag-sci">({primarySci})</span>
            </div>
          )}
        </div>
      </header>

      {/* 6. REJECTION / LOW-CONFIDENCE STATE ALERT */}
      {isRejected && (
        <div className="analysis-rejection-card">
          <div className="rejection-card-icon">⚠️</div>
          <div className="rejection-card-content">
            <h3>Low-Confidence Specimen Rejected (Out-of-Distribution)</h3>
            <p>
              {prediction.uncertaintyMessage ||
                "The calibrated confidence score falls below the empirical rejection threshold (τ = 0.6234). The system rejects this prediction to prevent erroneous classification."}
            </p>
            <div className="rejection-metrics-row">
              <span><strong>Calibrated Confidence:</strong> {(calibratedConfidence * 100).toFixed(2)}%</span>
              <span><strong>Rejection Threshold:</strong> {(Number(rejectionThreshold) * 100).toFixed(2)}%</span>
              <span><strong>Status:</strong> Classification Rejection Enforced</span>
            </div>
            <button className="rejection-retry-btn" onClick={onNavigateIdentify}>
              ← Return to Identify Another Specimen
            </button>
          </div>
        </div>
      )}

      {/* TWO-COLUMN GRID: TOP PREDICTIONS + MODEL SPECS */}
      <div className="analysis-grid-two-col">
        {/* 2. CONFIDENCE / TOP PREDICTIONS SECTION */}
        <section className="analysis-card top-predictions-card">
          <div className="analysis-card-header">
            <span className="card-badge">PROBABILISTIC RANKING</span>
            <h2>Top Candidate Predictions</h2>
          </div>
          <p className="card-description">
            Temperature-scaled posterior probability distribution across the candidate botanical classes.
          </p>

          {topPredictions.length > 0 ? (
            <div className="predictions-list">
              {topPredictions.map((item, index) => {
                const isPrimary = index === 0 && !isRejected;
                const pct = (item.calibratedConfidence * 100).toFixed(2);
                const rawPct = item.rawConfidence ? (item.rawConfidence * 100).toFixed(1) : null;

                return (
                  <div
                    key={item.class || index}
                    className={`prediction-row ${isPrimary ? "primary-prediction" : ""}`}
                  >
                    <div className="prediction-rank-badge">
                      #{item.rank || index + 1}
                    </div>

                    <div className="prediction-info-col">
                      <div className="prediction-names-row">
                        <span className="prediction-common-name">
                          {item.commonName || item.class}
                          {isPrimary && <span className="primary-pill">Primary Prediction</span>}
                        </span>
                        <span className="prediction-percentage">{pct}%</span>
                      </div>

                      {item.scientificName && item.scientificName !== "Unknown" && (
                        <span className="prediction-sci-name">
                          {item.scientificName}
                        </span>
                      )}

                      {/* Horizontal Confidence Bar */}
                      <div className="prediction-bar-track">
                        <div
                          className={`prediction-bar-fill ${isPrimary ? "primary-fill" : "secondary-fill"}`}
                          style={{ width: `${Math.max(3, Math.min(100, item.calibratedConfidence * 100))}%` }}
                        />
                      </div>

                      <div className="prediction-detail-subtext">
                        <span>Calibrated: {pct}%</span>
                        {rawPct && <span>Raw Softmax: {rawPct}%</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-predictions-msg">
              No ranked predictions returned by the inference engine.
            </div>
          )}
        </section>

        {/* 3. MODEL INFORMATION CARD */}
        <section className="analysis-card model-info-card">
          <div className="analysis-card-header">
            <span className="card-badge">ARCHITECTURE SPECIFICATIONS</span>
            <h2>Inference & Calibration Model</h2>
          </div>
          <p className="card-description">
            MobileNetV2 deep convolutional neural network calibrated with validation temperature scaling.
          </p>

          <div className="model-specs-grid">
            <div className="spec-cell">
              <span className="spec-label">Model Architecture</span>
              <span className="spec-value highlight">{modelName}</span>
            </div>

            <div className="spec-cell">
              <span className="spec-label">Model Version</span>
              <span className="spec-value">{modelVersion}</span>
            </div>

            <div className="spec-cell">
              <span className="spec-label">Input Resolution</span>
              <span className="spec-value">{inputSize} (RGB)</span>
            </div>

            <div className="spec-cell">
              <span className="spec-label">Backbone Feature Layer</span>
              <span className="spec-value">{targetLayer} (7×7×1280)</span>
            </div>

            <div className="spec-cell">
              <span className="spec-label">Temperature Scaling (T)</span>
              <span className="spec-value highlight">{temperature}</span>
            </div>

            <div className="spec-cell">
              <span className="spec-label">Calibration ECE</span>
              <span className="spec-value highlight">{calibrationECE}</span>
            </div>

            <div className="spec-cell">
              <span className="spec-label">OOD Rejection Threshold (τ)</span>
              <span className="spec-value">{rejectionThreshold}</span>
            </div>

            <div className="spec-cell">
              <span className="spec-label">Output Classes</span>
              <span className="spec-value">40 Medicinal Taxa</span>
            </div>
          </div>

          <div className="calibration-explanation-box">
            <h4>About Temperature Scaling Calibration</h4>
            <p>
              Deep networks are prone to overconfident misclassifications. In PlantVisionAI, logits are scaled by
              T = {temperature} before softmax computation. This minimizes the Expected Calibration Error (ECE = {calibrationECE})
              and guarantees that confidence reflects empirical posterior correctness.
            </p>
          </div>
        </section>
      </div>

      {/* 4. GRAD-CAM EXPLAINABILITY SECTION */}
      <section className="analysis-card gradcam-full-card">
        <div className="analysis-card-header">
          <span className="card-badge">EXPLAINABLE AI (XAI)</span>
          <h2>Grad-CAM Visual Feature Activation Maps</h2>
        </div>
        <p className="card-description">
          Gradient-weighted Class Activation Mapping (Grad-CAM) highlights the morphological leaf features and spatial
          regions that contributed most strongly to the model's predicted class.
        </p>

        {gradcamAvailable ? (
          <div className="gradcam-triplet-grid">
            {/* Original Image */}
            <div className="gradcam-card-item">
              <div className="gradcam-item-header">
                <span className="gradcam-step-pill">Input Specimen</span>
                <h4>Original Leaf Image</h4>
              </div>
              <div className="gradcam-media-box">
                {origImg ? (
                  <img src={origImg} alt="Original specimen leaf" className="gradcam-display-img" />
                ) : (
                  <div className="gradcam-fallback-box">Original Image Preview</div>
                )}
              </div>
              <span className="gradcam-caption">Cropped & normalized to 224×224 RGB input tensor</span>
            </div>

            {/* Grad-CAM Heatmap */}
            <div className="gradcam-card-item">
              <div className="gradcam-item-header">
                <span className="gradcam-step-pill highlight">Salience Heatmap</span>
                <h4>Activation Heatmap</h4>
              </div>
              <div className="gradcam-media-box">
                {heatmapImg ? (
                  <img src={heatmapImg} alt="Grad-CAM activation heatmap" className="gradcam-display-img" />
                ) : (
                  <div className="gradcam-fallback-box">Heatmap not available</div>
                )}
              </div>
              <span className="gradcam-caption">Gradients routed through backbone layer '{targetLayer}'</span>
            </div>

            {/* Grad-CAM Overlay */}
            <div className="gradcam-card-item">
              <div className="gradcam-item-header">
                <span className="gradcam-step-pill highlight">Explainability Overlay</span>
                <h4>Overlay Visualization</h4>
              </div>
              <div className="gradcam-media-box">
                {overlayImg ? (
                  <img src={overlayImg} alt="Grad-CAM heatmap overlay" className="gradcam-display-img" />
                ) : (
                  <div className="gradcam-fallback-box">Overlay not available</div>
                )}
              </div>
              <span className="gradcam-caption">Jet colormap blended at 40% alpha with source specimen</span>
            </div>
          </div>
        ) : (
          <div className="gradcam-unavailable-alert">
            <p>
              ⚠️ Grad-CAM visualization is not available for this specimen analysis.
              {gradcam?.warning && ` (${gradcam.warning})`}
            </p>
          </div>
        )}

        {/* 5. INTERPRETABILITY RESEARCH NOTE */}
        <div className="interpretability-research-note">
          <div className="note-icon">💡</div>
          <div className="note-content">
            <h4>Research Interpretability Note</h4>
            <p>
              In Gradient-weighted Class Activation Mapping, warmer colors (red, orange, yellow) indicate image regions with
              high positive activation gradients with respect to the target class logit, representing morphological leaf features
              (such as leaf margins, venation patterns, and lamina texture) that heavily influenced the classification decision.
              Cooler colors (blue, cyan) denote low or background activation.
            </p>
            <p className="note-subtext">
              <strong>Clinical & Academic Disclaimer:</strong> Grad-CAM provides visual model transparency and aids in detecting
              spurious background correlations; it does not constitute independent biological, phytochemical, or pharmacological proof.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AnalysisView;

