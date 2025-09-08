#!/bin/bash

# Setup script for Knowledge Base maintenance cron jobs
# This script sets up automatic maintenance for state management

echo "🔧 Setting up Knowledge Base Maintenance Cron Jobs"
echo "================================================="

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Create cron runner script
cat > "$SCRIPT_DIR/run-kb-maintenance.sh" << 'EOF'
#!/bin/bash

# Knowledge Base maintenance runner script
# Called by cron at different intervals

# Set up environment
export NODE_ENV=production
export PATH=/usr/local/bin:/usr/bin:/bin

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to project directory
cd "$PROJECT_DIR"

# Task type passed as argument
TASK_TYPE=$1

# Log file based on task type
LOG_FILE="$PROJECT_DIR/logs/kb_maintenance_${TASK_TYPE}_$(date +%Y%m%d).log"

echo "========================================" >> "$LOG_FILE"
echo "KB Maintenance ($TASK_TYPE) Started: $(date)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Run the maintenance script
/usr/local/bin/node "$SCRIPT_DIR/kb-maintenance.js" "$TASK_TYPE" >> "$LOG_FILE" 2>&1

# Check exit status
if [ $? -eq 0 ]; then
    echo "✅ KB maintenance ($TASK_TYPE) completed successfully at $(date)" >> "$LOG_FILE"
else
    echo "❌ KB maintenance ($TASK_TYPE) failed at $(date)" >> "$LOG_FILE"
fi

echo "" >> "$LOG_FILE"
EOF

# Make the script executable
chmod +x "$SCRIPT_DIR/run-kb-maintenance.sh"
echo "✅ Created run-kb-maintenance.sh script"

# Function to add cron job
add_kb_cron() {
    local schedule="$1"
    local task_type="$2"
    local description="$3"
    
    # Check if this specific job already exists
    if crontab -l 2>/dev/null | grep -q "run-kb-maintenance.sh $task_type"; then
        echo "⚠️  Cron job for $task_type already exists. Skipping..."
        return
    fi
    
    # Add new cron job
    (crontab -l 2>/dev/null; echo "# $description"; echo "$schedule $SCRIPT_DIR/run-kb-maintenance.sh $task_type") | crontab -
    
    echo "✅ Added cron job: $description"
    echo "   Schedule: $schedule"
    echo "   Task: $task_type"
}

# Setup different maintenance schedules
echo ""
echo "Setting up maintenance schedules..."
echo ""

# Hourly maintenance - cache updates, anomaly detection
add_kb_cron "0 * * * *" "hourly" "KB Hourly Maintenance - Cache & Anomaly Detection"

# Daily maintenance - archival, snapshots, reports
add_kb_cron "0 2 * * *" "daily" "KB Daily Maintenance - Archive & Snapshot at 2 AM"

# Weekly maintenance - deep compression, cleanup
add_kb_cron "0 3 * * 0" "weekly" "KB Weekly Maintenance - Deep Compression on Sundays at 3 AM"

# Create systemd service for better reliability (optional for Linux)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo ""
    read -p "Do you want to create systemd timers for more reliable scheduling? (y/n): " create_systemd
    
    if [[ "$create_systemd" == "y" ]]; then
        # Hourly timer
        sudo cat > /etc/systemd/system/kb-maintenance-hourly.service << EOF
[Unit]
Description=Knowledge Base Hourly Maintenance
After=network.target

[Service]
Type=oneshot
User=$USER
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/local/bin/node $SCRIPT_DIR/kb-maintenance.js hourly
StandardOutput=append:$PROJECT_DIR/logs/kb-maintenance-hourly.log
StandardError=append:$PROJECT_DIR/logs/kb-maintenance-hourly.log
EOF

        sudo cat > /etc/systemd/system/kb-maintenance-hourly.timer << EOF
[Unit]
Description=Run KB Hourly Maintenance
Requires=kb-maintenance-hourly.service

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
EOF

        # Daily timer
        sudo cat > /etc/systemd/system/kb-maintenance-daily.service << EOF
[Unit]
Description=Knowledge Base Daily Maintenance
After=network.target

[Service]
Type=oneshot
User=$USER
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/local/bin/node $SCRIPT_DIR/kb-maintenance.js daily
StandardOutput=append:$PROJECT_DIR/logs/kb-maintenance-daily.log
StandardError=append:$PROJECT_DIR/logs/kb-maintenance-daily.log
EOF

        sudo cat > /etc/systemd/system/kb-maintenance-daily.timer << EOF
[Unit]
Description=Run KB Daily Maintenance
Requires=kb-maintenance-daily.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

        # Enable timers
        sudo systemctl daemon-reload
        sudo systemctl enable kb-maintenance-hourly.timer
        sudo systemctl enable kb-maintenance-daily.timer
        sudo systemctl start kb-maintenance-hourly.timer
        sudo systemctl start kb-maintenance-daily.timer
        
        echo "✅ Systemd timers created and enabled"
    fi
fi

# Show current KB maintenance cron jobs
echo ""
echo "Current KB Maintenance Jobs:"
echo "============================"
crontab -l 2>/dev/null | grep -A1 -B1 "kb-maintenance" || echo "No KB maintenance jobs found"

echo ""
echo "✅ Knowledge Base Maintenance Setup Complete!"
echo ""
echo "📝 Maintenance Schedule:"
echo "   • Hourly: Cache updates, anomaly detection"
echo "   • Daily (2 AM): Archive short-term, create snapshots"
echo "   • Weekly (Sunday 3 AM): Deep compression, cleanup"
echo ""
echo "📂 Logs Location: $PROJECT_DIR/logs/"
echo ""
echo "🔧 Manual Commands:"
echo "   • Run hourly: node scripts/kb-maintenance.js hourly"
echo "   • Run daily: node scripts/kb-maintenance.js daily"
echo "   • Run weekly: node scripts/kb-maintenance.js weekly"
echo "   • Run all: node scripts/kb-maintenance.js all"
echo ""