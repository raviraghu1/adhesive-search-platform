#!/bin/bash

# Setup script for Auto-Refresh cron job
# Configures automatic refresh every 20 minutes

echo "🔄 Setting up Auto-Refresh for Knowledge Base"
echo "=============================================="

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Function to add cron job
add_refresh_cron() {
    local schedule="$1"
    local command="$2"
    local description="$3"
    
    # Check if job already exists
    if crontab -l 2>/dev/null | grep -q "auto-refresh.js"; then
        echo "⚠️  Auto-refresh cron job already exists. Removing old entry..."
        # Remove existing auto-refresh jobs
        crontab -l 2>/dev/null | grep -v "auto-refresh.js" | crontab -
    fi
    
    # Add new cron job
    (crontab -l 2>/dev/null; echo "# $description"; echo "$schedule $command") | crontab -
    
    echo "✅ Added cron job: $description"
    echo "   Schedule: $schedule"
}

# Create log directory if it doesn't exist
mkdir -p "$PROJECT_DIR/logs"

echo ""
echo "Select refresh mode:"
echo "1) Run as daemon (continuous process with 20-minute intervals)"
echo "2) Use cron job (runs every 20 minutes)"
echo "3) Both (daemon with cron backup)"
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Starting auto-refresh as daemon..."
        
        # Create systemd service for Linux or launch agent for macOS
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux systemd service
            sudo cat > /etc/systemd/system/kb-auto-refresh.service << EOF
[Unit]
Description=Knowledge Base Auto-Refresh Service
After=network.target mongodb.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/local/bin/node $SCRIPT_DIR/auto-refresh.js daemon
Restart=always
RestartSec=10
StandardOutput=append:$PROJECT_DIR/logs/auto-refresh.log
StandardError=append:$PROJECT_DIR/logs/auto-refresh.log

[Install]
WantedBy=multi-user.target
EOF
            
            sudo systemctl daemon-reload
            sudo systemctl enable kb-auto-refresh.service
            sudo systemctl start kb-auto-refresh.service
            
            echo "✅ Systemd service created and started"
            echo "   Check status: sudo systemctl status kb-auto-refresh"
            echo "   View logs: tail -f $PROJECT_DIR/logs/auto-refresh.log"
            
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS Launch Agent
            cat > ~/Library/LaunchAgents/com.adhesive.kb-refresh.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.adhesive.kb-refresh</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>$SCRIPT_DIR/auto-refresh.js</string>
        <string>daemon</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$PROJECT_DIR</string>
    <key>StandardOutPath</key>
    <string>$PROJECT_DIR/logs/auto-refresh.log</string>
    <key>StandardErrorPath</key>
    <string>$PROJECT_DIR/logs/auto-refresh.log</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF
            
            launchctl load ~/Library/LaunchAgents/com.adhesive.kb-refresh.plist
            launchctl start com.adhesive.kb-refresh
            
            echo "✅ Launch Agent created and started"
            echo "   Check status: launchctl list | grep adhesive"
            echo "   View logs: tail -f $PROJECT_DIR/logs/auto-refresh.log"
        else
            # Fallback: run in background
            nohup node "$SCRIPT_DIR/auto-refresh.js" daemon >> "$PROJECT_DIR/logs/auto-refresh.log" 2>&1 &
            echo $! > "$PROJECT_DIR/auto-refresh.pid"
            echo "✅ Started as background process (PID: $(cat $PROJECT_DIR/auto-refresh.pid))"
        fi
        ;;
        
    2)
        echo ""
        echo "📅 Setting up cron job for auto-refresh..."
        
        # Add cron job for every 20 minutes
        CRON_CMD="cd $PROJECT_DIR && /usr/local/bin/node $SCRIPT_DIR/auto-refresh.js once >> $PROJECT_DIR/logs/auto-refresh-cron.log 2>&1"
        add_refresh_cron "*/20 * * * *" "$CRON_CMD" "KB Auto-Refresh - Every 20 minutes"
        ;;
        
    3)
        echo ""
        echo "🔄 Setting up both daemon and cron backup..."
        
        # Start daemon
        nohup node "$SCRIPT_DIR/auto-refresh.js" daemon >> "$PROJECT_DIR/logs/auto-refresh.log" 2>&1 &
        echo $! > "$PROJECT_DIR/auto-refresh.pid"
        echo "✅ Started daemon (PID: $(cat $PROJECT_DIR/auto-refresh.pid))"
        
        # Add cron as backup
        CRON_CMD="cd $PROJECT_DIR && /usr/local/bin/node $SCRIPT_DIR/auto-refresh.js once >> $PROJECT_DIR/logs/auto-refresh-cron.log 2>&1"
        add_refresh_cron "*/20 * * * *" "$CRON_CMD" "KB Auto-Refresh Backup - Every 20 minutes"
        ;;
        
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

# Show current cron jobs
echo ""
echo "Current Auto-Refresh Jobs:"
echo "=========================="
crontab -l 2>/dev/null | grep -A1 -B1 "auto-refresh" || echo "No cron jobs set"

echo ""
echo "✅ Auto-Refresh Setup Complete!"
echo ""
echo "📝 Management Commands:"
echo "   • Test once: node scripts/auto-refresh.js once"
echo "   • Run daemon: node scripts/auto-refresh.js daemon"
echo "   • Check logs: tail -f logs/auto-refresh*.log"
echo "   • View cron: crontab -l | grep auto-refresh"
echo ""
echo "🔍 The system will check for changes every 20 minutes and:"
echo "   • Detect modified products and documents"
echo "   • Update the knowledge base automatically"
echo "   • Create snapshots after significant changes"
echo "   • Archive old history when needed"
echo ""