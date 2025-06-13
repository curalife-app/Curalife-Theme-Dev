import json
import logging
import requests
import os
import time
from datetime import datetime
from flask import jsonify

def workflow_scheduling(request):
    """
    Cloud Function to handle scheduling workflow via Beluga API
    """
    try:
        # Configure logging
        logging.basicConfig(level=logging.INFO)
        logger = logging.getLogger(__name__)

        # Handle CORS preflight
        if request.method == 'OPTIONS':
            headers = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Workflow-Type',
                'Access-Control-Max-Age': '3600'
            }
            return ('', 204, headers)

        # Get request data
        if request.method != 'POST':
            headers = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Workflow-Type',
                'Content-Type': 'application/json'
            }
            return (jsonify({
                'success': False,
                'error': 'Only POST method is allowed'
            }), 405, headers)

        request_json = request.get_json(silent=True)
        if not request_json:
            headers = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Workflow-Type',
                'Content-Type': 'application/json'
            }
            return (jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400, headers)

        logger.info(f"Received scheduling request for: {request_json.get('customerEmail', 'unknown')}")

        # Extract required fields for Beluga API
        required_fields = ['firstName', 'lastName', 'customerEmail', 'phoneNumber', 'dateOfBirth', 'address', 'city', 'state', 'zip', 'sex']
        missing_fields = [field for field in required_fields if not request_json.get(field)]

        if missing_fields:
            headers = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Workflow-Type',
                'Content-Type': 'application/json'
            }
            return (jsonify({
                'success': False,
                'schedulingData': {
                    'status': 'VALIDATION_ERROR',
                    'message': f'Missing required fields: {", ".join(missing_fields)}',
                    'missingFields': missing_fields
                }
            }), 400, headers)

        # Get environment variables
        is_test_mode = request_json.get('testMode', False)

        # Use staging for test mode, production otherwise
        if is_test_mode:
            beluga_base_url = "https://api-staging.belugahealth.com"
            api_key = os.environ.get('BELUGA_STAGING_API_KEY')
        else:
            beluga_base_url = "https://api.belugahealth.com"
            api_key = os.environ.get('BELUGA_PRODUCTION_API_KEY')

        if not api_key:
            logger.error(f"Missing Beluga API key for {'staging' if is_test_mode else 'production'}")
            headers = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Workflow-Type',
                'Content-Type': 'application/json'
            }
            return (jsonify({
                'success': False,
                'schedulingData': {
                    'status': 'CONFIG_ERROR',
                    'message': 'API configuration error',
                    'error': 'Missing API key'
                }
            }), 500, headers)

        # Generate unique master ID
        master_id = f"CL-{int(time.time())}-{request_json.get('customerEmail', '').split('@')[0][:5]}"

        # Transform data for Beluga API
        beluga_payload = _build_beluga_payload(request_json, master_id)

        logger.info(f"Calling Beluga API for {request_json.get('customerEmail')} - Master ID: {master_id}")

        # Call Beluga API
        beluga_response = _call_beluga_api(beluga_base_url, api_key, beluga_payload, logger)

        if beluga_response['success']:
            logger.info(f"Scheduling successful for {request_json.get('customerEmail')} - Master ID: {master_id}")

            response_data = {
                'success': True,
                'schedulingData': {
                    'status': 'SCHEDULED',
                    'success': True,
                    'scheduleLink': beluga_response['data']['scheduleLink'],
                    'masterId': master_id,
                    'message': 'Appointment scheduling link generated successfully',
                    'customerEmail': request_json.get('customerEmail'),
                    'customerName': f"{request_json.get('firstName', '')} {request_json.get('lastName', '')}".strip(),
                    'belugaStatus': beluga_response['data']['status'],
                    'belugaInfo': beluga_response['data']['info']
                }
            }
        else:
            logger.error(f"Beluga API error for {request_json.get('customerEmail')}: {beluga_response['error']}")

            response_data = {
                'success': False,
                'schedulingData': {
                    'status': 'BELUGA_ERROR',
                    'message': f'Scheduling service error: {beluga_response["error"]}',
                    'error': beluga_response['error'],
                    'masterId': master_id,
                    'belugaStatus': beluga_response.get('status')
                }
            }

        # CORS headers
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Workflow-Type',
            'Content-Type': 'application/json'
        }

        return (jsonify(response_data), 200 if beluga_response['success'] else 400, headers)

    except Exception as e:
        logger.error(f"Scheduling function error: {str(e)}")

        error_response = {
            'success': False,
            'schedulingData': {
                'status': 'SERVER_ERROR',
                'message': f'Scheduling service error: {str(e)}',
                'error': str(e)
            }
        }

        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Workflow-Type',
            'Content-Type': 'application/json'
        }

        return (jsonify(error_response), 500, headers)

def _build_beluga_payload(request_data, master_id):
    """Transform quiz data into Beluga API format"""

    # Format date of birth from YYYYMMDD to MM/DD/YYYY
    dob_raw = request_data.get('dateOfBirth', '')
    if len(dob_raw) == 8:  # YYYYMMDD format
        dob_formatted = f"{dob_raw[4:6]}/{dob_raw[6:8]}/{dob_raw[0:4]}"
    else:
        dob_formatted = dob_raw  # Use as-is if not in expected format

    # Format phone number to remove any formatting
    phone_raw = request_data.get('phoneNumber', '')
    phone_digits = ''.join(filter(str.isdigit, phone_raw))

    # Ensure state is uppercase and 2 characters
    state = request_data.get('state', '').upper()[:2]

    # Build form object with quiz responses - ensuring no empty values
    form_obj = {
        'consentsSigned': True,  # Required by Beluga
        'firstName': request_data.get('firstName', '').strip(),
        'lastName': request_data.get('lastName', '').strip(),
        'dob': dob_formatted,
        'phone': phone_digits,
        'email': request_data.get('customerEmail', '').strip(),
        'address': request_data.get('address', '').strip(),
        'city': request_data.get('city', '').strip(),
        'state': state,
        'zip': request_data.get('zip', '').strip(),
        'sex': request_data.get('sex', '').strip()
    }

    # Validate required fields are not empty
    required_fields = ['firstName', 'lastName', 'dob', 'phone', 'email', 'address', 'city', 'state', 'zip', 'sex']
    empty_fields = []

    for field in required_fields:
        value = form_obj.get(field, '')
        if not value or value == '':
            empty_fields.append(field)

    if empty_fields:
        raise ValueError(f"Empty required fields for Beluga API: {', '.join(empty_fields)}")

    # Add quiz responses as Q/A pairs - only if they have actual content
    all_responses = request_data.get('allResponses', [])
    q_counter = 1

    for response in all_responses:
        question_text = response.get('question', {}).get('text', '').strip()
        answer_value = response.get('answer', '')

        # Skip empty questions/answers
        if not question_text or not answer_value:
            continue

        # Handle multiple choice formatting
        if response.get('question', {}).get('type') in ['multiple_choice', 'checkbox']:
            options = response.get('question', {}).get('options', [])
            if options:
                option_texts = [opt.get('text', opt.get('value', '')) for opt in options if opt.get('text') or opt.get('value')]
                if option_texts:
                    question_text += f" POSSIBLE ANSWERS: {'; '.join(option_texts)}"

        form_obj[f'Q{q_counter}'] = question_text
        form_obj[f'A{q_counter}'] = str(answer_value).strip()
        q_counter += 1

    # Add specific quiz questions if available and not empty
    if request_data.get('mainReasons') and str(request_data.get('mainReasons')).strip():
        form_obj[f'Q{q_counter}'] = 'What are your main reasons for seeking nutrition counseling?'
        form_obj[f'A{q_counter}'] = str(request_data.get('mainReasons')).strip()
        q_counter += 1

    if request_data.get('medicalConditions'):
        conditions = request_data.get('medicalConditions')
        if conditions:
            form_obj[f'Q{q_counter}'] = 'Do you have any of the following medical conditions?'
            if isinstance(conditions, list):
                conditions_str = '; '.join([str(c).strip() for c in conditions if str(c).strip()])
            else:
                conditions_str = str(conditions).strip()

            if conditions_str:
                form_obj[f'A{q_counter}'] = conditions_str
                q_counter += 1

    return {
        'formObj': form_obj,
        'masterId': master_id,
        'company': 'curalife',
        'visitType': 'nutrition'
    }

def _call_beluga_api(base_url, api_key, payload, logger):
    """Make the actual API call to Beluga"""

    try:
        url = f"{base_url}/visit/createSyncNoRx"
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }

        logger.info(f"Calling Beluga API: {url}")
        logger.info(f"Payload being sent to Beluga: {json.dumps(payload, indent=2)}")

        response = requests.post(url, json=payload, headers=headers, timeout=30)

        logger.info(f"Beluga API response status: {response.status_code}")
        logger.info(f"Beluga API response headers: {dict(response.headers)}")

        if response.status_code == 200:
            response_data = response.json()
            logger.info(f"Beluga API success response: {json.dumps(response_data, indent=2)}")

            # Check if the response body indicates success (Beluga returns HTTP 200 even for errors)
            json_status = response_data.get('status')
            if json_status == 200:
                # True success
                return {
                    'success': True,
                    'data': {
                        'status': response_data.get('status'),
                        'info': response_data.get('info'),
                        'scheduleLink': response_data.get('scheduleLink'),
                        'masterId': response_data.get('data')
                    }
                }
            else:
                # Beluga returned HTTP 200 but with error status in JSON
                error_message = response_data.get('error', f'Beluga API error: status {json_status}')
                logger.error(f"Beluga API returned success HTTP but error JSON: {error_message}")
                return {
                    'success': False,
                    'error': error_message,
                    'status': json_status,
                    'raw_response': json.dumps(response_data)
                }
        else:
            # Log the full response for debugging
            response_text = response.text
            logger.error(f"Beluga API error response body: {response_text}")

            try:
                error_data = response.json()
                error_message = error_data.get('error', f'HTTP {response.status_code}')
                logger.error(f"Beluga API parsed error: {json.dumps(error_data, indent=2)}")
            except:
                error_message = f'HTTP {response.status_code}: {response_text}'
                logger.error(f"Could not parse error response as JSON: {response_text}")

            return {
                'success': False,
                'error': error_message,
                'status': response.status_code,
                'raw_response': response_text
            }

    except requests.exceptions.Timeout:
        logger.error("Beluga API request timed out")
        return {
            'success': False,
            'error': 'Request timed out'
        }
    except requests.exceptions.RequestException as e:
        logger.error(f"Beluga API network error: {str(e)}")
        return {
            'success': False,
            'error': f'Network error: {str(e)}'
        }
    except Exception as e:
        logger.error(f"Beluga API unexpected error: {str(e)}")
        return {
            'success': False,
            'error': f'Unexpected error: {str(e)}'
        }

# Entry point function for Google Cloud Functions
def main(request):
    return workflow_scheduling(request)