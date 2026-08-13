# DecisionTrace

## Project Overview

DecisionTrace is a loan-application decision provenance explorer. A user uploads an applicant JSON file, the backend evaluates it, stores the decision and its supporting provenance in Neo4j, and the React frontend displays the resulting graph and record details.

## Problem Statement

A decision result alone does not show the evidence, source, factor, and outcome that led to it. DecisionTrace records these connected elements so an evaluated loan application can be inspected as a provenance graph.

## Solution / Workflow

1. The user uploads a JSON file in the React application.
2. The frontend sends it as multipart form data under the `file` field to `POST /api/decisions/upload`.
3. The Express backend validates numeric applicant values and evaluates the eligibility rules.
4. The backend creates `Decision`, `Evidence`, `Source`, `Factor`, and `Outcome` nodes plus their relationships in Neo4j.
5. The frontend requests the saved decision path and displays it with React Flow.

## Architecture

```text
React + Vite client
  |
  | POST upload / GET decision path
  v
Express API
  |
  | Neo4j JavaScript driver
  v
Remote Neo4j database
```

## Technology Stack

- Frontend: React 19, Vite, Axios, React Flow
- Backend: Node.js, Express 5, Multer, CORS, dotenv
- Database: Neo4j via the Neo4j JavaScript driver
- Module systems: ES modules in `client`; CommonJS in `server`

## Neo4j Graph Data Model

Each uploaded application creates the following nodes:

| Node | Current stored purpose and notable properties |
|---|---|
| `Decision` | The evaluated application. Includes `id`, `title`, `description`, `reasoning`, and `createdAt`. |
| `Evidence` | Applicant eligibility values. Includes `id`, `type`, `value`, `creditScore`, `monthlyIncome`, `employmentYears`, and `loanAmount`. |
| `Source` | The uploaded file. Includes `id`, `name`, and `type`. |
| `Factor` | The eligibility factor. Includes `id`, `name`, `weight`, and `reasoning`. |
| `Outcome` | The decision status. Includes `id`, `status`, and `reasoning`. |

Relationships are directed as follows:

```text
(Decision)-[:HAS_EVIDENCE]->(Evidence)-[:FROM_SOURCE]->(Source)
(Decision)-[:INFLUENCED_BY]->(Factor)
(Decision)-[:RESULTED_IN]->(Outcome)
```

| Relationship | Meaning |
|---|---|
| `HAS_EVIDENCE` | Connects a decision to the application evidence used to evaluate it. |
| `FROM_SOURCE` | Connects evidence to the uploaded applicant JSON source. |
| `INFLUENCED_BY` | Connects a decision to the `Loan Eligibility` factor. |
| `RESULTED_IN` | Connects a decision to its `APPROVED` or `REJECTED` outcome. |

## Decision Evaluation Rules

An application is `APPROVED` only when all of these requirements are met:

- `creditScore >= 650`
- `loan.monthlyIncome >= 30000`
- `applicant.employmentYears >= 2`

Otherwise, the application is `REJECTED`. The response reasoning identifies each failed requirement. `loan.amount` must be numeric and non-negative, but it does not alter the approval threshold evaluation.

## Expected Applicant JSON Format

```json
{
  "applicant": {
    "employmentYears": 5
  },
  "loan": {
    "amount": 500000,
    "monthlyIncome": 75000
  },
  "creditScore": 780
}
```

All four values must be numeric. The repository includes `server/sample-applicant.json` and `server/sample-rejected-applicant.json`.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Returns API health status. |
| `POST` | `/api/decisions/upload` | Accepts one JSON file in multipart field `file`, evaluates it, persists its graph, and returns the created records. |
| `GET` | `/api/decisions/:decisionId/path` | Returns the decision with its evidence, source, factor, and outcome path. |
| `GET` | `/api/decisions/graph` | Returns each outgoing relationship from every `Decision` node. |

## Neo4j Cypher / Graph Traversal

The decision-path endpoint uses optional graph matches to return the complete provenance record:

```cypher
MATCH (d:Decision {id: $decisionId})
OPTIONAL MATCH (d)-[:HAS_EVIDENCE]->(e:Evidence)-[:FROM_SOURCE]->(s:Source)
OPTIONAL MATCH (d)-[:INFLUENCED_BY]->(f:Factor)
OPTIONAL MATCH (d)-[:RESULTED_IN]->(o:Outcome)
RETURN d, e, s, f, o
```

The two-hop evidence provenance traversal is:

```cypher
MATCH (d:Decision)-[:HAS_EVIDENCE]->(e:Evidence)-[:FROM_SOURCE]->(s:Source)
RETURN d, e, s
```

## Why Neo4j Is Used

The data is naturally connected: a decision is supported by evidence, that evidence comes from a source, and the decision is influenced by a factor and produces an outcome. Neo4j stores these connections directly and allows the application to retrieve or visualize the provenance path with graph traversal queries.

## Project Folder Structure

```text
DecisionTrace/
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── controllers/decisionController.js
│   │   └── styles/App.css
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── controllers/decisionController.js
│   │   ├── db/neo4j.js
│   │   ├── routes/decisionRoutes.js
│   │   └── index.js
│   ├── sample-applicant.json
│   ├── sample-rejected-applicant.json
│   ├── seed.js
│   ├── test-db.js
│   └── package.json
└── README.md
```

## How to Run Backend

The backend requires a `server/.env` file with `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, and optionally `PORT`. Do not commit database credentials.

```powershell
cd server
npm install
node src/index.js
```

The API listens on the configured `PORT`, or port `5000` when it is absent. A connection check can be run with:

```powershell
node test-db.js
```

`seed.js` creates a graph record from `sample-applicant.json` when run directly:

```powershell
node seed.js
```

The backend `package.json` currently defines only `npm test`; it does not define `npm run lint` or `npm run build`.

## How to Run Frontend

```powershell
cd client
npm install
npm run dev
```

Other defined client scripts are `npm run build`, `npm run lint`, and `npm run preview`.

The current frontend API base URL is hard-coded as `http://localhost:5001/api/decisions`. To use the frontend with the backend, run the backend with its `PORT` configured as `5001`. The backend defaults to port `5000` when `PORT` is not configured.

## Example APPROVED Flow

Input values:

```json
{
  "applicant": { "employmentYears": 5 },
  "loan": { "amount": 500000, "monthlyIncome": 75000 },
  "creditScore": 780
}
```

All three approval requirements are met. The backend creates a decision titled `Loan Application APPROVED`, an `APPROVED` outcome, `Loan Eligibility` factor weight `0.85`, and the connected evidence and uploaded-file source nodes.

## Example REJECTED Flow

Input values:

```json
{
  "applicant": { "employmentYears": 1 },
  "loan": { "amount": 500000, "monthlyIncome": 25000 },
  "creditScore": 600
}
```

The credit score, monthly income, and employment history requirements fail. The backend creates a decision titled `Loan Application REJECTED`, a `REJECTED` outcome, `Loan Eligibility` factor weight `0.35`, and reasoning that lists the failed requirements.

## Validation / Testing Performed

- Server JavaScript syntax was checked for `src/controllers/decisionController.js`, `seed.js`, and `src/index.js`.
- The API was started and `GET /api/health` returned HTTP `200`.
- A multipart upload using `sample-applicant.json` returned HTTP `201` and created a decision path.
- The remote Neo4j database was queried to validate node labels, graph relationships, provenance traversal, and constraints.
- The backend has no defined lint or build scripts. The client defines lint and build scripts, but this README update does not claim they were run.

## Database Constraints

The following uniqueness constraints exist on the `id` property of their respective graph labels:

- `decision_id_unique`
- `evidence_id_unique`
- `source_id_unique`
- `factor_id_unique`
- `outcome_id_unique`

All five constraints were verified in the remote Neo4j database.
