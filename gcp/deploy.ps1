# Set the project ID
$PROJECT_ID = "telemedicine-458913"
$REGION = "us-central1"

# Deploy the eligibility workflow
Write-Host "Deploying eligibility workflow..." -ForegroundColor Cyan
gcloud workflows deploy eligibility-workflow `
  --source=workflows/gcloud-workflows/eligibility-workflow.yaml `
  --location=$REGION `
  --project=$PROJECT_ID

# Deploy the user creation workflow
Write-Host "Deploying user creation workflow..." -ForegroundColor Cyan
gcloud workflows deploy user-creation-workflow `
  --source=workflows/gcloud-workflows/user-creation-workflow.yaml `
  --location=$REGION `
  --project=$PROJECT_ID

# Deploy the main telemedicine workflow
Write-Host "Deploying main telemedicine workflow..." -ForegroundColor Cyan
gcloud workflows deploy telemedicine-workflow `
  --source=workflows/gcloud-workflows/telemedicine-workflow.yaml `
  --location=$REGION `
  --project=$PROJECT_ID

# Create Cloud Functions to call the workflows
Write-Host "Creating Cloud Functions to call the workflows..." -ForegroundColor Cyan

# Create a temporary directory for the Cloud Function code
mkdir -p cloud-functions/workflow_eligibility
mkdir -p cloud-functions/workflow_user_creation

# Create the Cloud Function code for eligibility workflow
@"
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
    const workflowId = 'eligibility-workflow';

    console.log('Executing eligibility workflow');
    const execution = await workflowsClient.executeWorkflow({
      name: `projects/\${projectId}/locations/\${location}/workflows/\${workflowId}`,
      argument: JSON.stringify(req.body || {}),
    });

    console.log('Execution finished');
    console.log(execution);

    res.status(200).send(execution.result || {});
  } catch (error) {
    console.error('Error executing workflow:', error);
    res.status(500).send({
      success: false,
      error: 'Failed to execute eligibility workflow',
      details: error.message
    });
  }
};
"@ | Out-File -FilePath "cloud-functions/workflow_eligibility/index.js" -Encoding utf8

# Create the Cloud Function code for user creation workflow
@"
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
    const workflowId = 'user-creation-workflow';

    console.log('Executing user creation workflow');
    const execution = await workflowsClient.executeWorkflow({
      name: `projects/\${projectId}/locations/\${location}/workflows/\${workflowId}`,
      argument: JSON.stringify(req.body || {}),
    });

    console.log('Execution finished');
    console.log(execution);

    res.status(200).send(execution.result || {});
  } catch (error) {
    console.error('Error executing workflow:', error);
    res.status(500).send({
      success: false,
      error: 'Failed to execute user creation workflow',
      details: error.message
    });
  }
};
"@ | Out-File -FilePath "cloud-functions/workflow_user_creation/index.js" -Encoding utf8

# Create the shared workflow client module
@"
const {ExecutionsClient} = require('@google-cloud/workflows');

// Initialize client that will be used to create and send requests.
const workflowsClient = new ExecutionsClient();

module.exports = { workflowsClient };
"@ | Out-File -FilePath "cloud-functions/workflow_eligibility/workflow-client.js" -Encoding utf8
Copy-Item "cloud-functions/workflow_eligibility/workflow-client.js" "cloud-functions/workflow_user_creation/workflow-client.js"

# Create package.json files for the Cloud Functions
@"
{
  "name": "workflow-eligibility-function",
  "version": "1.0.0",
  "description": "Cloud Function to call the eligibility workflow",
  "main": "index.js",
  "dependencies": {
    "@google-cloud/workflows": "^2.0.0"
  }
}
"@ | Out-File -FilePath "cloud-functions/workflow_eligibility/package.json" -Encoding utf8

@"
{
  "name": "workflow-user-creation-function",
  "version": "1.0.0",
  "description": "Cloud Function to call the user creation workflow",
  "main": "index.js",
  "dependencies": {
    "@google-cloud/workflows": "^2.0.0"
  }
}
"@ | Out-File -FilePath "cloud-functions/workflow_user_creation/package.json" -Encoding utf8

# Deploy the Cloud Functions
Write-Host "Deploying eligibility workflow Cloud Function..." -ForegroundColor Cyan
gcloud functions deploy workflow_eligibility `
  --runtime=nodejs20 `
  --trigger-http `
  --allow-unauthenticated `
  --entry-point=handler `
  --source=cloud-functions/workflow_eligibility `
  --region=$REGION `
  --project=$PROJECT_ID

Write-Host "Deploying user creation workflow Cloud Function..." -ForegroundColor Cyan
gcloud functions deploy workflow_user_creation `
  --runtime=nodejs20 `
  --trigger-http `
  --allow-unauthenticated `
  --entry-point=handler `
  --source=cloud-functions/workflow_user_creation `
  --region=$REGION `
  --project=$PROJECT_ID

Write-Host "Deployment completed!" -ForegroundColor Green
Write-Host "New endpoints:"
Write-Host "- Eligibility: https://$REGION-$PROJECT_ID.cloudfunctions.net/workflow_eligibility" -ForegroundColor Yellow
Write-Host "- User Creation: https://$REGION-$PROJECT_ID.cloudfunctions.net/workflow_user_creation" -ForegroundColor Yellow
Write-Host "- Main Workflow: https://$REGION-$PROJECT_ID.cloudfunctions.net/telemedicine-workflow" -ForegroundColor Yellow