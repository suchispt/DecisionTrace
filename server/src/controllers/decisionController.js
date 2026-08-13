const { randomUUID } = require("crypto");
const driver = require("../db/neo4j");

function getApplicantValues(data) {
  const creditScore = Number(data.creditScore);
  const monthlyIncome = Number(data.loan?.monthlyIncome);
  const employmentYears = Number(data.applicant?.employmentYears);
  const loanAmount = Number(data.loan?.amount ?? 0);

  if (
    !Number.isFinite(creditScore) ||
    !Number.isFinite(monthlyIncome) ||
    !Number.isFinite(employmentYears) ||
    !Number.isFinite(loanAmount) ||
    loanAmount < 0
  ) {
    throw new Error(
      "Uploaded document must contain numeric creditScore, loan.monthlyIncome, applicant.employmentYears, and loan.amount."
    );
  }

  return {
    creditScore,
    monthlyIncome,
    employmentYears,
    loanAmount
  };
}

function evaluateApplicant(values) {
  const failedRequirements = [];

  if (values.creditScore < 650) {
    failedRequirements.push("credit score is below 650");
  }

  if (values.monthlyIncome < 30000) {
    failedRequirements.push("monthly income is below 30000");
  }

  if (values.employmentYears < 2) {
    failedRequirements.push("employment history is below 2 years");
  }

  const status =
    failedRequirements.length === 0
      ? "APPROVED"
      : "REJECTED";

  const reasoning =
    status === "APPROVED"
      ? "Approved because the applicant meets the credit score, monthly income, and employment history requirements."
      : `Rejected because ${failedRequirements.join(", ")}.`;

  return {
    status,
    reasoning
  };
}

async function createDecisionFromUpload(data, fileName) {
  const values = getApplicantValues(data);
  const evaluation = evaluateApplicant(values);

  const session = driver.session();
  const idSuffix = randomUUID();

  const parameters = {
    decisionId: `DEC-${idSuffix}`,
    evidenceId: `EVD-${idSuffix}`,
    sourceId: `SRC-${idSuffix}`,
    factorId: `FAC-${idSuffix}`,
    outcomeId: `OUT-${idSuffix}`,

    title: `Loan Application ${evaluation.status}`,

    reasoning: evaluation.reasoning,

    createdAt: new Date().toISOString(),

    evidenceValue:
      `Credit Score: ${values.creditScore}, ` +
      `Monthly Income: ${values.monthlyIncome}, ` +
      `Employment Years: ${values.employmentYears}, ` +
      `Loan Amount: ${values.loanAmount}`,

    fileName,

    factorWeight:
      evaluation.status === "APPROVED"
        ? 0.85
        : 0.35,

    ...values,

    status: evaluation.status
  };

  try {
    const result = await session.run(
      `
        CREATE (d:Decision {
          id: $decisionId,
          title: $title,
          description: $reasoning,
          reasoning: $reasoning,
          createdAt: $createdAt
        })

        CREATE (e:Evidence {
          id: $evidenceId,
          type: "Applicant Eligibility Evidence",
          value: $evidenceValue,
          creditScore: $creditScore,
          monthlyIncome: $monthlyIncome,
          employmentYears: $employmentYears,
          loanAmount: $loanAmount
        })

        CREATE (s:Source {
          id: $sourceId,
          name: $fileName,
          type: "Uploaded Applicant JSON"
        })

        CREATE (f:Factor {
          id: $factorId,
          name: "Loan Eligibility",
          weight: $factorWeight,
          reasoning: $reasoning
        })

        CREATE (o:Outcome {
          id: $outcomeId,
          status: $status,
          reasoning: $reasoning
        })

        CREATE (d)-[:HAS_EVIDENCE]->(e)

        CREATE (e)-[:FROM_SOURCE]->(s)

        CREATE (d)-[:INFLUENCED_BY]->(f)

        CREATE (d)-[:RESULTED_IN]->(o)

        RETURN
          d,
          collect(e) AS evidence,
          s,
          f,
          o
      `,
      parameters
    );

    return result.records[0];

  } finally {
    await session.close();
  }
}

async function uploadDecision(req, res) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "Please upload an applicant JSON file."
    });
  }

  let applicant;

  try {
    applicant = JSON.parse(
      req.file.buffer.toString("utf-8")
    );
  } catch {
    return res.status(400).json({
      success: false,
      error: "Invalid JSON file."
    });
  }

  try {
    const record = await createDecisionFromUpload(
      applicant,
      req.file.originalname
    );

    const decision =
      record.get("d").properties;

    return res.status(201).json({
      success: true,

      message:
        "Applicant successfully evaluated.",

      decision,

      reasoning:
        decision.reasoning,

      evidence:
        record
          .get("evidence")
          .map((node) => node.properties),

      source:
        record.get("s").properties,

      factor:
        record.get("f").properties,

      outcome:
        record.get("o").properties
    });

  } catch (error) {
    console.error(
      "Upload decision error:",
      error
    );

    return res.status(400).json({
      success: false,
      error:
        error.message ||
        "Failed to process applicant decision."
    });
  }
}

async function getDecisionPath(decisionId) {
  const session = driver.session();

  try {
    const result = await session.run(
      `
        MATCH (d:Decision {
          id: $decisionId
        })

        OPTIONAL MATCH
          (d)-[:HAS_EVIDENCE]->(e:Evidence)
          -[:FROM_SOURCE]->(s:Source)

        OPTIONAL MATCH
          (d)-[:INFLUENCED_BY]->(f:Factor)

        OPTIONAL MATCH
          (d)-[:RESULTED_IN]->(o:Outcome)

        RETURN
          d,
          e,
          s,
          f,
          o
      `,
      {
        decisionId
      }
    );

    return result.records;

  } finally {
    await session.close();
  }
}

module.exports = {
  createDecisionFromUpload,
  uploadDecision,
  getDecisionPath
};