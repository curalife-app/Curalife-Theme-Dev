# n8n Workflow Sync Tools

This directory contains tools to automatically sync your local workflow files with your n8n server running at n8n.curalife.com.

## Setup

Before using these tools, you need to set up your API key:

1. Log in to your n8n instance at https://n8n.curalife.com
2. Go to Settings → API
3. Create a new API key with appropriate permissions (at minimum: workflow:read, workflow:create, workflow:update, workflow:delete)
4. Save this API key in your environment variables:

```
setx N8N_API_KEY "your-api-key"
```

**Important:** After setting the environment variable, you need to restart your command prompt for the changes to take effect.

## Available Tools

### 1. Sync a Workflow (One-time)

To manually sync your workflow to the server:

```
.\n8n-workflow\sync-workflow.bat
```

This will:

- Check if the workflow already exists on the server
- If it exists, update it
- If it doesn't exist, create it
- Activate the workflow

### 2. Auto-Sync on File Changes

To start a watcher that automatically syncs your workflow whenever you save changes:

```
.\n8n-workflow\start-watching.bat
```

The watcher will:

- Perform an initial sync when started
- Monitor the workflow file for changes
- Automatically sync to the server when changes are detected
- Display colored status messages

To stop watching, press `CTRL+C` in the command window.

## Workflow Configuration

The main workflow file is `quiz-data-processor.json`. This contains the entire n8n workflow for processing quiz submissions.

When editing this file:

1. Make your changes in your preferred text editor
2. Save the file
3. If the watcher is running, your changes will be automatically synced
4. If not, run the sync script manually

## Webhook URL

After syncing, the webhook URL for your quiz will be:

```
https://n8n.curalife.com/webhook/quiz-webhook
```

Use this URL in your Shopify theme by setting the `data-n8n-webhook` attribute in your quiz container.
