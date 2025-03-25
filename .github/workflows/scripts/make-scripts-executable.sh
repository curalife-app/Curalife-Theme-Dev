#!/bin/bash

# This script makes all workflow scripts executable
# It's run at the beginning of the workflow

set -e  # Exit immediately if a command exits with a non-zero status

echo "Making all workflow scripts executable..."

find .github/workflows/scripts -type f -name "*.sh" -exec chmod +x {} \;

# Specifically ensure our new scripts are executable
chmod +x .github/workflows/scripts/store-historical-data.sh || echo "store-historical-data.sh not found"
chmod +x .github/workflows/scripts/generate-trend-dashboard.sh || echo "generate-trend-dashboard.sh not found"

echo "All scripts are now executable."