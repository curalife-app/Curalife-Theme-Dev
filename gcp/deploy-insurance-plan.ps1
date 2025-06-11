# Deploy Insurance Plan Workflow
# This script deploys the insurance plan creation workflow to Google Cloud

$PROJECT_ID = "telemedicine-458913"
$REGION = "us-central1"

# Deploy the insurance plan workflow
Write-Host "Deploying insurance plan workflow..." -ForegroundColor Cyan
gcloud workflows deploy insurance-plan-workflow `
  --source=workflows/insurance-plan-workflow.yaml `
  --location=$REGION `
  --project=$PROJECT_ID

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Insurance plan workflow deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to deploy insurance plan workflow" -ForegroundColor Red
    exit 1
}

# Output the workflow details
Write-Host "`nWorkflow Details:" -ForegroundColor Yellow
Write-Host "- Name: insurance-plan-workflow" -ForegroundColor White
Write-Host "- Location: $REGION" -ForegroundColor White
Write-Host "- Project: $PROJECT_ID" -ForegroundColor White
Write-Host "`nThe workflow can be called by the user creation workflow to create insurance plan objects in HubSpot." -ForegroundColor Cyan