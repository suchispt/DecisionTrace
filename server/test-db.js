require("dotenv").config();

const driver = require("./src/db/neo4j");

async function testConnection() {
  const session = driver.session();

  try {
    const result = await session.run("RETURN 'DecisionTrace connected!' AS message");
    console.log(result.records[0].get("message"));
  } catch (error) {
    console.error("Database connection failed:");
    console.error(error.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

testConnection();