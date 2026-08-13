const express = require("express");
const multer = require("multer");
const driver = require("../db/neo4j");
const { uploadDecision, getDecisionPath } = require("../controllers/decisionController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("file"), uploadDecision);

router.get("/:decisionId/path", async (req, res) => {
  try {
    const records = await getDecisionPath(req.params.decisionId);
    const data = records.map((record) => ({
      decision: record.get("d")?.properties || null,
      evidence: record.get("e")?.properties || null,
      source: record.get("s")?.properties || null,
      factor: record.get("f")?.properties || null,
      outcome: record.get("o")?.properties || null,
    }));
    return res.json({ success: true, data });
  } catch (error) {
    console.error("Decision path error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch decision path." });
  }
});

router.get("/graph", async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run("MATCH (d:Decision)-[r]->(n) RETURN d, type(r) AS relationship, n");
    return res.json({
      success: true,
      data: result.records.map((record) => ({
        decision: record.get("d").properties,
        relationship: record.get("relationship"),
        node: record.get("n").properties,
      })),
    });
  } catch (error) {
    console.error("Graph query error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch decision graph." });
  } finally {
    await session.close();
  }
});

module.exports = router;
