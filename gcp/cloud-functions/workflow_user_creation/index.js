const { ExecutionsClient } = require("@google-cloud/workflows").v1;
const client = new ExecutionsClient();

exports.processWorkflow = async (req, res) => {
	res.set("Access-Control-Allow-Origin", "*");

	if (req.method === "OPTIONS") {
		res.set("Access-Control-Allow-Methods", "POST");
		res.set("Access-Control-Allow-Headers", "Content-Type");
		res.set("Access-Control-Max-Age", "3600");
		res.status(204).send("");
		return;
	}

	const projectId = "telemedicine-458913";
	const location = "us-central1";
	const workflow = "user-creation-workflow";
	const argument = req.body;

	try {
		console.log(`Executing workflow: ${workflow} with argument:`, JSON.stringify(argument, null, 2));
		const [execution] = await client.createExecution({
			parent: `projects/${projectId}/locations/${location}/workflows/${workflow}`,
			execution: {
				argument: JSON.stringify(argument)
			}
		});

		console.log(`Created execution: ${execution.name}`);
		res.status(200).send({
			message: "Successfully started user creation workflow",
			executionName: execution.name
		});
	} catch (error) {
		console.error("Error executing workflow:", error);
		res.status(500).send({
			message: "Failed to start user creation workflow",
			error: error.message
		});
	}
};
