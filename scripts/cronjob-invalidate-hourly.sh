#!/bin/bash

###############################################################################
# Hourly CloudFront Cache Invalidation
#
# This script ONLY invalidates CloudFront cache
# It does NOT build or sync files - that's handled by the 10-minute sync job
#
# Usage:
#   ./cronjob-invalidate-hourly.sh [distribution-id]
#
# Crontab entry (every hour):
#   0 * * * * /Users/mizanurrahman/Workshop/Platforms/node/18.7/backup/dailypolitics-cms/scripts/cronjob-invalidate-hourly.sh
#
# CloudFront Distribution ID Priority:
#   1. Command line argument: ./cronjob-invalidate-hourly.sh E1VSD95WQ4F48Y
#   2. Environment variable: CLOUDFRONT_DISTRIBUTION_ID=E1VSD95WQ4F48Y
#   3. Default: E1VSD95WQ4F48Y
###############################################################################

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# CloudFront Distribution ID (priority: CLI arg > env var > default)
CLOUDFRONT_DISTRIBUTION_ID="${1:-${CLOUDFRONT_DISTRIBUTION_ID:-E1VSD95WQ4F48Y}}"

# Change to project directory
cd "$PROJECT_ROOT"

# Create logs directory if it doesn't exist
LOG_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOG_DIR"

# Log file with date
LOG_FILE="$LOG_DIR/invalidate-hourly-$(date +%Y%m%d).log"

# Ensure AWS credentials are available for cron
export AWS_CONFIG_FILE="${AWS_CONFIG_FILE:-$HOME/.aws/config}"
export AWS_SHARED_CREDENTIALS_FILE="${AWS_SHARED_CREDENTIALS_FILE:-$HOME/.aws/credentials}"

# Load environment variables from .env if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    # Export only AWS-related variables
    export $(grep -E '^AWS_|^CLOUDFRONT_' "$PROJECT_ROOT/.env" | xargs)
fi

# Function to log with timestamp
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Start invalidation
log "========================================="
log "CloudFront cache invalidation started"
log "========================================="

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    log "ERROR: AWS CLI is not available in PATH"
    log "========================================="
    exit 1
fi

log "AWS CLI version: $(aws --version 2>&1)"

# Invalidate CloudFront cache
log "Distribution ID: $CLOUDFRONT_DISTRIBUTION_ID"
log "Paths: /*"

# Build AWS CLI command
INVALIDATION_CMD="aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths '/*'"

# Add profile if specified
if [ -n "$AWS_PROFILE" ]; then
    INVALIDATION_CMD="$INVALIDATION_CMD --profile $AWS_PROFILE"
fi

# Execute invalidation
eval $INVALIDATION_CMD >> "$LOG_FILE" 2>&1
INVALIDATION_EXIT=$?

if [ $INVALIDATION_EXIT -ne 0 ]; then
    log "ERROR: CloudFront invalidation failed with exit code $INVALIDATION_EXIT"
    log "========================================="
    exit $INVALIDATION_EXIT
fi

log "CloudFront cache invalidation completed successfully"
log "Note: Invalidation may take a few minutes to propagate globally"
log "========================================="

# Clean up old log files (keep last 30 days)
find "$LOG_DIR" -name "invalidate-hourly-*.log" -mtime +30 -delete

exit 0
