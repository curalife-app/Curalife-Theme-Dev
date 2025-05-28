const { ExecutionsClient } = require("@google-cloud/workflows");

const client = new ExecutionsClient();

/**
 * HTTP Cloud Function that executes the telemedicine workflow synchronously
 * and returns the result to the frontend.
 */
exports.telemedicineWebhook = async (req, res) => {
	// Set CORS headers
	res.set("Access-Control-Allow-Origin", "*");
	res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
	res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

	// Handle preflight requests
	if (req.method === "OPTIONS") {
		res.status(204).send("");
		return;
	}

	try {
		console.log("Received request:", {
			method: req.method,
			headers: req.headers,
			body: req.body
		});

		// Extract payload from request
		let payload;
		if (req.body && req.body.data) {
			// Handle double-wrapped data from frontend
			try {
				payload = typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body.data;
			} catch (parseError) {
				console.error("Error parsing request.body.data:", parseError);
				payload = req.body;
			}
		} else {
			payload = req.body;
		}

		console.log("Extracted payload:", payload);

		// Validate required fields
		if (!payload || !payload.customerEmail) {
			return res.status(400).json({
				success: false,
				error: "Missing required field: customerEmail"
			});
		}

		// Execute the workflow synchronously
		const projectId = process.env.GOOGLE_CLOUD_PROJECT || "859509920902";
		const location = "us-central1";
		const workflowId = "telemedicine-flow";

		const workflowPath = client.workflowPath(projectId, location, workflowId);

		console.log("Executing workflow:", workflowPath);
		console.log("With payload:", JSON.stringify(payload, null, 2));

		// Create execution and wait for result
		const [execution] = await client.createExecution({
			parent: workflowPath,
			execution: {
				argument: JSON.stringify(payload)
			}
		});

		console.log("Workflow execution created:", execution.name);

		// Poll for completion
		let result;
		let attempts = 0;
		const maxAttempts = 30; // 30 seconds max

		while (attempts < maxAttempts) {
			const [currentExecution] = await client.getExecution({
				name: execution.name
			});

			console.log(`Attempt ${attempts + 1}: Execution state: ${currentExecution.state}`);

			if (currentExecution.state === "SUCCEEDED") {
				result = JSON.parse(currentExecution.result);
				console.log("Workflow completed successfully:", result);
				break;
			} else if (currentExecution.state === "FAILED") {
				console.error("Workflow failed:", currentExecution.error);
				return res.status(500).json({
					success: false,
					error: `Workflow failed: ${currentExecution.error?.message || "Unknown error"}`
				});
			} else if (currentExecution.state === "CANCELLED") {
				console.error("Workflow was cancelled");
				return res.status(500).json({
					success: false,
					error: "Workflow was cancelled"
				});
			}

			// Wait 1 second before checking again
			await new Promise(resolve => setTimeout(resolve, 1000));
			attempts++;
		}

		if (!result) {
			console.error("Workflow timed out after 30 seconds");
			return res.status(500).json({
				success: false,
				error: "Workflow execution timed out"
			});
		}

		// The workflow returns an HTTP response object with {body, headers, statusCode}
		// We need to extract the actual result from the body
		let finalResult;
		if (result && result.body) {
			console.log("Extracting body from workflow HTTP response");
			finalResult = result.body;
		} else {
			console.log("Using workflow result directly");
			finalResult = result;
		}

		// Return the workflow result
		console.log("Returning result to frontend:", finalResult);
		res.status(200).json(finalResult);
	} catch (error) {
		console.error("Error in telemedicine webhook:", error);
		res.status(500).json({
			success: false,
			error: error.message || "Internal server error"
		});
	}
};
