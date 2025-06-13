const axios = require("axios");

async function testInsurancePlanFunction() {
	const url = "https://us-central1-telemedicine-458913.cloudfunctions.net/workflow_insurance_plan";

	const testPayload = {
		customerEmail: "subtain_rathore@yahoo.com",
		firstName: "Muhammad",
		lastName: "Tashfeen",
		phoneNumber: "5551234567",
		state: "GA",
		insurance: "Humana",
		insuranceMemberId: "HUMANA123TEST",
		groupNumber: "GRP789TEST",
		dateOfBirth: "1975-05-05",
		// Using real HubSpot Contact ID from API
		hubspotContactId: "309336616169",
		eligibilityData: {
			isEligible: true,
			sessionsCovered: 25,
			deductible: {
				individual: 250
			},
			eligibilityStatus: "ACTIVE",
			userMessage: "Test: Your insurance is active. Coverage details: 25 sessions covered.",
			planBegin: "2024-01-01",
			planEnd: ""
		},
		stediResponse: {
			note: "This is a sample Stedi response for testing."
		},
		mainReasons: ["Anxiety", "Stress"],
		medicalConditions: ["None"]
	};

	console.log("Sending test payload to cloud function...");
	console.log(JSON.stringify(testPayload, null, 2));

	try {
		const response = await axios.post(url, testPayload, {
			headers: {
				"Content-Type": "application/json"
			}
		});

		console.log("\\n--- Function Response ---");
		console.log("Status:", response.status);
		console.log("Data:", JSON.stringify(response.data, null, 2));
	} catch (error) {
		console.error("\\n--- Error ---");
		if (error.response) {
			console.error("Status:", error.response.status);
			console.error("Data:", JSON.stringify(error.response.data, null, 2));
		} else {
			console.error("Error:", error.message);
		}
	}
}

testInsurancePlanFunction();
