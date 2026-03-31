const fs = require('fs');
const path = require('path');

const results = {
  timestamp: new Date().toISOString(),
  deploymentType: process.env.DEPLOYMENT_TYPE || 'with-cicd',
  metrics: {
    deploymentTime: process.env.DEPLOYMENT_TIME,
    testPassRate: process.env.TEST_PASS_RATE,
    testDuration: process.env.TEST_DURATION,
    bugsFound: process.env.BUGS_FOUND || 0,
    deploymentStatus: process.env.DEPLOYMENT_STATUS
  }
};

// Save metrics
const metricsDir = path.join(__dirname, '../metrics');
if (!fs.existsSync(metricsDir)) {
  fs.mkdirSync(metricsDir);
}

const filename = `metrics-${results.deploymentType}-${Date.now()}.json`;
fs.writeFileSync(
  path.join(metricsDir, filename),
  JSON.stringify(results, null, 2)
);

console.log(`✅ Metrics saved: ${filename}`);
