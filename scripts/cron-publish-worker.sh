#!/bin/bash
#
# Scheduled Post Publish Worker - Cron Script
#
# This script runs the publish worker to process scheduled post publishing jobs.
# It should be executed via cron at regular intervals (e.g., every minute).
#
# Installation:
#   1. Make this script executable: chmod +x scripts/cron-publish-worker.sh
#   2. Add to crontab: crontab -e
#   3. Add line: * * * * * /path/to/dailypolitics-cms/scripts/cron-publish-worker.sh
#
# Example crontab entries:
#   Every minute:    * * * * * /path/to/dailypolitics-cms/scripts/cron-publish-worker.sh
#   Every 5 minutes: */5 * * * * /path/to/dailypolitics-cms/scripts/cron-publish-worker.sh
#
# Environment variables (optional):
#   POLL_INTERVAL_MS  - Polling interval in ms (default: 30000, only used in daemon mode)
#   BATCH_SIZE        - Jobs to process per run (default: 5)
#   STALE_MINUTES     - Minutes before lock is stale (default: 15)
#

# Exit on error
set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Log file location
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/publish-worker.log"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Change to project directory
cd "$PROJECT_DIR"

# Load NVM if available (useful for cron environments)
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    source "$NVM_DIR/nvm.sh"
fi

# Use specific Node version if .nvmrc exists
if [ -f ".nvmrc" ] && command -v nvm &> /dev/null; then
    nvm use 2>/dev/null || true
fi

# Timestamp for logging
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Run the publish worker and log output
{
    echo "[$TIMESTAMP] Starting publish worker..."
    node scripts/publish-worker.js 2>&1
    EXIT_CODE=$?
    echo "[$TIMESTAMP] Publish worker finished with exit code: $EXIT_CODE"
} >> "$LOG_FILE" 2>&1

# Rotate log file if it gets too large (> 10MB)
MAX_LOG_SIZE=$((10 * 1024 * 1024))
if [ -f "$LOG_FILE" ]; then
    LOG_SIZE=$(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)
    if [ "$LOG_SIZE" -gt "$MAX_LOG_SIZE" ]; then
        mv "$LOG_FILE" "$LOG_FILE.old"
        echo "[$TIMESTAMP] Log file rotated" > "$LOG_FILE"
    fi
fi

exit 0
