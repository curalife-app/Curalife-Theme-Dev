const { workflowsClient } = require("./workflow-client");

exports.handler = async (req, res) => {
	res.set("Access-Control-Allow-Origin", "*");

	if (req.method === "OPTIONS") {
		res.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
		res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
		res.set("Access-Control-Max-Age", "3600");
		res.status(204).send("");
		return;
	}

	try {
		const projectId = process.env.GCP_PROJECT || "telemedicine-458913";
		const location = "us-central1";
		const workflowId = "eligibility-workflow";

		console.log(`Executing eligibility workflow (${workflowId}) with payload:`, JSON.stringify(req.body));

		// Validate required fields
		const { firstName, lastName, insuranceMemberId } = req.body || {};
		if (!firstName || !lastName || !insuranceMemberId) {
			console.error("Missing required fields:", { firstName, lastName, insuranceMemberId });
			return res.status(400).send({
				success: false,
				error: "Missing required fields for eligibility check",
				missingFields: [!firstName ? "firstName" : null, !lastName ? "lastName" : null, !insuranceMemberId ? "insuranceMemberId" : null].filter(Boolean),
				receivedData: req.body
			});
		}

		// Create execution name
		const name = `projects/${projectId}/locations/${location}/workflows/${workflowId}`;
		console.log(`Using workflow path: ${name}`);

		// Create execution
		const [execution] = await workflowsClient.createExecution({
			parent: name,
			execution: {
				argument: JSON.stringify(req.body || {})
			}
		});

		console.log(`Created execution: ${execution.name}`);

		// Wait for execution to complete with polling
		let result;
		let attempts = 0;
		const maxAttempts = 30; // 30 seconds max wait time

		do {
			await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
			attempts++;

			[result] = await workflowsClient.getExecution({
				name: execution.name
			});

			console.log(`Attempt ${attempts}: Execution state: ${result.state}`);

			if (result.state === "SUCCEEDED" || result.state === "FAILED") {
				break;
			}
		} while (attempts < maxAttempts);

		console.log("Final execution state:", result.state);

		// Handle execution errors
		if (result.state === "FAILED") {
			console.error("Workflow execution failed:", result.error);
			return res.status(500).send({
				success: false,
				error: "Workflow execution failed",
				details: result.error,
				receivedData: req.body
			});
		}

		// Handle timeout
		if (result.state !== "SUCCEEDED") {
			console.error("Workflow execution timed out or is still running:", result.state);
			return res.status(500).send({
				success: false,
				error: "Workflow execution timed out",
				state: result.state,
				receivedData: req.body
			});
		}

		// Parse the result
		let resultData = result.result ? JSON.parse(result.result) : {};

		console.log("Workflow result:", resultData);

		// The workflow returns { statusCode, headers, body: { success, eligibilityData, ... } }
		// We need to return just the body content for the telemedicine workflow
		if (resultData && resultData.body) {
			res.status(resultData.statusCode || 200).send(resultData.body);
		} else {
			// Fallback if structure is unexpected
			res.status(200).send(resultData);
		}
	} catch (error) {
		console.error("Error executing workflow:", error);
		res.status(500).send({
			success: false,
			error: "Failed to execute eligibility workflow",
			details: error.message,
			receivedData: req.body
		});
	}
};
