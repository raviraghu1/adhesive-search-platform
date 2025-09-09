#!/bin/bash

# Setup Script for Search Index Rebuild Cron Job
# Schedules the rebuild to run twice daily at 6 AM and 6 PM

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${GREEN}Setting up Search Index Rebuild Cron Job${NC}"
echo "================================================"

# Check if running on macOS or Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${YELLOW}Detected macOS system${NC}"
    CRON_CMD="crontab"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo -e "${YELLOW}Detected Linux system${NC}"
    CRON_CMD="crontab"
else
    echo -e "${RED}Unsupported operating system: $OSTYPE${NC}"
    exit 1
fi

# Create the cron job entries
CRON_ENTRY_1="0 6 * * * cd $PROJECT_DIR && /usr/local/bin/node scripts/rebuild-search-index.js >> logs/search-rebuild-cron.log 2>&1"
CRON_ENTRY_2="0 18 * * * cd $PROJECT_DIR && /usr/local/bin/node scripts/rebuild-search-index.js >> logs/search-rebuild-cron.log 2>&1"

# Function to add cron job
add_cron_job() {
    local entry="$1"
    
    # Check if cron job already exists
    if $CRON_CMD -l 2>/dev/null | grep -F "$entry" > /dev/null; then
        echo -e "${YELLOW}Cron job already exists: Skipping${NC}"
        echo "  $entry"
    else
        # Add the cron job
        ($CRON_CMD -l 2>/dev/null || true; echo "$entry") | $CRON_CMD -
        echo -e "${GREEN}Added cron job:${NC}"
        echo "  $entry"
    fi
}

# Add both cron jobs
echo ""
echo "Adding cron jobs for 6 AM and 6 PM daily rebuilds..."
add_cron_job "$CRON_ENTRY_1"
add_cron_job "$CRON_ENTRY_2"

# Create log directory if it doesn't exist
LOG_DIR="$PROJECT_DIR/logs"
if [ ! -d "$LOG_DIR" ]; then
    mkdir -p "$LOG_DIR"
    echo -e "${GREEN}Created log directory: $LOG_DIR${NC}"
fi

# Create initial log file
LOG_FILE="$LOG_DIR/search-rebuild-cron.log"
if [ ! -f "$LOG_FILE" ]; then
    touch "$LOG_FILE"
    echo "Search Index Rebuild Cron Log" > "$LOG_FILE"
    echo "=============================" >> "$LOG_FILE"
    echo "Created: $(date)" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
    echo -e "${GREEN}Created log file: $LOG_FILE${NC}"
fi

# Make the rebuild script executable
REBUILD_SCRIPT="$PROJECT_DIR/scripts/rebuild-search-index.js"
if [ -f "$REBUILD_SCRIPT" ]; then
    chmod +x "$REBUILD_SCRIPT"
    echo -e "${GREEN}Made rebuild script executable${NC}"
fi

# Test the rebuild script
echo ""
echo "Testing rebuild script..."
if node "$REBUILD_SCRIPT" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Rebuild script test successful${NC}"
else
    echo -e "${YELLOW}⚠ Rebuild script test failed - please check the script${NC}"
fi

# Display current crontab
echo ""
echo "Current cron jobs for search rebuild:"
echo "--------------------------------------"
$CRON_CMD -l 2>/dev/null | grep "rebuild-search-index" || echo "No search rebuild jobs found"

echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "The search index will be rebuilt automatically:"
echo "  • 6:00 AM daily"
echo "  • 6:00 PM daily"
echo ""
echo "Logs will be written to:"
echo "  $LOG_FILE"
echo ""
echo "To monitor the cron job:"
echo "  tail -f $LOG_FILE"
echo ""
echo "To view cron job status:"
echo "  crontab -l | grep rebuild-search"
echo ""
echo "To remove the cron jobs:"
echo "  crontab -e  # Then delete the relevant lines"
echo ""
echo "To manually run the rebuild:"
echo "  node $REBUILD_SCRIPT"