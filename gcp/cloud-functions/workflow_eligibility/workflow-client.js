const {ExecutionsClient} = require('@google-cloud/workflows');

// Initialize client that will be used to create and send requests.
const workflowsClient = new ExecutionsClient();

module.exports = { workflowsClient };
