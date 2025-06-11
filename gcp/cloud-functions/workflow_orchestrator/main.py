import json
import logging
from google.cloud import workflows_v1
from google.cloud.workflows import executions_v1
from flask import jsonify

def workflow_orchestrator(request):
    """
    Cloud Function to trigger the orchestrator workflow
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
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '3600'
            }
            return ('', 204, headers)

        # Get request data
        if request.method != 'POST':
            return jsonify({
                'success': False,
                'error': 'Only POST method is allowed'
            }), 405

        request_json = request.get_json(silent=True)
        if not request_json:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400

        logger.info(f"Received orchestrator request for email: {request_json.get('customerEmail', 'unknown')}")

        # Initialize workflow client
        client = executions_v1.ExecutionsClient()

        # Workflow configuration
        PROJECT_ID = "telemedicine-458913"
        LOCATION = "us-central1"
        WORKFLOW_ID = "workflow-orchestrator"

        parent = client.workflow_path(PROJECT_ID, LOCATION, WORKFLOW_ID)

        # Execute workflow
        execution = executions_v1.Execution(
            argument=json.dumps(request_json)
        )

        logger.info(f"Starting orchestrator workflow for: {request_json.get('customerEmail')}")
        operation = client.create_execution(
            parent=parent,
            execution=execution
        )

        logger.info(f"Orchestrator workflow execution started: {operation.name}")

        # Generate status tracking ID (same logic as in workflow)
        import time
        timestamp = time.time()
        status_tracking_id = str(timestamp).replace(".", "").replace(":", "")

        # Return immediate response with status tracking ID
        response_data = {
            'success': True,
            'statusTrackingId': status_tracking_id,
            'message': 'Workflow started with status tracking',
            'executionName': operation.name,
            'timestamp': request_json.get('timestamp', None),
            'customerEmail': request_json.get('customerEmail', 'unknown')
        }

        # CORS headers
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Content-Type': 'application/json'
        }

        return (jsonify(response_data), 200, headers)

    except Exception as e:
        logger.error(f"Orchestrator function error: {str(e)}")

        error_response = {
            'success': False,
            'error': str(e),
            'type': 'orchestrator_error'
        }

        headers = {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        }

        return (jsonify(error_response), 500, headers)

# Entry point function for Google Cloud Functions
def main(request):
    return workflow_orchestrator(request)