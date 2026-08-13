require("dotenv").config();

const { createDecisionFromUpload } = require("./src/controllers/decisionController");
const applicant = require("./sample-applicant.json");

async function seed() {
  try {
    await createDecisionFromUpload(applicant, "sample-applicant.json");

    console.log("DecisionTrace seed data created successfully!");
  } catch (error) {
    console.error("Failed to seed database:");
    console.error(error.message);
  }
}

seed();
