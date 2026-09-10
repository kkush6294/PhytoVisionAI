import React, { useState, useEffect } from "react";
import "./App.css";
import "./ResultDashboard.css";
import Navbar from "./components/Navbar";
import ResultDashboard from "./components/ResultDashboard";
import AnalysisView from "./components/AnalysisView";
import AuthModal from "./components/AuthModal";
import HistoryView from "./components/HistoryView";
import RecommendationsView from "./components/RecommendationsView";
import ProfileView from "./components/ProfileView";
import { predictImage, recordHistory, getMe, createGuestSession } from "./services/api";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("PhytoVision ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="empty-history-card" style={{ padding: "40px", textAlign: "center" }}>
          <span className="empty-icon">⚠️</span>
          <h3>Unable to display view</h3>
          <p>{this.state.error?.message || "An unexpected rendering error occurred."}</p>
          <button
            className="predict-button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onReset) this.props.onReset();
            }}
          >
            🔄 Reset and Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [user, setUser] = useState(null);
  const [authModal, setAuthModal] = useState(null); // 'login' | 'register' | null
  const [currentView, setCurrentView] = useState("identify"); // 'identify' | 'result' | 'analysis' | 'recommendations' | 'history' | 'profile'

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Client-side image validation before prediction
  const validateImageFile = (selectedFile) => {
    if (!selectedFile) {
      return "No file selected. Please choose a leaf image.";
    }
    if (selectedFile.size === 0) {
      return "The selected file is empty (0 bytes). Please select a valid botanical leaf photograph.";
    }
    if (selectedFile.size > MAX_IMAGE_SIZE) {
      const sizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2);
      return `File size (${sizeMB} MB) exceeds the 5 MB limit. Please select a smaller leaf image.`;
    }
    const fileType = (selectedFile.type || "").toLowerCase();
    const fileName = (selectedFile.name || "").toLowerCase();
    const hasValidExt = /\.(jpe?g|png|webp)$/i.test(fileName);
    if (!ALLOWED_IMAGE_TYPES.includes(fileType) && !hasValidExt) {
      return `Unsupported file format (${selectedFile.type || "unknown"}). Only JPG, JPEG, PNG, and WebP botanical images are supported.`;
    }
    return null;
  };

  // Initialize session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("phyto_token");
      if (token) {
        try {
          const meRes = await getMe();
          if (meRes?.user) {
            setUser(meRes.user);
            return;
          }
        } catch (err) {
          console.debug("Stored token invalid or expired, falling back to guest.");
          localStorage.removeItem("phyto_token");
        }
      }
      // Initialize automatic guest session
      try {
        const guestRes = await createGuestSession();
        localStorage.setItem("phyto_token", guestRes.token);
        setUser({ name: "Guest Researcher", isGuest: true });
      } catch (e) {
        console.warn("Guest session initialization offline:", e.message);
      }
    };
    initAuth();
  }, []);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    const validationError = validateImageFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
      setPreview(null);
      return;
    }

    setFile(selectedFile);
    setError("");
    const imageUrl = URL.createObjectURL(selectedFile);
    setPreview(imageUrl);
  };

  const handlePredict = async () => {
    if (!file) {
      setError("Please select a leaf image first.");
      return;
    }

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await predictImage(file);
      setResult(data);
      setCurrentView("result");

      // Auto-record history for registered users (Phase 2.4 API)
      if (user && !user.isGuest && data.prediction) {
        try {
          await recordHistory({
            scientificName: data.prediction.scientificName,
            commonName: data.prediction.commonName,
            localName: data.prediction.localName,
            confidence: data.prediction.calibratedConfidence || data.prediction.confidence,
            modelName: data.model?.name || "MobileNetV2",
            notes: `Class: ${data.prediction.class}`,
          });
        } catch (hErr) {
          console.debug("History recording background task:", hErr.message);
        }
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Unable to analyze the leaf image. Ensure the backend gateway is running on port 5000."
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
    setCurrentView("identify");
  };

  const handleLogout = () => {
    localStorage.removeItem("phyto_token");
    setUser({ name: "Guest Researcher", isGuest: true });
    setCurrentView("identify");
  };

  const handleAuthSuccess = (authUser, token) => {
    setUser(authUser);
  };

  return (
    <div className="app">
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        user={user}
        onOpenAuth={(mode) => setAuthModal(mode)}
        onLogout={handleLogout}
      />

      <main className="container">
        {/* VIEW 1: IDENTIFY VIEW (UPLOAD & SCAN) */}
        {currentView === "identify" && (
          <>
            <section className="hero">
              <div>
                <span className="badge">AI POWERED PHARMACOGNOSY</span>
                <h2>Medicinal Plant Identification</h2>
                <p>
                  Upload a botanical specimen leaf image to activate deep neural network identification
                  calibrated with GBIF taxonomy, PubChem bioactive compounds, and scientific extraction
                  protocols.
                </p>
              </div>
            </section>

            <section className="upload-card">
              <div className="upload-header">
                <h2>Upload Leaf Image</h2>
                <p>Supported image formats: JPG, JPEG, PNG, WebP (Botanical leaf specimen)</p>
              </div>

              <label className="upload-area">
                {preview ? (
                  <img src={preview} alt="Selected leaf" className="upload-preview" />
                ) : (
                  <>
                    <div className="upload-icon">📷</div>
                    <h3>Choose a leaf image</h3>
                    <p>Click here or drag and drop your specimen image</p>
                  </>
                )}

                <input type="file" accept="image/*" onChange={handleFileChange} hidden />
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
                {loading ? "Analyzing Specimen..." : "🔍 Identify Plant Specimen"}
              </button>

              {result && (
                <div style={{ marginTop: "16px", display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                  <button className="secondary-button" onClick={() => setCurrentView("result")}>
                    📊 View Identification Result
                  </button>
                  <button className="secondary-button" onClick={() => setCurrentView("analysis")}>
                    🔬 View AI Model Analysis
                  </button>
                </div>
              )}
            </section>
          </>
        )}

        {/* LOADING STATE */}
        {loading && (
          <div className="loading-card">
            <div className="spinner"></div>
            <h3>Analyzing Botanical Specimen...</h3>
            <p>
              MobileNetV2 classifier is extracting morphological features and generating Grad-CAM
              heatmaps...
            </p>
          </div>
        )}

        {/* VIEW 2: SCREEN 6 IDENTIFICATION RESULT DASHBOARD */}
        {currentView === "result" && (
          <ErrorBoundary onReset={resetPrediction}>
            {result ? (
              <ResultDashboard
                result={result}
                previewImage={preview}
                user={user}
                onOpenAuth={(mode) => setAuthModal(mode)}
                onReset={resetPrediction}
              />
            ) : (
              <div className="empty-history-card">
                <span className="empty-icon">🌿</span>
                <h3>No Plant Identified Yet</h3>
                <p>Upload a leaf image to generate the scientific identification result dashboard.</p>
                <button className="predict-button" onClick={() => setCurrentView("identify")}>
                  🔍 Identify a Plant Now
                </button>
              </div>
            )}
          </ErrorBoundary>
        )}

        {/* VIEW 3: SCREEN 7 DEDICATED AI ANALYSIS VIEW */}
        {currentView === "analysis" && (
          <ErrorBoundary onReset={resetPrediction}>
            <AnalysisView
              result={result}
              previewImage={preview}
              onNavigateIdentify={() => setCurrentView("identify")}
            />
          </ErrorBoundary>
        )}

        {/* VIEW 4: RECOMMENDATIONS VIEW */}
        {currentView === "recommendations" && <RecommendationsView />}

        {/* VIEW 4: HISTORY VIEW */}
        {currentView === "history" && (
          <HistoryView
            user={user}
            onOpenAuth={(mode) => setAuthModal(mode)}
            onNavigateIdentify={() => setCurrentView("identify")}
          />
        )}

        {/* VIEW 5: PROFILE & SAVED PLANTS VIEW */}
        {currentView === "profile" && (
          <ProfileView
            user={user}
            onOpenAuth={(mode) => setAuthModal(mode)}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* AUTH MODAL */}
      {authModal && (
        <AuthModal
          initialMode={authModal}
          onClose={() => setAuthModal(null)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {/* FOOTER */}
      <footer className="footer-container">
        <div className="disclaimer-banner">
          <p>
            ⚕️ <strong>Medical Disclaimer:</strong> This platform provides AI-assisted research and
            educational pharmacognosy data and is NOT a substitute for professional clinical advice,
            diagnosis, or treatment. Consult a qualified healthcare professional before administering
            medicinal plant preparations.
          </p>
        </div>
        <p>PhytoVisionAI Research • AI-Based Medicinal Plant Identification & Pharmacognosy Gateway</p>
      </footer>
    </div>
  );
}

export default App;