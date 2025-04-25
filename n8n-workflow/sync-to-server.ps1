# Sync-n8n-workflow.ps1
param(
    [string]$ApiKey,
    [string]$ApiUrl = "https://n8n.curalife.com/api/v1",
    [string]$WorkflowFile = "./n8n-workflow/quiz-data-processor.json",
    [string]$EnvFile = "./.env"
)

# Function to load environment variables from .env file
function Load-EnvFile {
    param([string]$EnvPath)

    if (Test-Path $EnvPath) {
        Write-Host "Loading API key from $EnvPath" -ForegroundColor Cyan
        Get-Content $EnvPath | ForEach-Object {
            if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
                $key = $matches[1].Trim()
                $value = $matches[2].Trim()
                # Remove quotes if present
                if ($value -match '^"(.*)"$' -or $value -match "^'(.*)'$") {
                    $value = $matches[1]
                }
                Set-Variable -Name $key -Value $value -Scope Script
            }
        }
        return $true
    }
    return $false
}

# Try to get API key from parameter, then env file, then prompt user
if (-not $ApiKey) {
    # Try to load from .env file
    if (Load-EnvFile -EnvPath $EnvFile) {
        $ApiKey = $N8N_API_KEY
    }

    # If still no API key, prompt the user
    if (-not $ApiKey) {
        $ApiKey = Read-Host -Prompt "Enter your n8n API key"
    }
}

# Check if we have an API key
if (-not $ApiKey) {
    Write-Host "Error: No API key provided." -ForegroundColor Red
    Write-Host "You can:" -ForegroundColor Yellow
    Write-Host "1. Pass it as parameter: -ApiKey 'your-key'" -ForegroundColor Yellow
    Write-Host "2. Create a .env file with N8N_API_KEY=your-key" -ForegroundColor Yellow
    Write-Host "3. Enter it when prompted" -ForegroundColor Yellow
    exit 1
}

# Check if workflow file exists
if (-not (Test-Path $WorkflowFile)) {
    Write-Host "Error: Workflow file not found at $WorkflowFile" -ForegroundColor Red
    exit 1
}

# Read the workflow file content and parse JSON
$workflowJson = Get-Content -Path $WorkflowFile -Raw | ConvertFrom-Json
$workflowName = $workflowJson.name

# Common headers for API requests
$headers = @{
    "X-N8N-API-KEY" = $ApiKey
    "Content-Type" = "application/json"
}

Write-Host "Preparing to sync workflow: $workflowName" -ForegroundColor Cyan

# Try to find if workflow already exists
try {
    # Get all workflows
    $allWorkflows = Invoke-RestMethod -Uri "$ApiUrl/workflows" -Method GET -Headers $headers

    # Look for workflow with matching name
    $existingWorkflow = $allWorkflows.data | Where-Object { $_.name -eq $workflowName }

    # Prepare workflow data for API
    $workflowData = @{
        name = $workflowJson.name
        nodes = $workflowJson.nodes
        connections = $workflowJson.connections
        settings = $workflowJson.settings
    } | ConvertTo-Json -Depth 10

    if ($existingWorkflow) {
        $workflowId = $existingWorkflow.id
        Write-Host "Found existing workflow with ID: $workflowId" -ForegroundColor Yellow

        # If workflow is active, deactivate it first
        if ($existingWorkflow.active) {
            Write-Host "Deactivating workflow before update..." -ForegroundColor Yellow
            $deactivateBody = '{"active": false}'
            Invoke-RestMethod -Uri "$ApiUrl/workflows/$workflowId/activate" -Method POST -Headers $headers -Body $deactivateBody | Out-Null
        }

        # Update existing workflow
        Write-Host "Updating workflow..." -ForegroundColor Yellow
        Invoke-RestMethod -Uri "$ApiUrl/workflows/$workflowId" -Method PUT -Headers $headers -Body $workflowData | Out-Null

        # Reactivate the workflow
        Write-Host "Reactivating workflow..." -ForegroundColor Yellow
        $activateBody = '{"active": true}'
        Invoke-RestMethod -Uri "$ApiUrl/workflows/$workflowId/activate" -Method POST -Headers $headers -Body $activateBody | Out-Null

        Write-Host "Workflow updated successfully!" -ForegroundColor Green
    }
    else {
        # Create new workflow
        Write-Host "No existing workflow found. Creating new workflow..." -ForegroundColor Yellow
        $newWorkflow = Invoke-RestMethod -Uri "$ApiUrl/workflows" -Method POST -Headers $headers -Body $workflowData
        $workflowId = $newWorkflow.id

        # Activate the workflow
        Write-Host "Activating new workflow..." -ForegroundColor Yellow
        $activateBody = '{"active": true}'
        Invoke-RestMethod -Uri "$ApiUrl/workflows/$workflowId/activate" -Method POST -Headers $headers -Body $activateBody | Out-Null

        Write-Host "Workflow created successfully with ID: $workflowId" -ForegroundColor Green
    }

    # Find webhook URL
    $webhookNode = $workflowJson.nodes | Where-Object { $_.type -eq "n8n-nodes-base.webhook" }
    if ($webhookNode) {
        $webhookPath = $webhookNode.parameters.path
        Write-Host "Webhook URL: $ApiUrl/webhook/$webhookPath" -ForegroundColor Cyan
    }
}
catch {
    Write-Host "Error syncing workflow: $_" -ForegroundColor Red
    $errorDetails = $_.ErrorDetails.Message
    if ($errorDetails) {
        Write-Host "Details: $errorDetails" -ForegroundColor Red
    }
    exit 1
}