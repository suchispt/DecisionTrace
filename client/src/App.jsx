import { useRef, useState } from "react";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";

import "reactflow/dist/style.css";
import { uploadDecision } from "./controllers/decisionController";
import "./styles/App.css";

function App() {
  // ==================================================
  // FILE UPLOAD
  // ==================================================

  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // ==================================================
  // DECISION DATA
  // ==================================================

  const [selectedDecision, setSelectedDecision] = useState(null);
  const [decisionPath, setDecisionPath] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadError("");

    try {
      setUploading(true);
      const path = await uploadDecision(file);
      setSelectedDecision(path.decision);
      setDecisionPath(path);
    } catch (error) {
      setUploadError(error.message || "Failed to upload decision.");

      setSelectedDecision(null);
      setDecisionPath(null);
    } finally {
      setUploading(false);

      // Allow same file to be uploaded again
      event.target.value = "";
    }
  };

  // ==================================================
  // UPLOAD ANOTHER DECISION
  // ==================================================

  const handleUploadAnother = () => {
    setSelectedDecision(null);
    setDecisionPath(null);
    setUploadError("");

    setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
  };

  // ==================================================
  // EXTRACT DATA
  // ==================================================

  const evidence = decisionPath?.evidence || null;

  const source = decisionPath?.source || null;

  const factor = decisionPath?.factor || null;

  const outcome = decisionPath?.outcome || null;

  // ==================================================
  // GRAPH NODES
  // ==================================================

  const nodes = selectedDecision
    ? [
        // --------------------------------------------
        // SOURCE
        // --------------------------------------------

        {
          id: "source",

          position: {
            x: 200,
            y: 400,
          },
          style: {
            width: 220,
            minHeight: 140,
          },

          data: {
            label: (
              <div>
                <div className="node-title">SOURCE</div>

                <div className="node-main-text">
                  {source?.name || "Unknown Source"}
                </div>

                <small className="node-small-text">{source?.type || ""}</small>
              </div>
            ),
          },

          className: "source-node",
        },

        // --------------------------------------------
        // EVIDENCE
        // --------------------------------------------

        {
          id: "evidence",

          position: {
            x: 50,
            y: 60,
          },

          data: {
            label: (
              <div>
                <div className="node-title">EVIDENCE</div>

                <div className="node-main-text">
                  {evidence?.type || "Evidence"}
                </div>

                <strong className="node-value">{evidence?.value ?? "-"}</strong>
              </div>
            ),
          },

          className: "evidence-node",
        },

        // --------------------------------------------
        // FACTOR
        // --------------------------------------------

        {
          id: "factor",

          position: {
            x: 430,
            y: 40,
          },

          data: {
            label: (
              <div>
                <div className="node-title">INFLUENCING FACTOR</div>

                <div className="node-main-text">
                  {factor?.name || "Unknown Factor"}
                </div>

                <small className="node-small-text">
                  Weight: <strong>{factor?.weight ?? "-"}</strong>
                </small>
              </div>
            ),
          },

          className: "factor-node",
        },

        // --------------------------------------------
        // DECISION
        // --------------------------------------------

        {
          id: "decision",

          position: {
            x: 430,
            y: 250,
          },

          data: {
            label: (
              <div>
                <div className="node-title">DECISION</div>

                <div className="node-main-text">{selectedDecision.title}</div>
              </div>
            ),
          },

          className: "decision-node",
        },

        // --------------------------------------------
        // OUTCOME
        // --------------------------------------------

        {
          id: "outcome",

          position: {
            x: 800,
            y: 250,
          },

          data: {
            label: (
              <div>
                <div className="node-title">OUTCOME</div>

                <div className="node-main-text">{outcome?.status || "-"}</div>
              </div>
            ),
          },

          className: "outcome-node",
        },
      ]
    : [];

  // ==================================================
  // GRAPH EDGES
  // ==================================================

  const edges = selectedDecision
    ? [
        {
          id: "evidence-decision",

          source: "decision",
          target: "evidence",

          label: "HAS_EVIDENCE",

          animated: true,

          className: "edge",
        },

        {
          id: "evidence-source",

          source: "evidence",
          target: "source",

          label: "FROM_SOURCE",

          animated: true,

          className: "edge",
        },

        {
          id: "factor-decision",

          source: "decision",
          target: "factor",

          label: "INFLUENCED_BY",

          animated: true,

          className: "edge",
        },

        {
          id: "decision-outcome",

          source: "decision",
          target: "outcome",

          label: "RESULTED_IN",

          animated: true,

          className: "edge",
        },
      ]
    : [];

  // ==================================================
  // INITIAL UPLOAD SCREEN
  // ==================================================

  if (!selectedDecision) {
    return (
      <div className="app">
        {/* HEADER */}

        <header className="header">
          <div className="logo">DecisionTrace</div>

          <p className="subtitle">AI Decision Provenance & Evidence Explorer</p>
        </header>

        {/* UPLOAD PAGE */}

        <main className="upload-page">
          <section className="upload-card">
            <div className="upload-icon">↑</div>

            <h1 className="upload-title">Explore a Decision</h1>

            <p className="upload-description">
              Upload a JSON decision record to generate its provenance graph.
            </p>

            {/* HIDDEN INPUT */}

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden-input"
            />

            {/* UPLOAD BUTTON */}

            <button
              type="button"
              className="upload-button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? "Uploading..." : "Upload Decision JSON"}
            </button>

            <p className="supported-format">Supported format: JSON</p>

            {/* ERROR */}

            {uploadError && <div className="upload-error">{uploadError}</div>}
          </section>
        </main>

        {/* FOOTER */}

        <footer className="footer">
          DecisionTrace · Graph-powered decision provenance
        </footer>
      </div>
    );
  }

  // ==================================================
  // MAIN DECISION SCREEN
  // ==================================================

  return (
    <div className="app">
      {/* HEADER */}

      <header className="header">
        <div className="logo">DecisionTrace</div>

        <p className="subtitle">AI Decision Provenance & Evidence Explorer</p>
      </header>

      {/* UPLOAD ANOTHER */}

      <div className="upload-another-wrapper">
        <button
          type="button"
          className="upload-another-button"
          onClick={handleUploadAnother}
          disabled={uploading}
        >
          ↑ Upload Another Decision
        </button>
      </div>

      {/* DECISION SUMMARY */}

      <section className="summary-section">
        <h1 className="decision-title">{selectedDecision.title}</h1>

        <p className="description">{selectedDecision.description}</p>
      </section>

      {/* GRAPH */}

      <section className="graph-section">
        <div className="graph-container">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            fitViewOptions={{
              padding: 0.2,
            }}
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={true}
          >
            <Background color="#334155" gap={16} size={1} />

            <Controls />

            <MiniMap />
          </ReactFlow>
        </div>
      </section>

      {/* DECISION DETAILS */}

      <section className="details-section">
        <h2 className="details-title">Decision Details</h2>

        <div className="details-grid">
          {/* DECISION */}

          <div className="detail-card">
            <div className="detail-label">DECISION</div>

            <h3 className="detail-heading">{selectedDecision.title}</h3>

            <p className="detail-description">{selectedDecision.description}</p>

            <div className="detail-divider" />

            <div className="detail-row">
              <span>ID</span>

              <strong>{selectedDecision.id || "-"}</strong>
            </div>
          </div>

          {/* EVIDENCE */}

          <div className="detail-card">
            <div className="detail-label">EVIDENCE</div>

            <h3 className="detail-heading">{evidence?.type || "-"}</h3>

            <div className="detail-divider" />

            <div className="detail-row">
              <span>Value</span>

              <strong>{evidence?.value ?? "-"}</strong>
            </div>

            <div className="detail-row">
              <span>ID</span>

              <strong>{evidence?.id || "-"}</strong>
            </div>
          </div>

          {/* SOURCE */}

          <div className="detail-card">
            <div className="detail-label">SOURCE</div>

            <h3 className="detail-heading">{source?.name || "-"}</h3>

            <p className="detail-description">{source?.type || "-"}</p>

            <div className="detail-divider" />

            <div className="detail-row">
              <span>ID</span>

              <strong>{source?.id || "-"}</strong>
            </div>
          </div>

          {/* FACTOR */}

          <div className="detail-card">
            <div className="detail-label">INFLUENCING FACTOR</div>

            <h3 className="detail-heading">{factor?.name || "-"}</h3>

            <div className="detail-divider" />

            <div className="detail-row">
              <span>Weight</span>

              <strong>{factor?.weight ?? "-"}</strong>
            </div>

            <div className="detail-row">
              <span>ID</span>

              <strong>{factor?.id || "-"}</strong>
            </div>
          </div>

          {/* OUTCOME */}

          <div className="detail-card">
            <div className="detail-label">OUTCOME</div>

            <h3 className="detail-heading">{outcome?.status || "-"}</h3>

            <div className="detail-divider" />

            <div className="detail-row">
              <span>ID</span>

              <strong>{outcome?.id || "-"}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}

      <footer className="footer">
        DecisionTrace · Graph-powered decision provenance
      </footer>
    </div>
  );
}

export default App;
