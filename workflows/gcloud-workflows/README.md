# Curalife Telemedicine Workflow

This directory contains the Google Cloud Workflow definition for the Curalife Telemedicine Quiz integration.

## Prerequisites

Before deploying the workflow, make sure you have:

1. Google Cloud CLI installed
2. Enabled the Workflows API in your Google Cloud project
3. Set up all required environment variables
4. Created a service account with appropriate permissions

## Required Environment Variables

The workflow uses the following environment variables:

- `SHOPIFY_STORE_NAME` - Your Shopify store name
- `SHOPIFY_ADMIN_ACCESS_TOKEN` - Shopify Admin API access token
- `STEDI_API_KEY` - API key for Stedi integration
- `KLAVIYO_API_KEY` - API key for Klaviyo integration

## Deployment Instructions

### 1. Enable the Workflows API

Run the following command to enable the Workflows API:

```powershell
gcloud services enable workflows.googleapis.com
```

### 2. Create a Service Account (if not already created)

```powershell
gcloud iam service-accounts create telemedicine-workflow-sa --display-name="Telemedicine Workflow Service Account"
```

Grant necessary permissions to the service account:

```powershell
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:telemedicine-workflow-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" --role="roles/workflows.invoker"
```

### 3. Deploy the Workflow

```powershell
gcloud workflows deploy telemedicine-workflow --source=telemedicine-workflow.yaml --location=us-central1 --service-account=telemedicine-workflow-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

Replace `YOUR_PROJECT_ID` with your actual Google Cloud project ID.

### 4. Set Environment Variables

Set the required environment variables for the workflow:

```powershell
gcloud workflows update telemedicine-workflow --location=us-central1 --set-env-vars=SHOPIFY_STORE_NAME=your-store,SHOPIFY_ADMIN_ACCESS_TOKEN=your-token,KLAVIYO_API_KEY=your-klaviyo-key,STEDI_API_KEY=your-stedi-key
```

### 5. Execute the Workflow

To manually test the workflow:

```powershell
gcloud workflows run telemedicine-workflow --location=us-central1
```

To execute with arguments:

```powershell
gcloud workflows run telemedicine-workflow --location=us-central1 --data='{"quizId":"test-quiz","quizTitle":"Blood Glucose Quiz","responses":{"q1":"opt1","q7":"John","q8":"Doe","q9":"example@test.com"}}'
```

## Triggering the Workflow

To trigger this workflow via HTTP, you'll need to set up a Cloud Function or Cloud Run service that can invoke the workflow when receiving HTTP requests.

### Example: Creating a Cloud Function Trigger

1. Create a Cloud Function that invokes the workflow:

```powershell
# Create a directory for your function
mkdir workflow-trigger && cd workflow-trigger

# Create index.js file with the following content:
# (Use Edit feature in your IDE to create this file)
```

Example index.js code:

```javascript
const { workflowsClient } = require("@google-cloud/workflows");
const client = new workflowsClient();

exports.triggerWorkflow = async (req, res) => {
	const projectId = process.env.PROJECT_ID;
	const location = process.env.LOCATION || "us-central1";
	const workflowName = process.env.WORKFLOW_NAME || "telemedicine-workflow";

	try {
		const execResp = await client.executeWorkflow({
			name: `projects/${projectId}/locations/${location}/workflows/${workflowName}`,
			argument: JSON.stringify(req.body)
		});

		res.status(200).send({
			executionId: execResp.execution.name,
			status: "Workflow execution started"
		});
	} catch (err) {
		console.error("Error executing workflow:", err);
		res.status(500).send({ error: "Failed to execute workflow" });
	}
};
```

2. Deploy the Cloud Function:

```powershell
gcloud functions deploy trigger-telemedicine-workflow --runtime nodejs16 --trigger-http --entry-point triggerWorkflow --set-env-vars PROJECT_ID=YOUR_PROJECT_ID,WORKFLOW_NAME=telemedicine-workflow
```

## Monitoring

You can monitor workflow executions in the Google Cloud Console:

1. Go to the Workflows page in the Google Cloud Console
2. Select the `telemedicine-workflow`
3. View the Executions tab

## Troubleshooting

### Common Errors

#### KeyError: key not found: method or headers

If you see errors like `KeyError: key not found: method` or `KeyError: key not found: headers`, it means the workflow is trying to access a property of the request object that doesn't exist. These errors can happen when:

1. The workflow is executed directly without an HTTP request (e.g., via `gcloud workflows run`)
2. The HTTP request doesn't include the expected fields (method, headers, etc.)

The current version of the workflow has been modified to handle these cases by:

1. Using default values instead of trying to access potentially missing properties
2. Making all property access defensive with checks for property existence
3. Using simpler default values rather than complex conditional expressions

#### Error: subworkflow 'sys.type' not found

This error occurs when trying to use functions that don't exist in Google Workflows. Unlike some programming languages, Google Workflows has a limited set of built-in functions and doesn't include a direct type-checking function like `sys.type()`.

Instead, use the following approaches to check types:

1. Use the `is` operator: `${variable is map}`, `${variable is string}`, `${variable is number}`, etc.
2. Check for the existence of properties to determine if something is an object: `${"propertyName" in variable}`
3. Use conditional logic to handle different possible types safely

#### Error: mismatched input 'is' expecting ')'

This error occurs when trying to use the `is` operator within nested expressions. Although Google Workflows documentation mentions the `is` operator for type checking, it has specific syntax requirements and cannot be used freely in all contexts.

Instead of using constructs like:

```yaml
- myVar: ${if(var != null, if(var is string, json.decode(var), var), null)} # This will fail
```

Use simpler expressions:

```yaml
- myVar: ${if(var != null, json.decode(var), null)} # This will work
```

Or split the logic into multiple steps if more complex type checking is needed:

```yaml
- checkType:
    switch:
      - condition: ${var is string}
        next: handleString
      - condition: true
        next: handleOther
```

#### Parse error: mismatched input '{' expecting {'[', LOGICAL_NOT, '(', '-', TRUE, FALSE, NULL, NUM_FLOAT, NUM_INT, STRING, IDENTIFIER}

This error occurs when using JSON object literals (like `{}`) directly in workflow expressions. Unlike JavaScript, Google Workflows doesn't support empty object literals in expressions. Instead:

1. Use string values like `"emptyObject"` or `null` instead of `{}`
2. If you need to create an empty object, consider creating it in a separate assignment step

For example, instead of:

```yaml
- myVar: ${if(condition, value, {})} # This will fail
```

Use:

```yaml
- myVar: ${if(condition, value, "emptyObject")} # This will work
```

Then handle the "emptyObject" string value in your workflow logic.

### General Troubleshooting

If the workflow fails:

1. Check the execution details in the Google Cloud Console
2. Verify that all environment variables are set correctly
3. Ensure all required APIs are enabled
4. Check for permission issues related to service accounts

### Testing with Minimal Input

To verify the basic workflow functionality without a complete payload, run:

```powershell
gcloud workflows run telemedicine-workflow --location=us-central1 --data='{}'
```

This should execute without throwing errors.

### Using the Test Workflow

For easier debugging, we've created a simplified test workflow that provides diagnostic information about the input and environment:

1. Deploy the test workflow:

```powershell
gcloud workflows deploy telemedicine-workflow-test --source=workflows/gcloud-workflows/telemedicine-workflow-test.yaml --location=us-central1
```

2. Run the test workflow:

```powershell
gcloud workflows run telemedicine-workflow-test --location=us-central1
```

The test workflow will return diagnostic information about:

- The input request object
- Whether environment variables are set correctly

This helps isolate whether issues are coming from the workflow itself, the input data, or environment configuration.

### Expected Request Format

The workflow expects the data from the quiz in the following format:

```json
{
	"data": "{\"quizId\":\"curalife-intake\",\"quizTitle\":\"Find Your Perfect Dietitian\",\"completedAt\":\"2025-05-12T06:46:33.841Z\",\"customerEmail\":\"example@example.com\",\"firstName\":\"John\",\"lastName\":\"Doe\",\"phoneNumber\":\"+1234567890\",\"dateOfBirth\":\"2025-05-22\",\"state\":\"st6\",\"insurance\":\"ins3\",\"insuranceMemberId\":\"123\",\"mainReason\":\"opt1\",\"secondaryReasons\":[\"opt6\"],\"allResponses\":[...]}"
}
```

Note that:

1. The top-level object has a single property named `data`
2. The `data` property contains a JSON string (not a parsed object)
3. The workflow will parse this JSON string to extract the necessary information

### Testing with Sample Input

To test with the sample quiz response:

```powershell
gcloud workflows run telemedicine-workflow --location=us-central1 --data="@workflows/gcloud-workflows/request-example.json"
```

## Testing

To test the workflow locally, you can use the Workflows CLI:

```bash
# First, deploy your workflow
gcloud workflows deploy telemedicine-workflow \
  --location=us-central1 \
  --source=telemedicine-workflow.yaml

# Then execute it with test data
gcloud workflows execute telemedicine-workflow \
  --location=us-central1 \
  --data-source-file=test-payload.json
```

### Test File

The `test-payload.json` contains a sample request with all the required fields:

```json
{
	"data": "{\"quizId\":\"curalife-intake\",\"quizTitle\":\"Find Your Perfect Dietitian\",\"completedAt\":\"2025-05-12T06:46:33.841Z\",\"customerEmail\":\"test@example.com\",\"firstName\":\"Test\",\"lastName\":\"User\",\"phoneNumber\":\"+12345678901\",\"dateOfBirth\":\"2000-01-01\",\"state\":\"st6\",\"insurance\":\"ins3\",\"insuranceMemberId\":\"123\",\"mainReason\":\"opt1\",\"secondaryReasons\":[\"opt6\"]}"
}
```

### Troubleshooting

If you're still encountering issues, here are some common problems and their solutions:

1. **Missing field errors**: The workflow now handles both direct field access and access through the responses object. If you get a "key not found" error, ensure your request data contains all required fields.

2. **JSON parsing errors**: Make sure the `data` field contains properly escaped JSON.

3. **Environment variables**: Ensure all required environment variables are set:
   ```bash
   gcloud workflows run-with-server-config telemedicine-workflow \
     --location=us-central1 \
     --data-source-file=test-payload.json \
     --env-vars=SHOPIFY_STORE_NAME=your-store,SHOPIFY_ADMIN_ACCESS_TOKEN=your-token,KLAVIYO_API_KEY=your-key,STEDI_API_KEY=your-key
   ```
