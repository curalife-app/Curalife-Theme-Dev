param(
    [string]$ApiUrl = "https://n8n.curalife.com/api/v1",
    [string]$WorkflowFile = "./n8n-workflow/quiz-data-processor.json",
    [string]$ApiKey = $env:N8N_API_KEY
)

# Check if API key is provided
if (-not $ApiKey) {
    Write-Host "Error: N8N API key not found. Please set the N8N_API_KEY environment variable or provide it as a parameter." -ForegroundColor Red
    Write-Host "Example: $env:N8N_API_KEY = 'your-api-key'" -ForegroundColor Yellow
    exit 1
}

# Check if workflow file exists
if (-not (Test-Path $WorkflowFile)) {
    Write-Host "Error: Workflow file not found at $WorkflowFile" -ForegroundColor Red
    exit 1
}

# Read the workflow file content
$workflowContent = Get-Content -Path $WorkflowFile -Raw | ConvertFrom-Json

# Get workflow name from the file
$workflowName = $workflowContent.name

Write-Host "Preparing to sync workflow: $workflowName" -ForegroundColor Cyan

# Function to check if workflow exists on the server
function Get-Workflow {
    param(
        [string]$Name
    )

    try {
        # Get all workflows from the server
        $response = Invoke-RestMethod -Uri "$ApiUrl/workflows" -Method GET -Headers @{
            "X-N8N-API-KEY" = $ApiKey
        }

        # Find workflow by name
        $workflow = $response.data | Where-Object { $_.name -eq $Name }
        return $workflow
    }
    catch {
        Write-Host "Error checking for existing workflow: $_" -ForegroundColor Red
        return $null
    }
}

# Function to create a new workflow
function New-Workflow {
    param(
        [PSCustomObject]$Workflow
    )

    try {
        # Create request body - remove tags as they are read-only
        $body = @{
            name = $Workflow.name
            nodes = $Workflow.nodes
            connections = $Workflow.connections
            settings = $Workflow.settings
            # Removed tags field as it's read-only
        } | ConvertTo-Json -Depth 10

        # Create new workflow on the server
        $response = Invoke-RestMethod -Uri "$ApiUrl/workflows" -Method POST -Headers @{
            "X-N8N-API-KEY" = $ApiKey
            "Content-Type" = "application/json"
        } -Body $body

        Write-Host "Created new workflow with ID: $($response.id)" -ForegroundColor Green
        return $response.id
    }
    catch {
        Write-Host "Error creating workflow: $_" -ForegroundColor Red
        return $null
    }
}

# Function to update an existing workflow
function Update-Workflow {
    param(
        [string]$Id,
        [PSCustomObject]$Workflow
    )

    try {
        # Create request body - remove tags as they are read-only
        $body = @{
            name = $Workflow.name
            nodes = $Workflow.nodes
            connections = $Workflow.connections
            settings = $Workflow.settings
            # Removed tags field as it's read-only
        } | ConvertTo-Json -Depth 10

        # Update existing workflow on the server
        $response = Invoke-RestMethod -Uri "$ApiUrl/workflows/$Id" -Method PUT -Headers @{
            "X-N8N-API-KEY" = $ApiKey
            "Content-Type" = "application/json"
        } -Body $body

        Write-Host "Updated workflow with ID: $Id" -ForegroundColor Green
        return $Id
    }
    catch {
        Write-Host "Error updating workflow: $_" -ForegroundColor Red
        return $null
    }
}

# Function to activate the workflow
function Set-WorkflowActivation {
    param(
        [string]$Id,
        [bool]$Active = $true
    )

    try {
        # Create request body
        $body = @{
            active = $Active
        } | ConvertTo-Json

        # Update workflow activation status
        $response = Invoke-RestMethod -Uri "$ApiUrl/workflows/$Id/activate" -Method POST -Headers @{
            "X-N8N-API-KEY" = $ApiKey
            "Content-Type" = "application/json"
        } -Body $body

        $status = if ($Active) { "activated" } else { "deactivated" }
        Write-Host "Workflow $status successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "Error changing workflow activation status: $_" -ForegroundColor Red
    }
}

# Main script logic
$existingWorkflow = Get-Workflow -Name $workflowName
$workflowId = $null

if ($existingWorkflow) {
    Write-Host "Found existing workflow with ID: $($existingWorkflow.id)" -ForegroundColor Yellow

    # Check if workflow is active
    $isActive = $existingWorkflow.active

    # If active, deactivate it first (required for update)
    if ($isActive) {
        Write-Host "Deactivating workflow before update..." -ForegroundColor Yellow
        Set-WorkflowActivation -Id $existingWorkflow.id -Active $false
    }

    # Update the existing workflow
    $workflowId = Update-Workflow -Id $existingWorkflow.id -Workflow $workflowContent

    # If it was active, reactivate it
    if ($isActive -and $workflowId) {
        Write-Host "Reactivating workflow after update..." -ForegroundColor Yellow
        Set-WorkflowActivation -Id $workflowId -Active $true
    }
}
else {
    Write-Host "No existing workflow found with name: $workflowName" -ForegroundColor Yellow
    # Create a new workflow
    $workflowId = New-Workflow -Workflow $workflowContent

    # Activate the new workflow
    if ($workflowId) {
        Write-Host "Activating new workflow..." -ForegroundColor Yellow
        Set-WorkflowActivation -Id $workflowId -Active $true
    }
}

if ($workflowId) {
    Write-Host "Workflow sync completed successfully!" -ForegroundColor Green
    Write-Host "Webhook URL: $ApiUrl/webhook/$($workflowContent.nodes | Where-Object { $_.type -eq 'n8n-nodes-base.webhook' } | ForEach-Object { $_.parameters.path })" -ForegroundColor Cyan
}
else {
    Write-Host "Failed to sync workflow to server." -ForegroundColor Red
}