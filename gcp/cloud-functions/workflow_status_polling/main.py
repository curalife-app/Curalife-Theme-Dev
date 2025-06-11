import json
import logging
import time
from flask import jsonify

def workflow_status_polling(request):
    """
    Cloud Function to return mock workflow status (simplified version)
    """
    try:
        # Configure logging
        logging.basicConfig(level=logging.INFO)
        logger = logging.getLogger(__name__)

        # Handle CORS preflight
        if request.method == 'OPTIONS':
            headers = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '3600'
            }
            return ('', 204, headers)

        # Get request data
        if request.method not in ['POST', 'GET']:
            return jsonify({
                'success': False,
                'error': 'Only POST and GET methods are allowed'
            }), 405

        # Extract status tracking ID
        status_tracking_id = None
        if request.method == 'POST':
            request_json = request.get_json(silent=True)
            if request_json:
                status_tracking_id = request_json.get('statusTrackingId')
        elif request.method == 'GET':
            status_tracking_id = request.args.get('statusTrackingId')

        if not status_tracking_id:
            return jsonify({
                'success': False,
                'error': 'statusTrackingId is required'
            }), 400

        logger.info(f"Mock polling status for tracking ID: {status_tracking_id}")

        # Generate mock status data based on timestamp
        try:
            # Extract timestamp from status tracking ID
            timestamp = float(status_tracking_id.replace(".", "").replace(":", ""))
            current_time = time.time() * 1000000
            elapsed = (current_time - timestamp) / 1000000  # Convert to seconds

            # Simulate workflow progress based on elapsed time
            if elapsed < 5:
                status_data = {
                    'statusTrackingId': status_tracking_id,
                    'currentStep': 'processing',
                    'progress': 25,
                    'message': '🔍 Processing your information...',
                    'completed': False,
                    'error': False,
                    'timestamp': time.time()
                }
            elif elapsed < 10:
                status_data = {
                    'statusTrackingId': status_tracking_id,
                    'currentStep': 'validating',
                    'progress': 50,
                    'message': '✅ Validating eligibility...',
                    'completed': False,
                    'error': False,
                    'timestamp': time.time()
                }
            elif elapsed < 15:
                status_data = {
                    'statusTrackingId': status_tracking_id,
                    'currentStep': 'finalizing',
                    'progress': 75,
                    'message': '🏁 Finalizing account creation...',
                    'completed': False,
                    'error': False,
                    'timestamp': time.time()
                }
            else:
                status_data = {
                    'statusTrackingId': status_tracking_id,
                    'currentStep': 'completed',
                    'progress': 100,
                    'message': '🎉 Account creation completed successfully!',
                    'completed': True,
                    'error': False,
                    'timestamp': time.time()
                }

        except:
            # Fallback to completed status if timestamp parsing fails
            status_data = {
                'statusTrackingId': status_tracking_id,
                'currentStep': 'completed',
                'progress': 100,
                'message': '✅ Process completed successfully!',
                'completed': True,
                'error': False,
                'timestamp': time.time()
            }

        logger.info(f"Returning mock status for {status_tracking_id}: {status_data.get('currentStep', 'unknown')}")

        # Return status data
        response_data = {
            'success': True,
            'statusData': status_data,
            'statusTrackingId': status_tracking_id
        }

        # CORS headers
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Content-Type': 'application/json'
        }

        return (jsonify(response_data), 200, headers)

    except Exception as e:
        logger.error(f"Status polling function error: {str(e)}")

        error_response = {
            'success': False,
            'error': str(e),
            'type': 'status_polling_error'
        }

        headers = {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        }

        return (jsonify(error_response), 500, headers)

# Entry point function for Google Cloud Functions
def main(request):
    return workflow_status_polling(request)