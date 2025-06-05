# Quiz Testing Dashboard - Team Instructions

## 🚀 Quick Setup

The testing dashboard is now available as a Shopify section called **"Quiz Testing Dashboard"**.

### How to Add to Any Page:

1. **Go to Shopify Admin** → Online Store → Themes
2. **Edit any page** where you want the testing dashboard
3. **Add Section** → Find "Quiz Testing Dashboard"
4. **Save** the page

### Recommended Setup:

Create a dedicated testing page:

1. **Create new page**: Admin → Online Store → Pages → Add page
2. **Title**: "Quiz Testing Dashboard"
3. **Handle**: `quiz-testing-dashboard`
4. **Add the section** to this page
5. **Set visibility** to "Private" or "Password Protected" for team-only access

## 🎯 How to Use

### Dashboard Features:

- **✅ Successful Eligibility Tests**: 6 insurance scenarios that should return eligible results
- **⚠️ Not Covered Tests**: Scenarios that return "not covered" responses
- **❌ AAA Error Tests**: 6 error scenarios that trigger real insurance API errors

### Each Test Button Shows:

- **Test Name**: Human-readable description
- **Details**: What the test validates
- **Member ID**: The specific ID used for API calls (in monospace font)
- **Color Coding**: Green (success), yellow (warning), red (error)

### Testing Workflow:

1. **Click any test button** → Opens quiz with pre-filled data
2. **Complete the form** → All fields auto-populated with test data
3. **Submit** → Makes real API call to insurance system
4. **View results** → See live response from insurance API

## 🔬 What Each Test Does

### Successful Tests:

- **UnitedHealthcare Standard**: Tests basic UHC eligibility
- **Aetna Dependent**: Tests Aetna family member coverage
- **Anthem BCBS CA**: Tests Anthem California coverage
- **BCBS Texas**: Tests Blue Cross Blue Shield of Texas
- **Cigna Health**: Tests Cigna insurance eligibility
- **Oscar Health**: Tests Oscar Health plan coverage

### Error Tests:

- **Error 42**: System temporarily unavailable
- **Error 43**: Provider registration issues
- **Error 72**: Invalid member ID format
- **Error 73**: Name verification problems
- **Error 75**: Member not found in system
- **Error 79**: Payer connection issues

## 🛠️ Dashboard Settings

You can customize the dashboard in Shopify theme editor:

- **Base Quiz URL**: Change the target quiz page URL
- **Show Member IDs**: Toggle visibility of member ID codes
- **Dashboard Description**: Customize the subtitle text

## 📊 Monitoring & Debugging

### Real API Calls:

- All tests make **live API calls** to insurance systems
- Results reflect actual insurance system responses
- API response times typically 2-8 seconds

### Check Logs:

1. **GCP Console**: Monitor Cloud Function and Workflow logs
2. **Browser Dev Tools**: Check Network tab for API requests
3. **Quiz Console**: Watch for JavaScript errors
4. **Stedi Dashboard**: Monitor API usage and rate limits

### Visual Indicators:

- **🔬 REAL API - [SCENARIO]**: Shows for 5 seconds when test mode active
- **Color-coded responses**: Green (eligible), Yellow (not covered), Red (errors)

## ⚠️ Important Notes

### For Team Members:

- **Real APIs**: These make actual calls to insurance systems
- **Rate Limits**: Don't spam-test to avoid hitting API limits
- **Test Data**: All member IDs are real test accounts
- **Response Times**: May vary based on insurance system load

### Before Testing:

- ✅ Verify GCP workflows are deployed
- ✅ Check webhook URL is configured in theme settings
- ✅ Confirm Stedi API key is valid
- ✅ Ensure internet connection is stable

## 🎨 Dashboard Design

The dashboard features:

- **Clean, modern design** matching Curalife brand colors
- **Responsive layout** that works on all devices
- **Hover effects** for better interactivity
- **Clear categorization** with icons and color coding
- **Monospace member IDs** for easy reading
- **Professional styling** suitable for team use

## 🔧 Troubleshooting

### Common Issues:

**Dashboard Not Showing:**

- Check if section was added to page correctly
- Verify theme is published and up-to-date

**Test Buttons Not Working:**

- Verify quiz URL is correct in dashboard settings
- Check if quiz page exists and is accessible

**API Errors:**

- Check GCP Console logs for detailed error messages
- Verify webhook URL is configured correctly
- Confirm Stedi API key is valid and not expired

**Slow Response Times:**

- Normal for real API calls (2-8 seconds)
- Check internet connection if consistently slow
- Monitor insurance system status

### Need Help?

- Check `QUIZ_TEST_SCENARIOS.md` for detailed technical documentation
- Review GCP logs for API call details
- Contact dev team for configuration issues

---

**Ready to test?** Add the dashboard section to a page and start validating all quiz scenarios with real insurance API responses! 🚀
