# Deploy User Creation Workflow
# This script deploys the user creation workflow to Google Cloud

$PROJECT_ID = "telemedicine-458913"
$REGION = "us-central1"

# Deploy the user creation workflow
Write-Host "Deploying user creation workflow..." -ForegroundColor Cyan
gcloud workflows deploy user-creation-workflow `
  --source=workflows/user-creation-workflow.yaml `
  --location=$REGION `
  --project=$PROJECT_ID

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ User creation workflow deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to deploy user creation workflow" -ForegroundColor Red
    exit 1
}

# Output the workflow details
Write-Host "`nWorkflow Details:" -ForegroundColor Yellow
Write-Host "- Name: user-creation-workflow" -ForegroundColor White
Write-Host "- Location: $REGION" -ForegroundColor White
Write-Host "- Project: $PROJECT_ID" -ForegroundColor White
Write-Host "`nThe workflow integrates with the insurance plan workflow to create complete customer records." -ForegroundColor Cyan
