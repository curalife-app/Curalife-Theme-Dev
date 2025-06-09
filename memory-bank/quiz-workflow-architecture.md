# Quiz Workflow Architecture

## Overview

The quiz system now implements a progressive workflow architecture that optimizes user experience by overlapping waiting time with user input. Instead of running all processing at the end, workflows are triggered at strategic points during the quiz flow.

## New Architecture Flow

### Step 1-2: User Input Collection

- **step-goals** (q1): Main visit reason selection
- **step-medical** (q2): Medical conditions selection

### Step 3: Insurance Information + Background Eligibility Check

- **step-insurance**: User enters insurance and personal details
- **When step-insurance is submitted:**
  - ✅ **Eligibility Workflow Triggered** in background
  - User continues to step 4 while eligibility check runs
  - Visual notification shows "🔍 Checking your insurance coverage in the background..."

### Step 4: Contact Information + User Creation

- **step-contact**: User enters email and phone
- **When step-contact is submitted:**
  - ✅ **User Creation Workflow Triggered** in background
  - Check eligibility workflow status:
    - If **complete**: Show results immediately
    - If **still running**: Show loading screen until complete

## Technical Implementation

### Frontend Changes (quiz.js)

#### New State Variables

```javascript
this.eligibilityWorkflowPromise = null;
this.eligibilityWorkflowResult = null;
this.eligibilityWorkflowError = null;
this.userCreationWorkflowPromise = null;
```

#### Workflow Triggers

- `_triggerEligibilityWorkflow()`: Called when step-insurance completes
- `_triggerUserCreationWorkflow()`: Called when step-contact completes
- Background notifications show progress to user

#### Separate Webhook Methods

- `_submitEligibilityToWebhook()`: Handles eligibility-specific requests
- `_submitUserCreationToWebhook()`: Handles user creation requests
- Both include `X-Workflow-Type` header for routing

### Backend Changes

#### Cloud Function Routing

The Cloud Function now routes requests based on workflow type:

```javascript
const workflowType = req.get("X-Workflow-Type") || req.body.workflowType;

switch (workflowType) {
	case "eligibility":
		workflowName = ELIGIBILITY_WORKFLOW_NAME;
		processedData = processEligibilityData(requestData);
		break;

	case "user_creation":
		workflowName = USER_CREATION_WORKFLOW_NAME;
		processedData = processUserCreationData(requestData);
		break;
}
```

#### Data Processing

- **Eligibility Data**: Only includes fields needed for insurance verification
- **User Creation Data**: Full user profile including quiz responses and preferences

### Shopify Section Configuration

#### New Settings

```json
{
    "id": "webhook_url",
    "label": "Eligibility Webhook URL",
    "info": "URL for eligibility workflow processing"
},
{
    "id": "user_creation_url",
    "label": "User Creation Webhook URL",
    "info": "URL for user creation workflow (can be same URL with different routing)"
}
```

## Benefits

### 1. **Improved Perceived Performance**

- Eligibility check runs while user fills contact form
- Reduces total waiting time from ~15-20 seconds to ~5-8 seconds

### 2. **Better User Experience**

- Visual feedback shows background processing
- Users stay engaged instead of staring at loading screens
- Immediate results when ready

### 3. **Parallel Processing**

- Eligibility and user creation can run simultaneously
- Non-blocking architecture prevents UI freezing

### 4. **Error Resilience**

- Independent workflow failures don't break entire flow
- Fallback handling for timeout scenarios

## Timing Analysis

### Before (Sequential)

```
Step 1 → Step 2 → Step 3 → Step 4 → [15-20s Loading] → Results
Total: ~25-30 seconds
```

### After (Parallel)

```
Step 1 → Step 2 → Step 3 → [Eligibility starts] → Step 4 → [User creation starts + Check eligibility] → Results
Background: [Eligibility: 0-15s] [User creation: 0-10s]
Total: ~10-15 seconds perceived time
```

## Error Handling

### Eligibility Workflow Errors

- Stored in `eligibilityWorkflowError`
- Displayed as normal error results
- User creation can still proceed

### User Creation Workflow Errors

- Logged but don't block UI
- Background process - user already sees eligibility results

### Timeout Scenarios

- Eligibility: 45 second timeout
- User creation: 30 second timeout
- Graceful degradation to error states

## Monitoring & Analytics

### Enhanced Tracking

```javascript
window.analytics.track("Quiz Completed", {
	quizId: this.quizData?.id,
	quizType: this.quizData?.type,
	successfullySubmitted: webhookSuccess,
	hadBackgroundEligibilityCheck: !!this.eligibilityWorkflowPromise
});
```

### Console Logging

- Workflow start/completion notifications
- Background process status updates
- Detailed error information for debugging

## Migration Notes

### Backward Compatibility

- Old webhook URLs still work (default to eligibility)
- No breaking changes to existing quiz configurations
- Graceful fallback for missing user creation URLs

### Required Updates

1. Update Cloud Function to handle routing
2. Configure separate workflow endpoints if needed
3. Update Shopify section settings for new URLs
4. Test with both workflow types
