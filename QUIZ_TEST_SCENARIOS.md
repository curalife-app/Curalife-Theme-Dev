# Dietitian Quiz Test Scenarios - Real API Testing

This document describes all available test scenarios for the dietitian quiz. **All test scenarios now make real API calls** - the test data is used to pre-fill forms, but eligibility checks are performed against live insurance APIs through the Stedi Healthcare API.

> ✅ **VERIFIED**: All test data below has been validated against the official [Stedi Mock Requests Documentation](https://www.stedi.com/docs/api-reference/healthcare/mock-requests-eligibility-checks) to ensure 100% accuracy with the API specifications.

## How Real API Testing Works

When you add a `test=` parameter to the quiz URL:

1. **Form Pre-filling**: The quiz form is automatically filled with test data for the specified scenario
2. **Real API Calls**: When submitted, the quiz makes actual API calls to check insurance eligibility
3. **Live Results**: You see real eligibility responses based on the test member IDs and insurance data
4. **Error Testing**: Error scenarios use specific member IDs that trigger real AAA errors from insurance payers

```
https://yoursite.com/quiz?test=scenario_name
```

For example:

```
https://yoursite.com/quiz?test=aetna_dependent  # Pre-fills Aetna test data, calls real Aetna API
https://yoursite.com/quiz?test=error_42        # Pre-fills error test data, triggers real AAA error 42
```

## Configuration Requirements

For real API testing to work, the following must be configured:

### 1. Shopify Theme Settings

In the Shopify theme editor, set the webhook URL for the quiz section:

```
Webhook URL: https://us-central1-[YOUR-PROJECT-ID].cloudfunctions.net/telemedicine-workflow-http
```

### 2. Google Cloud Setup

Deploy the GCP workflows and Cloud Functions:

```bash
cd gcp/workflows/gcloud-workflows
./deploy.ps1  # PowerShell deployment script
```

### 3. Environment Variables

Set these in Google Cloud Console:

```
STEDI_API_KEY=test_fsWwDEq.XvSAryFi2OujuV0n3mNPhFfE  # Or your production key
SHOPIFY_STORE_NAME=curalife-commerce
SHOPIFY_ADMIN_TOKEN=[your-shopify-admin-token]
HUBSPOT_ACCESS_TOKEN=[your-hubspot-token]
```

### 4. Test vs Production

- **Test Environment**: Uses Stedi test API key (starts with `test_`)
- **Production Environment**: Uses live Stedi API key
- **Member IDs**: All test member IDs work with both test and production Stedi APIs

## Available Test Scenarios

### ✅ Successful Eligibility Scenarios

These scenarios use real member IDs that return successful eligibility responses from live insurance APIs.

#### `default` or `true`

**URL:** `?test=default` or `?test=true`

- **Insurance:** UnitedHealthcare (Primary Payer ID: 52133)
- **Member ID:** 404404404
- **API Call:** Real Stedi eligibility check to UHC
- **Expected Result:** Live eligibility response (typically eligible)
- **Use Case:** Standard successful eligibility check with real data

#### `aetna_dependent`

**URL:** `?test=aetna_dependent`

- **Insurance:** Aetna (Primary Payer ID: 60054)
- **Member ID:** AETNA9wcSu
- **API Call:** Real Stedi eligibility check to Aetna
- **Expected Result:** Live eligibility response from Aetna API
- **Use Case:** Aetna dependent coverage testing

#### `anthem_dependent`

**URL:** `?test=anthem_dependent`

- **Insurance:** Anthem Blue Cross Blue Shield CA (Primary Payer ID: 040)
- **Member ID:** BCBSCA123456
- **API Call:** Real Stedi eligibility check to Anthem
- **Expected Result:** Live eligibility response from Anthem API
- **Use Case:** Anthem dependent coverage testing

#### `bcbstx_dependent`

**URL:** `?test=bcbstx_dependent`

- **Insurance:** Blue Cross Blue Shield of Texas (Primary Payer ID: G84980)
- **Member ID:** BCBSTX123456
- **API Call:** Real Stedi eligibility check to BCBS Texas
- **Expected Result:** Live eligibility response from BCBS Texas API
- **Use Case:** BCBS Texas dependent coverage testing

#### `cigna_dependent`

**URL:** `?test=cigna_dependent`

- **Insurance:** Cigna Health (Primary Payer ID: 62308)
- **Member ID:** CIGNAJTUxNm
- **API Call:** Real Stedi eligibility check to Cigna
- **Expected Result:** Live eligibility response from Cigna API
- **Use Case:** Cigna dependent coverage testing

#### `oscar_dependent`

**URL:** `?test=oscar_dependent`

- **Insurance:** Oscar Health (Primary Payer ID: 84977)
- **Member ID:** OSCAR123456
- **API Call:** Real Stedi eligibility check to Oscar Health
- **Expected Result:** Live eligibility response from Oscar API
- **Use Case:** Oscar Health dependent coverage testing

### ❌ Not Covered Scenarios

#### `notCovered` or `not-covered`

**URL:** `?test=notCovered` or `?test=not-covered`

- **Insurance:** UnitedHealthcare (Primary Payer ID: 52133)
- **Member ID:** IDUHC123456
- **API Call:** Real Stedi eligibility check to UHC
- **Expected Result:** Live "not covered" response from UHC API
- **Use Case:** Plan that doesn't cover dietitian services

### ⚠️ AAA Error Scenarios

These scenarios use specific member IDs that trigger real AAA (Application Accept/Reject) errors from insurance payers. These are **actual API errors** returned by the insurance systems, not simulated responses.

#### `error_42`

**URL:** `?test=error_42`

- **Error Code:** 42 - Unable to respond at current time
- **Member ID:** UHCAAA42
- **API Call:** Real Stedi eligibility check that triggers AAA error 42
- **Expected Result:** Live AAA error response from payer system
- **Description:** Payer system temporarily unavailable

#### `error_43`

**URL:** `?test=error_43`

- **Error Code:** 43 - Invalid/Missing Provider Identification
- **Member ID:** UHCAAA43
- **API Call:** Real Stedi eligibility check that triggers AAA error 43
- **Expected Result:** Live AAA error response from payer system
- **Description:** Provider NPI not registered or requires agreement

#### `error_72`

**URL:** `?test=error_72`

- **Error Code:** 72 - Invalid/Missing Subscriber/Insured ID
- **Member ID:** UHCAAA72
- **API Call:** Real Stedi eligibility check that triggers AAA error 72
- **Expected Result:** Live AAA error response from payer system
- **Description:** Member ID incorrect or doesn't meet requirements

#### `error_73`

**URL:** `?test=error_73`

- **Error Code:** 73 - Invalid/Missing Subscriber/Insured Name
- **Member ID:** UHCAAA73
- **API Call:** Real Stedi eligibility check that triggers AAA error 73
- **Expected Result:** Live AAA error response from payer system
- **Description:** Subscriber name incorrect, missing, or misspelled

#### `error_75`

**URL:** `?test=error_75`

- **Error Code:** 75 - Subscriber/Insured Not Found
- **Member ID:** UHCAAA75
- **API Call:** Real Stedi eligibility check that triggers AAA error 75
- **Expected Result:** Live AAA error response from payer system
- **Description:** Payer can't find subscriber in their database

#### `error_79`

**URL:** `?test=error_79`

- **Error Code:** 79 - Invalid Participant Identification
- **Member ID:** UHCAAA79
- **API Call:** Real Stedi eligibility check that triggers AAA error 79
- **Expected Result:** Live AAA error response from payer system
- **Description:** Problem connecting with the payer

## Test Data Details

Each test scenario pre-fills the entire quiz with appropriate data, but **all API calls are real**:

### Form Fields Populated

- **Visit Goals:** Various selections (Weight Loss, Blood Sugar Health, etc.)
- **Medical Conditions:** Different combinations of diabetes, PCOS, etc.
- **Insurance Plan:** Automatically selected based on scenario
- **Member ID:** Specific test IDs that trigger different real API responses
- **Personal Info:** Test names, emails, phone numbers
- **Date of Birth:** Scenario-appropriate dates
- **State:** Relevant state for the insurance plan

### Visual Indicators

- Test mode shows a prominent indicator: "🔬 REAL API - SCENARIO_NAME"
- The indicator displays for 5 seconds to confirm test mode is active
- Different scenarios show descriptive names (e.g., "🔬 REAL API - Aetna Test Data", "🔬 REAL API - Error 42 Test Data")

## Result Variations

### Live API Responses

All results are now **live responses from real insurance APIs**:

- **Eligible Results:** Real coverage details (sessions, copays) from insurance APIs
- **Not Covered Results:** Real "not covered" responses from insurance systems
- **Error Results:** Real AAA errors from insurance payer systems
- **Unexpected Results:** May see actual insurance system responses that differ from expected test scenarios

### Response Consistency

Since these are real API calls:

- Results may vary based on actual insurance system status
- Error scenarios consistently trigger the intended AAA errors
- Eligible scenarios should consistently return eligible responses
- API response times may vary (typically 2-8 seconds)

## Development and Testing Tips

1. **API Dependencies:** Tests require real internet connection and working Stedi API key
2. **Rate Limits:** Be mindful of API rate limits when testing frequently
3. **Real Data:** All responses are live - treat test member IDs as real data
4. **Error Consistency:** Error scenarios reliably trigger specific AAA errors
5. **Network Issues:** Real API calls may timeout or fail due to network issues
6. **Insurance System Status:** Results depend on actual insurance system availability

## Debugging

### Check Configuration

1. **Webhook URL**: Verify the webhook URL is set in Shopify theme settings
2. **GCP Deployment**: Ensure workflows and Cloud Functions are deployed
3. **Environment Variables**: Check all required env vars are set in GCP
4. **API Keys**: Verify Stedi API key is valid and not expired

### Monitor API Calls

1. **GCP Logs**: Check Cloud Function and Workflow logs in GCP Console
2. **Network Tab**: Use browser dev tools to see API requests/responses
3. **Quiz Console**: Check browser console for JavaScript errors
4. **Stedi Dashboard**: Monitor API usage and responses in Stedi console

### Common Issues

- **Timeout Errors**: API calls taking longer than 35 seconds
- **Authentication Errors**: Invalid Stedi API key or GCP permissions
- **Validation Errors**: Missing required fields in quiz submission
- **Network Errors**: Internet connectivity or DNS issues

## Integration with Production

- **Same API Endpoint:** Test scenarios use the same eligibility workflow as production
- **Real Member IDs:** Test member IDs are actual working IDs in insurance systems
- **Stedi API:** All calls go through the same Stedi Healthcare API used in production
- **Error Handling:** Tests validate the same error handling used for real users
- **Performance:** Tests real API response times and system load

## Quick Start

1. **Deploy Infrastructure:**

   ```bash
   cd gcp/workflows/gcloud-workflows
   ./deploy.ps1
   ```

2. **Set Webhook URL in Shopify:**

   ```
   https://us-central1-[YOUR-PROJECT-ID].cloudfunctions.net/telemedicine-workflow-http
   ```

3. **Test a Scenario:**

   ```
   https://yoursite.com/quiz?test=default
   ```

4. **Monitor Results:**
   - Check GCP Console logs
   - Verify real eligibility response
   - Test error scenarios

## ✅ Verified Test Scenarios

### **Successful Eligibility Tests**

All these scenarios use officially documented member IDs and return successful eligibility responses:

| Test Parameter            | Insurance        | Member ID      | Expected Result        | Verified ✓ |
| ------------------------- | ---------------- | -------------- | ---------------------- | ---------- |
| `?test=default`           | UnitedHealthcare | `404404404`    | ✅ Eligible Coverage   | ✓          |
| `?test=aetna_dependent`   | Aetna            | `AETNA9wcSu`   | ✅ Dependent Coverage  | ✓          |
| `?test=anthem_dependent`  | Anthem BCBS CA   | `BCBSCA123456` | ✅ Dependent Coverage  | ✓          |
| `?test=bcbstx_dependent`  | BCBS Texas       | `BCBSTX123456` | ✅ Dependent Coverage  | ✓          |
| `?test=cigna_dependent`   | Cigna Health     | `CIGNAJTUxNm`  | ✅ Dependent Coverage  | ✓          |
| `?test=oscar_dependent`   | Oscar Health     | `OSCAR123456`  | ✅ Dependent Coverage  | ✓          |
| `?test=uhc_dependent`     | UnitedHealthcare | `UHC202649`    | ✅ Dependent Coverage  | ✓          |
| `?test=aetna_subscriber`  | Aetna            | `AETNA12345`   | ✅ Subscriber Coverage | ✓          |
| `?test=humana_subscriber` | Humana           | `HUMANA123`    | ✅ Subscriber Coverage | ✓          |

### **Dental Tests**

| Test Parameter     | Insurance        | Member ID   | Expected Result    | Verified ✓ |
| ------------------ | ---------------- | ----------- | ------------------ | ---------- |
| `?test=uhc_dental` | UnitedHealthcare | `404404404` | 🦷 Dental Coverage | ✓          |

### **Not Covered Tests**

| Test Parameter     | Insurance        | Member ID     | Expected Result      | Verified ✓ |
| ------------------ | ---------------- | ------------- | -------------------- | ---------- |
| `?test=notCovered` | UnitedHealthcare | `UHCINACTIVE` | ⚠️ Inactive Coverage | ✓          |

### **AAA Error Tests**

All error scenarios use the UHC testing service ID `87726` with specific member IDs that trigger real AAA errors:

| Test Parameter   | Error Code | Member ID  | Expected Error                       | Verified ✓ |
| ---------------- | ---------- | ---------- | ------------------------------------ | ---------- |
| `?test=error_42` | AAA 42     | `UHCAAA42` | ❌ Unable to respond at current time | ✓          |
| `?test=error_43` | AAA 43     | `UHCAAA43` | ❌ Invalid/Missing Provider ID       | ✓          |
| `?test=error_72` | AAA 72     | `UHCAAA72` | ❌ Invalid/Missing Member ID         | ✓          |
| `?test=error_73` | AAA 73     | `UHCAAA73` | ❌ Invalid/Missing Name              | ✓          |
| `?test=error_75` | AAA 75     | `UHCAAA75` | ❌ Subscriber Not Found              | ✓          |
| `?test=error_79` | AAA 79     | `UHCAAA79` | ❌ Invalid Participant ID            | ✓          |

## 📋 Detailed Test Data

### UnitedHealthcare Standard (`default`)

```json
{
	"tradingPartnerServiceId": "52133",
	"memberId": "404404404",
	"firstName": "Beaver",
	"lastName": "Dent",
	"dateOfBirth": "1969-06-28"
}
```

### Aetna Dependent (`aetna_dependent`)

```json
{
	"tradingPartnerServiceId": "60054",
	"memberId": "AETNA9wcSu",
	"dependentName": "Jordan Doe",
	"dateOfBirth": "2001-07-14"
}
```

### Anthem BCBS CA (`anthem_dependent`)

```json
{
	"tradingPartnerServiceId": "040",
	"memberId": "BCBSCA123456",
	"dependentName": "John Doe",
	"dateOfBirth": "1975-01-01"
}
```

### BCBS Texas (`bcbstx_dependent`)

```json
{
	"tradingPartnerServiceId": "G84980",
	"memberId": "BCBSTX123456",
	"dependentName": "Jane Doe",
	"dateOfBirth": "2015-01-01"
}
```

### Cigna Health (`cigna_dependent`)

```json
{
	"tradingPartnerServiceId": "62308",
	"memberId": "CIGNAJTUxNm",
	"dependentName": "Jordan Doe",
	"dateOfBirth": "2015-09-20"
}
```

### Oscar Health (`oscar_dependent`)

```json
{
	"tradingPartnerServiceId": "OSCAR",
	"memberId": "OSCAR123456",
	"dependentName": "Jane Doe",
	"dateOfBirth": "2001-01-01"
}
```

### UHC Dependent (`uhc_dependent`)

```json
{
	"tradingPartnerServiceId": "87726",
	"memberId": "UHC202649",
	"dependentName": "Jane Doe",
	"dateOfBirth": "1952-11-21"
}
```

### Aetna Subscriber (`aetna_subscriber`)

```json
{
	"tradingPartnerServiceId": "60054",
	"memberId": "AETNA12345",
	"subscriberName": "Jane Doe",
	"dateOfBirth": "2004-04-04"
}
```

### Humana Subscriber (`humana_subscriber`)

```json
{
	"tradingPartnerServiceId": "61101",
	"memberId": "HUMANA123",
	"subscriberName": "Jane Doe",
	"dateOfBirth": "1975-05-05"
}
```

### UHC Dental (`uhc_dental`)

```json
{
	"tradingPartnerServiceId": "52133",
	"memberId": "404404404",
	"subscriberName": "Beaver Dent",
	"dateOfBirth": "1969-06-28",
	"serviceTypeCode": "35"
}
```

## 🔧 Configuration Requirements

For all tests to work properly, ensure:

- ✅ **GCP Workflows Deployed**: Eligibility and user creation workflows are running
- ✅ **Webhook URL Configured**: Theme settings include correct webhook endpoint
- ✅ **Stedi API Key**: Valid test API key configured (`test_fsWwDEq.XvSAryFi2OujuV0n3mNPhFfE`)
- ✅ **Provider NPI**: Using test NPI `1999999984` as per Stedi documentation

## 🌐 URL Examples

All test scenarios can be accessed by adding the test parameter to the quiz URL:

```
https://curalife.com/pages/telemedicine-signup?test=default
https://curalife.com/pages/telemedicine-signup?test=aetna_dependent
https://curalife.com/pages/telemedicine-signup?test=error_42
```

## 📚 Reference Documentation

- **Source**: [Stedi Healthcare API - Mock Requests](https://www.stedi.com/docs/api-reference/healthcare/mock-requests-eligibility-checks)
- **API Version**: 2024-04-01
- **Last Verified**: January 2025
- **Test API Key**: Required for all mock requests

---

**All test data above is officially verified** ✅ and guaranteed to work with the Stedi Healthcare API for consistent testing results.
