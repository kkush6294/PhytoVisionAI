import { useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "http://127.0.0.1:5000/api/predict";

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);
    setError("");

    const imageUrl = URL.createObjectURL(selectedFile);
    setPreview(imageUrl);
  };

  const handlePredict = async () => {
    if (!file) {
      setError("Please select a leaf image first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await axios.post(API_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setResult(response.data);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Unable to analyze the image. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetPrediction = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");
  };

  const prediction = result?.prediction;
  const topPredictions = prediction?.topPredictions?.slice(0, 5) || [];

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-icon">🌿</div>
          <div>
            <h1>PhytoVisionAI</h1>
            <p>AI-Based Medicinal Plant Identification</p>
          </div>
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <div>
            <span className="badge">AI POWERED</span>
            <h2>Medicinal Plant Identification</h2>
            <p>
              Upload a leaf image and let our AI model identify the medicinal
              plant with confidence analysis.
            </p>
          </div>
        </section>

        {!result && (
          <section className="upload-card">
            <div className="upload-header">
              <h2>Upload Leaf Image</h2>
              <p>Supported image formats: JPG, JPEG, PNG</p>
            </div>

            <label className="upload-area">
              {preview ? (
                <img
                  src={preview}
                  alt="Selected leaf"
                  className="upload-preview"
                />
              ) : (
                <>
                  <div className="upload-icon">📷</div>
                  <h3>Choose a leaf image</h3>
                  <p>Click here to browse your computer</p>
                </>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                hidden
              />
            </label>

            {file && (
              <div className="selected-file">
                <span>📄 {file.name}</span>
                <span>{(file.size / 1024).toFixed(1)} KB</span>
              </div>
            )}

            {error && <div className="error">{error}</div>}

            <button
              className="predict-button"
              onClick={handlePredict}
              disabled={!file || loading}
            >
              {loading ? "Analyzing..." : "🔍 Identify Plant"}
            </button>
          </section>
        )}

        {loading && (
          <div className="loading-card">
            <div className="spinner"></div>
            <h3>Analyzing your leaf...</h3>
            <p>AI model is identifying the medicinal plant.</p>
          </div>
        )}

        {result && prediction && (
          <section className="results">
            <div className="result-title">
              <div>
                <span className="badge">ANALYSIS COMPLETE</span>
                <h2>Prediction Result</h2>
              </div>

              <button className="secondary-button" onClick={resetPrediction}>
                ↻ Analyze Another Image
              </button>
            </div>

            <div className="result-grid">
              <div className="image-card">
                <h3>Analyzed Leaf</h3>

                <img
                  src={
                    result.gradcam?.original ||
                    preview
                  }
                  alt="Analyzed leaf"
                  className="result-image"
                />

                <p className="image-name">{file?.name}</p>
              </div>

              <div className="prediction-card">
                <div className="plant-icon">🌱</div>

                <span className="result-label">IDENTIFIED PLANT</span>

                <h1>{prediction.commonName || prediction.class}</h1>

                <p className="scientific-name">
                  <strong>Scientific Name:</strong>{" "}
                  <em>{prediction.scientificName}</em>
                </p>

                <p className="scientific-name">
                  <strong>Class:</strong> {prediction.class}
                </p>

                <div className="confidence-box">
                  <div className="confidence-header">
                    <span>Confidence</span>
                    <strong>
                      {(
                        prediction.calibratedConfidence * 100
                      ).toFixed(2)}
                      %
                    </strong>
                  </div>

                  <div className="progress">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${
                          prediction.calibratedConfidence * 100
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>

                {prediction.rejected ? (
                  <div className="warning">
                    ⚠️ The prediction is below the rejection threshold.
                  </div>
                ) : (
                  <div className="success">
                    ✓ Prediction accepted by the AI model
                  </div>
                )}
              </div>
            </div>

            <div className="section-card">
              <div className="section-heading">
                <h2>🏆 Top Predictions</h2>
                <p>Model confidence distribution</p>
              </div>

              <div className="prediction-list">
                {topPredictions.map((item) => (
                  <div className="prediction-row" key={item.rank}>
                    <div className="rank">
                      #{item.rank}
                    </div>

                    <div className="prediction-info">
                      <strong>
                        {item.commonName || item.class}
                      </strong>
                      <span>{item.scientificName}</span>
                    </div>

                    <div className="prediction-confidence">
                      {(item.calibratedConfidence * 100).toFixed(2)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {result.gradcam?.heatmap && (
              <div className="section-card">
                <div className="section-heading">
                  <h2>🔥 Grad-CAM Analysis</h2>
                  <p>
                    Visual explanation of the regions influencing the
                    prediction
                  </p>
                </div>

                <div className="gradcam-grid">
                  <div>
                    <h3>Original Image</h3>
                    <img
                      src={result.gradcam.original}
                      alt="Original"
                    />
                  </div>

                  <div>
                    <h3>Heatmap</h3>
                    <img
                      src={result.gradcam.heatmap}
                      alt="Grad-CAM heatmap"
                    />
                  </div>

                  {result.gradcam.overlay && (
                    <div>
                      <h3>Overlay</h3>
                      <img
                        src={result.gradcam.overlay}
                        alt="Grad-CAM overlay"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="section-card">
              <div className="section-heading">
                <h2>🌿 Plant Information</h2>
                <p>Information returned by the PhytoVisionAI backend</p>
              </div>

              <div className="info-grid">
                <div className="info-box">
                  <span>Plant Class</span>
                  <strong>{prediction.class}</strong>
                </div>

                <div className="info-box">
                  <span>Scientific Name</span>
                  <strong>{prediction.scientificName}</strong>
                </div>

                <div className="info-box">
                  <span>Common Name</span>
                  <strong>{prediction.commonName}</strong>
                </div>

                <div className="info-box">
                  <span>Model</span>
                  <strong>
                    {result.model?.name || "MobileNetV2"}
                  </strong>
                </div>
              </div>
            </div>

            <button
              className="bottom-button"
              onClick={resetPrediction}
            >
              🔄 Analyze Another Leaf
            </button>
          </section>
        )}
      </main>

      <footer>
        <p>
          PhytoVisionAI • AI-Based Medicinal Plant Identification &
          Bioactive Compound Analysis
        </p>
      </footer>
    </div>
  );
}

export default App;