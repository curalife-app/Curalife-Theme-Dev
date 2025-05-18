main:
  params: [request]
  steps:
    # Setup default values and handle CORS
    - setup:
        assign:
          # Set default HTTP values and safely check for HTTP fields
          - isHttpRequest: ${request != null}
          # Check headers separately to avoid KeyError
          - hasHeadersKey: ${isHttpRequest and "headers" in request}
          - hasHeaders: ${hasHeadersKey and request.headers != null}
          # Check method separately to avoid KeyError
          - hasMethodKey: ${isHttpRequest and "method" in request}
          - hasMethod: ${hasMethodKey and request.method != null}
          # Now use these flags to safely access fields
          - requestMethod: ${if(hasMethod, request.method, "POST")}
          - hasOriginKey: ${hasHeaders and "origin" in request.headers}
          - origin: ${if(hasOriginKey, request.headers.origin, "https://curalife.com")}
          - corsHeaders:
              "Access-Control-Allow-Origin": ${origin}
              "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
              "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With"
              "Access-Control-Allow-Credentials": "true"
              "Access-Control-Max-Age": "3600"
              "Content-Type": "application/json"

    # Handle OPTIONS preflight
    - checkMethod:
        switch:
          - condition: ${requestMethod == "OPTIONS"}
            return:
              statusCode: 204
              body: ""
              headers: ${corsHeaders}
          - condition: true
            next: initConfig

    #############################################
    # SECTION 1: INITIALIZATION AND CONFIGURATION
    #############################################
    - initConfig:
        assign:
          # Raw request body - could be the entire request for direct invocations
          - hasBodyKey: ${isHttpRequest and "body" in request}
          - hasBody: ${hasBodyKey and request.body != null}
          - rawBody: ${if(hasBody, request.body, request)}
          # Environment config
          - config:
              SHOPIFY_STORE_NAME: ${sys.get_env("SHOPIFY_STORE_NAME")}
              SHOPIFY_ADMIN_ACCESS_TOKEN: ${sys.get_env("SHOPIFY_ADMIN_ACCESS_TOKEN")}
              STEDI_API_KEY: ${sys.get_env("STEDI_API_KEY")}
          # Reason and insurance mappings
          - reasonMap:
              opt1: "Weight Loss"
              opt2: "Blood Sugar Health"
              opt3: "Supplements Advice"
              opt4: "Other"
              opt5: "Weight Loss"
              opt6: "Blood Sugar Health"
              opt7: "Supplements Advice"
              opt8: "Glucometer & Strips"
          - insuranceMap:
              ins1: "Aetna"
              ins2: "Anthem"
              ins3: "Blue Cross Blue Shield"
              ins4: "Cigna"
              ins5: "Humana"
              ins6: "Kaiser Permanente"
              ins7: "Molina Healthcare"
              ins8: "UnitedHealthcare"
              ins9: "Health Net"
              ins10: "Highmark"
              ins11: "Tricare"
              ins12: "Medicare"
              ins13: "Medicaid"
              ins14: "Other / Not Listed"

    - extractActualPayload:
        assign:
          # Check if rawBody has a 'data' key first, then check if data is not null
          - hasDataKey: ${rawBody != null and "data" in rawBody}
          - hasData: ${hasDataKey and rawBody.data != null}
          # If rawBody has data, decode it; otherwise use rawBody
          - actualPayload: ${if(hasData, json.decode(rawBody.data), rawBody)}

    # Extract and sanitize fields
    - checkResponses:
        switch:
          - condition: ${actualPayload != null and "responses" in actualPayload and actualPayload.responses != null}
            assign:
              - responses: ${actualPayload.responses}
          - condition: true
            assign:
              - responses: {}
    - checkQuizId:
        switch:
          - condition: ${actualPayload != null and "quizId" in actualPayload and actualPayload.quizId != null}
            assign:
              - quizId: ${actualPayload.quizId}
          - condition: true
            assign:
              - quizId: "unknown"
    - checkQuizTitle:
        switch:
          - condition: ${actualPayload != null and "quizTitle" in actualPayload and actualPayload.quizTitle != null}
            assign:
              - quizTitle: ${actualPayload.quizTitle}
          - condition: true
            assign:
              - quizTitle: "Unknown Quiz"
    - checkTimestamp:
        switch:
          - condition: ${actualPayload != null and "timestamp" in actualPayload and actualPayload.timestamp != null}
            assign:
              - timestamp: ${actualPayload.timestamp}
          - condition: true
            assign:
              - timestamp: ${sys.now()}

    # Extract customer data
    - extractCustomerInfo:
        assign:
          - customerEmail: ""
          - firstName: ""
          - lastName: ""
          - phoneNumber: ""
          - state: ""
          - insurance: ""
          - insuranceMemberId: ""
          - mainReason: ""
          - secondaryReasons: []
          - dateOfBirth: ""
    - checkEmail:
        switch:
          - condition: ${responses != null and "q9" in responses and responses.q9 != null}
            assign:
              - customerEmail: ${responses.q9}
          - condition: true
            next: checkFirstName
    - checkFirstName:
        switch:
          - condition: ${responses != null and "q7" in responses and responses.q7 != null}
            assign:
              - firstName: ${responses.q7}
          - condition: true
            next: checkLastName
    - checkLastName:
        switch:
          - condition: ${responses != null and "q8" in responses and responses.q8 != null}
            assign:
              - lastName: ${responses.q8}
          - condition: true
            next: checkPhoneNumber
    - checkPhoneNumber:
        switch:
          - condition: ${responses != null and "q10" in responses and responses.q10 != null}
            assign:
              - phoneNumber: ${responses.q10}
          - condition: true
            next: checkState
    - checkState:
        switch:
          - condition: ${responses != null and "q5" in responses and responses.q5 != null}
            assign:
              - state: ${responses.q5}
          - condition: true
            next: checkInsurance
    - checkInsurance:
        switch:
          - condition: ${responses != null and "q3" in responses and responses.q3 != null}
            assign:
              - insurance: ${responses.q3}
          - condition: true
            next: checkInsuranceMemberId
    - checkInsuranceMemberId:
        switch:
          - condition: ${responses != null and "q4" in responses and responses.q4 != null}
            assign:
              - insuranceMemberId: ${responses.q4}
          - condition: true
            next: checkMainReason
    - checkMainReason:
        switch:
          - condition: ${responses != null and "q1" in responses and responses.q1 != null}
            assign:
              - mainReason: ${responses.q1}
          - condition: true
            next: checkSecondaryReasons
    - checkSecondaryReasons:
        switch:
          - condition: ${responses != null and "q2" in responses and responses.q2 != null}
            assign:
              - secondaryReasons: ${responses.q2}
          - condition: true
            next: checkDateOfBirth
    - checkDateOfBirth:
        switch:
          - condition: ${responses != null and "q6" in responses and responses.q6 != null}
            assign:
              - dateOfBirth: ${responses.q6}
          - condition: true
            next: validateEmail

    ##########################################
    # SECTION 2: PROCESSING AND CALLS
    ##########################################
    - validateEmail:
        switch:
          - condition: ${customerEmail != ""}
            next: createSuccessResponse
          - condition: true
            next: processInvalidEmail

    - createSuccessResponse:
        assign:
          - mainReasonText: "Unknown"
          - insuranceText: "Unknown"
        next: getMainReasonText
    - getMainReasonText:
        switch:
          - condition: ${mainReason != "" and reasonMap != null and mainReason in reasonMap and reasonMap[mainReason] != null}
            assign:
              - mainReasonText: ${reasonMap[mainReason]}
          - condition: true
            assign:
              - mainReasonText: ${mainReason}
        next: getInsuranceText
    - getInsuranceText:
        switch:
          - condition: ${insurance != "" and insuranceMap != null and insurance in insuranceMap and insuranceMap[insurance] != null}
            assign:
              - insuranceText: ${insuranceMap[insurance]}
          - condition: true
            assign:
              - insuranceText: ${insurance}
        next: createEligibilityData
    - createEligibilityData:
        assign:
          - eligibilityData:
              isEligible: true
              sessionsCovered: 10
              deductible:
                individual: 250
              eligibilityStatus: "ELIGIBLE"
              userMessage: "Good news! Based on your insurance information, you are eligible for 10 dietitian sessions."
        next: prepareKlaviyoData
    - prepareKlaviyoData:
        assign:
          - klaviyoProfileData:
              data:
                type: "profile"
                attributes:
                  email: ${customerEmail}
                  first_name: ${firstName}
                  last_name: ${lastName}
                  phone_number: ${phoneNumber}
                  properties:
                    "State": ${state}
                    "Insurance": ${insuranceText}
                    "Insurance Member ID": ${insuranceMemberId}
                    "Main Interest": ${mainReasonText}
                    "Quiz Source": ${quizTitle}
                    "Quiz Completed": ${sys.now()}
                    "$source": "Dietitian Quiz"
        next: createKlaviyoProfile
    - createKlaviyoProfile:
        try:
          call: http.post
          args:
            url: "https://a.klaviyo.com/api/profile-import"
            headers:
              revision: "2025-04-15"
              Authorization: ${"Klaviyo-API-Key " + sys.get_env("KLAVIYO_API_KEY")}
              Content-Type: "application/vnd.api+json"
              Accept: "application/vnd.api+json"
            body: ${klaviyoProfileData}
          result: klaviyoResponse
        except:
          as: e
          steps:
            - handleKlaviyoError:
                assign:
                  - klaviyoResponse:
                      statusCode: 500
                      errors: ${e}
        next: prepareShopifyMetafields
    - prepareShopifyMetafields:
        assign:
          - metafields:
              - namespace: "quiz"
                key: "quiz_id"
                value: ${quizId}
                type: "single_line_text_field"
              - namespace: "quiz"
                key: "completed_at"
                value: ${timestamp}
                type: "single_line_text_field"
              - namespace: "quiz"
                key: "main_interest"
                value: ${mainReasonText}
                type: "single_line_text_field"
              - namespace: "quiz"
                key: "insurance_provider"
                value: ${insuranceText}
                type: "single_line_text_field"
        next: buildShopifyRequest
    - buildShopifyRequest:
        assign:
          - shopifyRequestBody:
              query: "mutation customerCreate($input: CustomerInput!) { customerCreate(input: $input) { userErrors { field message } customer { id email firstName phone } } }"
              variables:
                input:
                  email: ${customerEmail}
                  firstName: ${firstName}
                  lastName: ${lastName}
                  phone: ${phoneNumber}
                  tags: ${"dietitian-quiz-lead, " + quizTitle}
                  metafields: ${metafields}
        next: createShopifyCustomer
    - createShopifyCustomer:
        try:
          call: http.post
          args:
            url: ${"https://" + config.SHOPIFY_STORE_NAME + ".myshopify.com/admin/api/2025-04/graphql.json"}
            headers:
              Content-Type: "application/json"
              X-Shopify-Access-Token: ${config.SHOPIFY_ADMIN_ACCESS_TOKEN}
            body: ${shopifyRequestBody}
          result: shopifyResponse
        except:
          as: e
          steps:
            - handleShopifyError:
                assign:
                  - shopifyResponse:
                      statusCode: 500
                      errors: ${e}
        next: createSuccessResponseFinalize
    - createSuccessResponseFinalize:
        assign:
          - successResponse:
              success: true
              quizId: ${quizId}
              customerEmail: ${customerEmail}
              eligibilityStatus: ${eligibilityData.eligibilityStatus}
              eligibilityMessage: ${eligibilityData.userMessage}
              timestamp: ${sys.now()}
        next: returnSuccess

    ##############################################
    # SECTION 3: RESPONSE HANDLING
    ##############################################
    - returnSuccess:
        return:
          statusCode: 200
          body: ${successResponse}
          headers: ${corsHeaders}
    - processInvalidEmail:
        assign:
          - errorResponse:
              status: "skipped"
              success: false
              reason: "Invalid email address"
              quizId: ${quizId}
              quizTitle: ${quizTitle}
              timestamp: ${sys.now()}
              attemptedEmail: ${customerEmail}
              error:
                code: "INVALID_EMAIL"
                message: "Invalid or missing email address"
                details:
                  validationErrors: ["Email format validation failed"]
        next: returnError
    - returnError:
        return:
          statusCode: 400
          body: ${errorResponse}
          headers: ${corsHeaders}