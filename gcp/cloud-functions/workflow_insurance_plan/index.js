const {workflowsClient} = require('./workflow-client');

exports.handler = async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
    return;
  }

  try {
    const projectId = process.env.GCP_PROJECT || 'telemedicine-458913';
    const location = 'us-central1';
    const workflowId = 'insurance-plan-workflow';

    console.log('Executing insurance plan workflow');
    const execution = await workflowsClient.executeWorkflow({
      name: projects/\/locations/\/workflows/\,
      argument: JSON.stringify(req.body || {}),
    });

    console.log('Execution finished');
    console.log(execution);

    res.status(200).send(execution.result || {});
  } catch (error) {
    console.error('Error executing workflow:', error);
    res.status(500).send({
      success: false,
      error: 'Failed to execute insurance plan workflow',
      details: error.message
    });
  }
};
