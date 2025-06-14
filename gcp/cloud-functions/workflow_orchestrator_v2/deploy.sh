#!/bin/bash

# Deploy the workflow orchestrator v2 Cloud Function
echo "Deploying workflow orchestrator v2..."

gcloud functions deploy workflowOrchestratorV2 \
    --gen2 \
    --runtime=nodejs20 \
    --region=us-central1 \
    --source=. \
    --entry-point=workflowOrchestratorV2 \
    --trigger-http \
    --allow-unauthenticated \
    --timeout=300s \
    --memory=1024MB \
    --description="Modernized workflow orchestrator Cloud Function - replaces the old workflow orchestrator"

echo "Deployment complete!"
echo "Function URL: https://us-central1-telemedicine-458913.cloudfunctions.net/workflowOrchestratorV2"