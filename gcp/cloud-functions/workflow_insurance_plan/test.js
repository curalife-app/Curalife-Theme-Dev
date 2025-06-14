const axios = require("axios");

async function testInsurancePlan() {
	try {
		const testData = {
			customerEmail: "test@example.com",
			firstName: "John",
			lastName: "Doe",
			state: "CA",
			insurance: "Blue Cross Blue Shield",
			insuranceMemberId: "BC123456",
			groupNumber: "GRP789",
			dateOfBirth: "1990-01-01",
			hubspotContactId: "12345",
			eligibilityData: {
				isEligible: true,
				eligibilityStatus: "Active",
				sessionsCovered: 10,
				planBegin: "2024-01-01",
				planEnd: "2024-12-31",
				deductible: {
					individual: 25
				}
			},
			mainReasons: ["Weight Loss", "Nutrition Counseling"],
			medicalConditions: ["Diabetes"]
		};

		console.log("Testing insurance plan creation...");
		console.log("Request data:", JSON.stringify(testData, null, 2));

		const response = await axios.post("https://us-central1-telemedicine-458913.cloudfunctions.net/workflow_insurance_plan", testData, {
			headers: {
				"Content-Type": "application/json"
			}
		});

		console.log("✅ Success!");
		console.log("Response:", JSON.stringify(response.data, null, 2));
	} catch (error) {
		console.log("❌ Error:");
		console.log("Status:", error.response?.status);
		console.log("Status Text:", error.response?.statusText);
		console.log("Error Data:", JSON.stringify(error.response?.data, null, 2));
		console.log("Error Message:", error.message);
	}
}

testInsurancePlan();
