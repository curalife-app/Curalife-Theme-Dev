# Workflow Orchestrator v2

This Cloud Function replaces the previous Google Cloud Workflow orchestrator with a more maintainable JavaScript/Node.js implementation.

## Features

- **Two Workflow Paths:**

  - Full workflow (with insurance): eligibility check → user creation → insurance plan
  - Simple workflow (without insurance): user creation only

- **Status Tracking:** Real-time status updates stored in Google Cloud Storage
- **Error Handling:** Comprehensive error handling with detailed logging
- **HIPAA Compliance:** Maintains compliance through Google's BAA coverage
- **Timeout Handling:** Configurable timeouts for all external service calls

## Deployment

```bash
# Quick deployment
./deploy.sh

# Manual deployment
gcloud functions deploy workflowOrchestratorV2 \
    --gen2 \
    --runtime=nodejs20 \
    --region=us-central1 \
    --source=. \
    --entry-point=workflowOrchestratorV2 \
    --trigger-http \
    --allow-unauthenticated \
    --timeout=300s \
    --memory=1024MB
```

## API Endpoint

```
POST https://us-central1-telemedicine-458913.cloudfunctions.net/workflowOrchestratorV2
```

## Request Format

### Full Workflow (with insurance)

```json
{
	"customerEmail": "user@example.com",
	"firstName": "John",
	"lastName": "Doe",
	"phoneNumber": "555-123-4567",
	"state": "CA",
	"insurance": "Blue Cross Blue Shield",
	"insuranceMemberId": "123456789",
	"groupNumber": "GRP001",
	"dateOfBirth": "1985-06-15",
	"consent": true,
	"testMode": false,
	"mainReasons": ["Diabetes Management"],
	"medicalConditions": ["Type 2 Diabetes"]
}
```

### Simple Workflow (no insurance)

```json
{
	"customerEmail": "user@example.com",
	"firstName": "John",
	"lastName": "Doe",
	"consent": true,
	"testMode": false
}
```

## Response Format

### Success Response

```json
{
	"success": true,
	"statusTrackingId": "1749939069342832",
	"message": "Account creation completed successfully",
	"data": {
		"userCreation": {
			/* user creation result */
		},
		"eligibility": {
			/* eligibility check result (if applicable) */
		},
		"insurancePlan": {
			/* insurance plan result (if applicable) */
		}
	}
}
```

### Error Response

```json
{
	"success": false,
	"statusTrackingId": "1749939069342832",
	"error": "Error message"
}
```

## Service Dependencies

1. **Eligibility Checker**: `eligibility-checker-service`
2. **User Creation**: `workflow_user_creation`
3. **Insurance Plan**: `workflow_insurance_plan`
4. **Status Storage**: Google Cloud Storage bucket `curalife-workflow-status`

## Advantages over Workflow Orchestrator

1. **Easier Debugging**: Standard JavaScript with console logs
2. **Better Error Handling**: Try/catch blocks with detailed error messages
3. **Simpler Maintenance**: No YAML syntax or workflow-specific constructs
4. **IDE Support**: Full IntelliSense and debugging capabilities
5. **Version Control**: Better diff visibility for code changes
6. **Testing**: Easier to unit test individual functions

## Migration Notes

- The quiz.js file has been updated to use the new endpoint
- Status tracking format remains compatible
- All existing functionality is preserved
- The old workflow orchestrator can be deprecated once testing is complete
