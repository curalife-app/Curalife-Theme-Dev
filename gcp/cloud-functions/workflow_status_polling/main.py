import json
import logging
import time
from flask import jsonify
from google.cloud import storage

def workflow_status_polling(request):
    """
    Cloud Function to poll actual workflow status from Cloud Storage
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
            headers = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Content-Type': 'application/json'
            }
            return (jsonify({
                'success': False,
                'error': 'Only POST and GET methods are allowed'
            }), 405, headers)

        # Extract status tracking ID
        status_tracking_id = None
        if request.method == 'POST':
            request_json = request.get_json(silent=True)
            if request_json:
                status_tracking_id = request_json.get('statusTrackingId')
        elif request.method == 'GET':
            status_tracking_id = request.args.get('statusTrackingId')

        if not status_tracking_id:
            headers = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Content-Type': 'application/json'
            }
            return (jsonify({
                'success': False,
                'error': 'statusTrackingId is required'
            }), 400, headers)

        logger.info(f"Reading actual status for tracking ID: {status_tracking_id}")

        # Initialize Cloud Storage client
        storage_client = storage.Client()
        bucket_name = "curalife-workflow-status"
        object_name = f"status/{status_tracking_id}.json"

        try:
            # Get the status object from Cloud Storage
            bucket = storage_client.bucket(bucket_name)
            blob = bucket.blob(object_name)

            if not blob.exists():
                logger.warning(f"Status file not found: {object_name}")
                headers = {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, GET',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Content-Type': 'application/json'
                }
                return (jsonify({
                    'success': False,
                    'error': f'Status not found for tracking ID: {status_tracking_id}',
                    'statusTrackingId': status_tracking_id
                }), 404, headers)

            # Download and parse the status data
            status_content = blob.download_as_text()
            status_data = json.loads(status_content)

            logger.info(f"Retrieved status for {status_tracking_id}: {status_data.get('currentStep', 'unknown')} ({status_data.get('progress', 0)}%)")

            # Return the actual status data
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

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse status JSON for {status_tracking_id}: {str(e)}")
            headers = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Content-Type': 'application/json'
            }
            return (jsonify({
                'success': False,
                'error': 'Invalid status data format',
                'statusTrackingId': status_tracking_id
            }), 500, headers)

        except Exception as e:
            logger.error(f"Failed to read status from Cloud Storage: {str(e)}")
            headers = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Content-Type': 'application/json'
            }
            return (jsonify({
                'success': False,
                'error': f'Failed to read status: {str(e)}',
                'statusTrackingId': status_tracking_id
            }), 500, headers)

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