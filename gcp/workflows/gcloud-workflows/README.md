# Telemedicine Workflow System

This directory contains Google Cloud Workflows for handling telemedicine data from patient intake quizzes and managing the integration between Shopify and HubSpot.

## Architecture Overview

The system consists of three separate workflows that work together:

1. **Main Telemedicine Workflow** (`telemedicine-workflow.yaml`):

   - Entry point that receives quiz data from frontend
   - Orchestrates the overall process
   - Calls the eligibility workflow, then the user creation workflow
   - Returns consolidated results to client

2. **Eligibility Workflow** (`eligibility-workflow.yaml`):

   - Focused solely on checking insurance eligibility
   - Calls the Stedi API to verify insurance details
   - Processes eligibility response to extract relevant details
   - Returns eligibility data to the main workflow

3. **User Creation Workflow** (`user-creation-workflow.yaml`):
   - Creates the user in both Shopify and HubSpot
   - Receives eligibility data from the main workflow
   - Creates linked insurance and consultation records in HubSpot
   - Returns consolidated user creation results

## Workflow Data Flow

```
┌─────────────────┐
│   Quiz Frontend │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Main Telemedicine│     │   Eligibility   │
│     Workflow     │────▶│    Workflow     │
└────────┬─────────┘     └─────────┬───────┘
         │                         │
         │                         │
         │                         │
         │                         │
         │                         ▼
┌────────▼─────────┐     ┌─────────────────┐
│   User Creation   │◀────│  Stedi Insurance│
│     Workflow      │     │      API        │
└────────┬──────────┘     └─────────────────┘
         │
         │
┌────────▼─────────┐     ┌─────────────────┐
│     Shopify      │     │     HubSpot      │
│     Customer     │     │     Contact      │
└──────────────────┘     └─────────────────┘
```

## Deployment

To deploy all three workflows and the necessary Cloud Functions that link them, execute the PowerShell deployment script:

```powershell
./deploy.ps1
```

This will:

1. Deploy all three workflows to Google Cloud Workflows
2. Create Cloud Function HTTP endpoints for each workflow
3. Set up the necessary IAM permissions

### Manual Deployment

If you prefer to deploy each component manually:

1. Deploy the workflows:

```bash
gcloud workflows deploy eligibility-workflow \
  --source=workflows/gcloud-workflows/eligibility-workflow.yaml \
  --location=us-central1

gcloud workflows deploy user-creation-workflow \
  --source=workflows/gcloud-workflows/user-creation-workflow.yaml \
  --location=us-central1

gcloud workflows deploy telemedicine-workflow \
  --source=workflows/gcloud-workflows/telemedicine-workflow.yaml \
  --location=us-central1
```

2. Create Cloud Functions to expose HTTP endpoints (see the `deploy.ps1` script for details)

## Environment Variables

These workflows require the following environment variables to be set in Google Cloud:

- `SHOPIFY_STORE_NAME`: The Shopify store name (default: "curalife-commerce")
- `SHOPIFY_ADMIN_TOKEN`: Shopify Admin API access token
- `HUBSPOT_ACCESS_TOKEN`: HubSpot API access token
- `STEDI_API_KEY`: API key for Stedi insurance verification API

## Configuration

The main configuration is set in the respective YAML files:

- Each workflow has a section at the top with configuration values
- Environment variables override defaults with `sys.get_env()` calls

## Testing

To test the entire flow:

1. Submit a quiz from the frontend
2. Check the logs in Google Cloud Console

To test individual workflows:

1. Use the Google Cloud Console Workflows UI to execute each workflow with test data
2. Or make direct HTTP requests to each Cloud Function endpoint

## Error Handling

Each workflow includes comprehensive error handling:

- Validation of required fields
- Proper HTTP response codes
- Detailed error messages in response payloads
- Error handlers for each external API call
