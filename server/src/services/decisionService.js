async function getDecisionPath(decisionId) {
  const session = driver.session();

  try {
    const query = `
      MATCH (d:Decision {
        id: $decisionId
      })

      OPTIONAL MATCH (d)-[:HAS_EVIDENCE]->(e:Evidence)

      OPTIONAL MATCH (e)-[:FROM_SOURCE]->(s:Source)

      OPTIONAL MATCH (d)-[:INFLUENCED_BY]->(f:Factor)

      OPTIONAL MATCH (d)-[:RESULTED_IN]->(o:Outcome)

      RETURN
        d,
        e,
        s,
        f,
        o
    `;

    const result = await session.run(
      query,
      { decisionId }
    );

    return result.records;

  } finally {
    await session.close();
  }
}

module.exports = {
  createDecisionFromUpload,
  getDecisionPath
};