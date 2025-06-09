# Quiz Workflow Testing Guide

## Overview

Testing guide for the new progressive quiz workflow architecture that triggers eligibility and user creation workflows at different stages.

## Test Scenarios

### 1. Normal Flow Test

**Objective**: Verify the complete workflow functions correctly

**Steps**:

1. Start quiz and complete steps 1-2
2. Fill insurance information (step 3) and submit
3. **Verify**: Background notification appears: "🔍 Checking your insurance coverage in the background..."
4. Fill contact information (step 4) and submit
5. **Expected**: Either immediate results or brief loading if eligibility still running

**Console Logs to Watch For**:

```
🔍 Starting eligibility check in background...
✅ Eligibility check completed in background
👤 Starting user creation in background...
✅ User creation completed in background
```

### 2. Fast Eligibility Test

**Objective**: Test when eligibility completes before user reaches step 4

**Steps**:

1. Complete steps 1-3 quickly
2. Wait 3-5 seconds on step 4 before submitting
3. Submit step 4
4. **Expected**: Immediate results display (no loading screen)

### 3. Slow Eligibility Test

**Objective**: Test when eligibility is still running when user completes step 4

**Steps**:

1. Complete steps 1-3
2. Immediately submit step 4 (don't wait)
3. **Expected**: Loading screen with message "Finalizing your insurance eligibility check..."
4. Results appear when eligibility completes

### 4. Error Handling Test

**Objective**: Test error scenarios

**Test Cases**:

- Invalid insurance data (should show error results)
- Network timeout (should show error message)
- Missing webhook URLs (should gracefully degrade)

### 5. Backward Compatibility Test

**Objective**: Ensure old configurations still work

**Steps**:

1. Use quiz section with only `webhook_url` (no `user_creation_url`)
2. Complete entire quiz
3. **Expected**: Works as before, defaults to eligibility workflow

## Configuration Testing

### Required Settings

```liquid
<!-- In quiz section -->
data-webhook-url="https://your-function-url" data-user-creation-url="https://your-function-url"
<!-- OR leave user-creation-url empty for single endpoint -->
```

### Environment Variables (Cloud Function)

```bash
ELIGIBILITY_WORKFLOW_NAME=eligibility-workflow
USER_CREATION_WORKFLOW_NAME=user-creation-workflow
GCP_PROJECT=your-project-id
WORKFLOW_LOCATION=us-central1
```

## Monitoring

### Browser Console

- Enable console logging to see workflow triggers
- Watch for background process notifications
- Monitor timing between triggers and completions

### Network Tab

- Verify separate requests are made to eligibility and user creation endpoints
- Check `X-Workflow-Type` headers are included
- Monitor request timing

### Analytics

- Check that `hadBackgroundEligibilityCheck` is tracked
- Verify completion rates with new architecture

## Performance Validation

### Timing Measurements

1. **Old Architecture**: Time from step 4 submit to results display
2. **New Architecture**: Time from step 4 submit to results display
3. **Expected Improvement**: 50-70% reduction in perceived wait time

### User Experience

- No blocking UI during background processes
- Clear feedback about what's happening
- Smooth transitions between steps

## Troubleshooting

### Common Issues

#### Eligibility Not Triggering

- Check `data-webhook-url` is set
- Verify step-insurance has `id="step-insurance"`
- Ensure form validation passes

#### User Creation Not Triggering

- Check `data-user-creation-url` or fallback URL logic
- Verify step-contact has `id="step-contact"`
- Check browser console for errors

#### Results Not Showing

- Verify eligibility workflow completes successfully
- Check for JavaScript errors in console
- Ensure Cloud Function returns proper response format

### Debug Mode

Add to URL: `?debug=true` to enable verbose console logging

### Test Data

Use existing test scenarios:

- `?test=true` - Default UHC test data
- `?test=not-covered` - Not covered scenario
- `?test=aetna_dependent` - Aetna test data

## Success Criteria

✅ **Eligibility workflow triggers when step 3 is completed**
✅ **User creation workflow triggers when step 4 is completed**
✅ **Background notifications appear and disappear appropriately**
✅ **Results display immediately if eligibility completes before step 4**
✅ **Loading screen shows if eligibility still running during step 4**
✅ **Error handling works for various failure scenarios**
✅ **Analytics tracking includes background workflow information**
✅ **No breaking changes to existing quiz configurations**

## Manual Testing Checklist

- [ ] Complete normal flow end-to-end
- [ ] Test fast user (eligibility completes first)
- [ ] Test slow eligibility (still running at step 4)
- [ ] Verify background notifications
- [ ] Check console logs for proper triggers
- [ ] Test error scenarios
- [ ] Validate analytics data
- [ ] Confirm backward compatibility
- [ ] Test on mobile devices
- [ ] Verify performance improvements
