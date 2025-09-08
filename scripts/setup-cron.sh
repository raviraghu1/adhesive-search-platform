#!/bin/bash

# Setup script for daily sync cron job
# This script sets up automatic daily synchronization of the knowledge base

echo "🔧 Setting up Daily Sync Cron Job"
echo "================================="

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Create logs directory
mkdir -p "$PROJECT_DIR/logs"
mkdir -p "$PROJECT_DIR/data/updates"
mkdir -p "$PROJECT_DIR/data/documents"
mkdir -p "$PROJECT_DIR/data/archive"

echo "✅ Created required directories"

# Create cron job script
cat > "$SCRIPT_DIR/run-daily-sync.sh" << 'EOF'
#!/bin/bash

# Daily sync runner script
# This script is called by cron to run the daily sync

# Set up environment
export NODE_ENV=production
export PATH=/usr/local/bin:/usr/bin:/bin

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to project directory
cd "$PROJECT_DIR"

# Log file
LOG_FILE="$PROJECT_DIR/logs/cron_$(date +%Y%m%d).log"

echo "========================================" >> "$LOG_FILE"
echo "Daily Sync Started: $(date)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Run the daily sync
/usr/local/bin/node "$SCRIPT_DIR/daily-sync.js" >> "$LOG_FILE" 2>&1

# Check exit status
if [ $? -eq 0 ]; then
    echo "✅ Daily sync completed successfully at $(date)" >> "$LOG_FILE"
else
    echo "❌ Daily sync failed at $(date)" >> "$LOG_FILE"
fi

echo "" >> "$LOG_FILE"
EOF

# Make the script executable
chmod +x "$SCRIPT_DIR/run-daily-sync.sh"
echo "✅ Created run-daily-sync.sh script"

# Function to add cron job
add_cron_job() {
    local schedule="$1"
    local description="$2"
    
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "run-daily-sync.sh"; then
        echo "⚠️  Cron job already exists. Updating..."
        # Remove existing job
        (crontab -l 2>/dev/null | grep -v "run-daily-sync.sh") | crontab -
    fi
    
    # Add new cron job
    (crontab -l 2>/dev/null; echo "# $description"; echo "$schedule $SCRIPT_DIR/run-daily-sync.sh") | crontab -
    
    echo "✅ Cron job added: $description"
    echo "   Schedule: $schedule"
}

# Ask user for schedule preference
echo ""
echo "Choose sync schedule:"
echo "1. Daily at 2:00 AM"
echo "2. Daily at 6:00 AM"
echo "3. Every 6 hours"
echo "4. Every hour (for testing)"
echo "5. Custom schedule"
echo ""
read -p "Enter choice (1-5): " choice

case $choice in
    1)
        add_cron_job "0 2 * * *" "Daily sync at 2:00 AM"
        ;;
    2)
        add_cron_job "0 6 * * *" "Daily sync at 6:00 AM"
        ;;
    3)
        add_cron_job "0 */6 * * *" "Sync every 6 hours"
        ;;
    4)
        add_cron_job "0 * * * *" "Hourly sync (testing)"
        ;;
    5)
        echo "Enter custom cron schedule (e.g., '0 3 * * *' for 3:00 AM daily):"
        read -p "Schedule: " custom_schedule
        add_cron_job "$custom_schedule" "Custom schedule"
        ;;
    *)
        echo "Invalid choice. Using default (daily at 2:00 AM)"
        add_cron_job "0 2 * * *" "Daily sync at 2:00 AM"
        ;;
esac

# Create systemd service (optional - for Linux systems)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo ""
    read -p "Do you want to create a systemd timer as well? (y/n): " create_systemd
    
    if [[ "$create_systemd" == "y" ]]; then
        sudo cat > /etc/systemd/system/adhesive-sync.service << EOF
[Unit]
Description=PDS Adhesive Knowledge Base Daily Sync
After=network.target

[Service]
Type=oneshot
User=$USER
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/local/bin/node $SCRIPT_DIR/daily-sync.js
StandardOutput=append:$PROJECT_DIR/logs/systemd-sync.log
StandardError=append:$PROJECT_DIR/logs/systemd-sync.log

[Install]
WantedBy=multi-user.target
EOF

        sudo cat > /etc/systemd/system/adhesive-sync.timer << EOF
[Unit]
Description=Run PDS Adhesive Sync Daily
Requires=adhesive-sync.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

        sudo systemctl daemon-reload
        sudo systemctl enable adhesive-sync.timer
        sudo systemctl start adhesive-sync.timer
        
        echo "✅ Systemd timer created and enabled"
    fi
fi

# Show current cron jobs
echo ""
echo "Current cron jobs:"
echo "=================="
crontab -l 2>/dev/null | grep -A1 -B1 "daily-sync" || echo "No sync jobs found"

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Notes:"
echo "   - Logs will be saved to: $PROJECT_DIR/logs/"
echo "   - Place update files in: $PROJECT_DIR/data/updates/"
echo "   - Processed files will be archived to: $PROJECT_DIR/data/archive/"
echo "   - To manually run sync: node $SCRIPT_DIR/daily-sync.js"
echo "   - To view cron jobs: crontab -l"
echo "   - To remove cron job: crontab -e (and delete the line)"
echo ""