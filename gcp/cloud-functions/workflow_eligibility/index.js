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

		// Wait for execution to finish
		const [result] = await workflowsClient.getExecution({
			name: execution.name
		});

		console.log("Execution finished with state:", result.state);

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

		// Parse the result
		let resultData = result.result ? JSON.parse(result.result) : {};
		res.status(200).send(resultData);
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
