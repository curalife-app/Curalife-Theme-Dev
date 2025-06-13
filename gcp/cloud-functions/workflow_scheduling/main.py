import json
import logging
from flask import jsonify

def workflow_scheduling(request):
    """
    Cloud Function to handle scheduling workflow
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

        # Extract required fields
        required_fields = ['firstName', 'lastName', 'customerEmail', 'phoneNumber', 'address', 'city', 'zip', 'sex']
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

        # For now, return a mock successful response
        # TODO: Integrate with actual scheduling service (Beluga, Calendly, etc.)

        # Generate a mock schedule link
        customer_name = f"{request_json.get('firstName', '')}-{request_json.get('lastName', '')}"
        mock_schedule_link = f"https://calendly.com/curalife-dietitian/{customer_name.lower().replace(' ', '-')}"

        # Generate a mock master ID
        import time
        master_id = f"SCH-{int(time.time())}"

        response_data = {
            'success': True,
            'schedulingData': {
                'status': 'SCHEDULED',
                'success': True,
                'scheduleLink': mock_schedule_link,
                'masterId': master_id,
                'message': 'Appointment scheduling link generated successfully',
                'customerEmail': request_json.get('customerEmail'),
                'customerName': f"{request_json.get('firstName', '')} {request_json.get('lastName', '')}".strip()
            }
        }

        logger.info(f"Scheduling successful for {request_json.get('customerEmail')} - Master ID: {master_id}")

        # CORS headers
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Workflow-Type',
            'Content-Type': 'application/json'
        }

        return (jsonify(response_data), 200, headers)

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

# Entry point function for Google Cloud Functions
def main(request):
    return workflow_scheduling(request)