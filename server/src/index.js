require("dotenv").config();

const express = require("express");
const cors = require("cors");

const decisionRoutes =
  require("./routes/decisionRoutes");

const app = express();

app.use(cors());

app.use(express.json());

app.use("/api/decisions", decisionRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message:
      "DecisionTrace API is running",
  });
});

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `DecisionTrace API running on http://localhost:${PORT}`
  );
});