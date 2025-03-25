#!/bin/bash

# This script generates the main performance dashboard HTML file
# Usage: ./generate-dashboard.sh [CURRENT_DATE]

# Get parameters
CURRENT_DATE=$1

# Exit if required parameters are missing
if [ -z "$CURRENT_DATE" ]; then
  echo "Error: Missing required parameters"
  echo "Usage: ./generate-dashboard.sh [CURRENT_DATE]"
  exit 1
fi

# Create the main index.html file
INDEX_HTML="performance-reports/index.html"
TEMPLATE_DIR="$(dirname "$0")/../templates"
DASHBOARD_TEMPLATE="${TEMPLATE_DIR}/dashboard.template.html"

echo "Creating index HTML file at $INDEX_HTML"

# Create a temporary file to hold dashboard content
DASHBOARD_CONTENT_FILE=$(mktemp)

# Add dashboard content to the temporary file
# This would be the dynamic content that changes with each run
cat > "$DASHBOARD_CONTENT_FILE" << EOF
  <div class="container-fluid">
    <div class="row">
      <div class="col-md-12">
        <div class="card">
          <div class="card-header">
            <h2>Performance Overview</h2>
          </div>
          <div class="card-body">
            <p>Performance data will be displayed here.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
EOF

# Get current year for the footer
CURRENT_YEAR=$(date +"%Y")

# Process the template with variables
cat "$DASHBOARD_TEMPLATE" | \
  sed -e "s|\${CURRENT_DATE}|$CURRENT_DATE|g" \
      -e "s|\${CURRENT_YEAR}|$CURRENT_YEAR|g" \
      -e "/\${DASHBOARD_CONTENT}/r $DASHBOARD_CONTENT_FILE" \
      -e "/\${DASHBOARD_CONTENT}/d" \
  > "$INDEX_HTML"

# Clean up temporary file
rm -f "$DASHBOARD_CONTENT_FILE"

echo "Dashboard HTML generated at $INDEX_HTML"

# Continue with the rest of the script...
# ... existing code ...