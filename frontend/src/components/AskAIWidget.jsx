import React, { useState } from "react";
import { askPlantQuestion } from "../services/api";

const PRESET_QUESTIONS = [
  "What compounds are reported for this plant?",
  "What medicinal uses have been studied?",
  "What extraction methods have been reported?",
  "What safety information is available?"
];

export default function AskAIWidget({ plantId, modelClass, localName, scientificName, historyId }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [showReferences, setShowReferences] = useState(false);

  const displayName = localName || modelClass || "this plant";

  const handleAsk = async (qText) => {
    const queryToAsk = (qText || question || "").trim();
    if (!queryToAsk) return;

    setLoading(true);
    setError(null);
    try {
      const res = await askPlantQuestion({
        plantId,
        modelClass,
        historyId,
        question: queryToAsk
      });

      if (res && res.success) {
        setResponse(res);
      } else {
        setError(res?.message || "AI explanation service is currently unavailable.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "AI assistant is currently offline or unreachable. All structured botanical and chemical evidence remains accessible in the cards above."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ask-ai-widget">
      <div className="ask-ai-header">
        <div className="ask-ai-title-group">
          <span className="ask-ai-badge">Evidence-Grounded AI</span>
          <h4 className="ask-ai-title">Ask AI About {displayName}</h4>
          {scientificName && (
            <span className="ask-ai-subtitle">
              Grounded exclusively in literature for <em>{scientificName}</em>
            </span>
          )}
        </div>
      </div>

      <div className="ask-ai-chips">
        {PRESET_QUESTIONS.map((pq, idx) => (
          <button
            key={idx}
            type="button"
            className="ask-ai-chip-btn"
            onClick={() => {
              setQuestion(pq);
              handleAsk(pq);
            }}
            disabled={loading}
          >
            {pq}
          </button>
        ))}
      </div>

      <form
        className="ask-ai-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
      >
        <div className="ask-ai-input-wrapper">
          <input
            type="text"
            className="ask-ai-input"
            placeholder={`Ask a scientific question about ${displayName}...`}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading}
            maxLength={500}
          />
          <button
            type="submit"
            className="ask-ai-submit-btn"
            disabled={loading || !question.trim()}
          >
            {loading ? "Searching..." : "Ask AI"}
          </button>
        </div>
      </form>

      {error && (
        <div className="ask-ai-notice ask-ai-error">
          <p>{error}</p>
        </div>
      )}

      {response && (
        <div className="ask-ai-response-card">
          <div className="ask-ai-answer-header">
            <span className="ask-ai-grounded-tag">
              {response.grounded ? "✓ Strictly Evidence-Grounded" : "Observation"}
            </span>
            {response.citations && response.citations.length > 0 && (
              <button
                type="button"
                className="ask-ai-refs-toggle"
                onClick={() => setShowReferences(!showReferences)}
              >
                {showReferences
                  ? `Hide Sources (${response.citations.length})`
                  : `View Cited Sources (${response.citations.length})`}
              </button>
            )}
          </div>

          <div className="ask-ai-answer-text">
            {response.answer}
          </div>

          {showReferences && response.citations && response.citations.length > 0 && (
            <div className="ask-ai-references-panel">
              <h5 className="ask-ai-refs-title">Cited Scientific Provenance</h5>
              <ul className="ask-ai-refs-list">
                {response.citations.map((c, i) => (
                  <li key={i} className="ask-ai-ref-item">
                    <span className="ask-ai-ref-tag">{c.refTag || `[Ref ${i + 1}]`}</span>
                    <div className="ask-ai-ref-body">
                      <strong>{c.title || c.sourceName || "Source Reference"}</strong>
                      {c.sourceName && <span className="ask-ai-ref-source"> ({c.sourceName})</span>}
                      {c.evidenceLevel && (
                        <span className="ask-ai-ref-level"> • {c.evidenceLevel}</span>
                      )}
                      <p className="ask-ai-ref-claim">{c.claim}</p>
                      {c.url && (
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ask-ai-ref-link"
                        >
                          {c.doi ? `DOI: ${c.doi}` : "View External Record ↗"}
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="ask-ai-disclaimer">
            <small>
              Disclaimer: Responses are compiled exclusively from retrieved botanical monographs and indexed scientific publications. This assistant does not diagnose, provide medical advice, or prescribe dosages.
            </small>
          </div>
        </div>
      )}
    </div>
  );
}
