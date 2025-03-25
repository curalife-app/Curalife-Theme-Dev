#!/bin/bash

# This script makes all other scripts in the scripts directory executable

set -e  # Exit immediately if a command exits with a non-zero status

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Making all scripts in $SCRIPT_DIR executable..."

# Make all shell scripts executable
chmod +x "$SCRIPT_DIR"/*.sh

echo "All scripts are now executable."