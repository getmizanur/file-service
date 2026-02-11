#!/bin/bash
set -euo pipefail

###############################################################################
# 10-Minute Sync Cronjob (Without CloudFront Invalidation)
#
# This script builds the static site and syncs to S3 with short cache headers
# It does NOT invalidate CloudFront cache - that's handled by the hourly job
#
# Usage:
#   ./cronjob-sync-10min.sh
#
# Crontab entry (every 10 minutes):
#   */10 * * * * /Users/mizanurrahman/Workshop/Platforms/node/18.7/backup/dailypolitics-cms/scripts/cronjob-sync-10min.sh
#
# Cache Strategy:
#   - All files: max-age=600 (10 minutes)
#   - CloudFront invalidation runs separately every hour
###############################################################################

# Builds and syncs can sometimes run longer than 10 minutes. Overlaps cause weird partial
# uploads and race conditions.
LOCKDIR="/tmp/dailypolitics-sync.lockdir"
if ! mkdir "$LOCKDIR" 2>/dev/null; then
  exit 0
fi
trap 'rmdir "$LOCKDIR" 2>/dev/null || true' EXIT

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to project directory
cd "$PROJECT_ROOT"

# Create logs directory if it doesn't exist
LOG_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOG_DIR"

# Log file with date
LOG_FILE="$LOG_DIR/sync-10min-$(date +%Y%m%d).log"

# Ensure AWS credentials are available for cron
export AWS_CONFIG_FILE="${AWS_CONFIG_FILE:-$HOME/.aws/config}"
export AWS_SHARED_CREDENTIALS_FILE="${AWS_SHARED_CREDENTIALS_FILE:-$HOME/.aws/credentials}"

# Load environment variables from .env if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$PROJECT_ROOT/.env"
  set +a
fi

# Function to log with timestamp
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Start sync
log "========================================="
log "10-minute sync started"
log "========================================="

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    log "ERROR: Node.js is not available in PATH"
    log "Trying to use nvm..."

    # Try to load nvm
    if [ -f "$HOME/.nvm/nvm.sh" ]; then
        source "$HOME/.nvm/nvm.sh"
        log "NVM loaded successfully"
    else
        log "ERROR: NVM not found. Cannot proceed."
        exit 1
    fi
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    log "ERROR: npm is not available in PATH"
    exit 1
fi

log "Node version: $(node --version)"
log "NPM version: $(npm --version)"

# Build static site
log "Building static site..."
npm run build >> "$LOG_FILE" 2>&1
BUILD_EXIT=$?

if [ $BUILD_EXIT -ne 0 ]; then
    log "ERROR: Build failed with exit code $BUILD_EXIT"
    log "========================================="
    exit $BUILD_EXIT
fi

log "Build completed successfully"

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    log "ERROR: AWS CLI is not available in PATH"
    log "========================================="
    exit 1
fi

log "AWS CLI version: $(aws --version 2>&1)"

# Check if S3 bucket is configured
if [ -z "$AWS_S3_BUCKET" ]; then
    log "ERROR: AWS_S3_BUCKET environment variable is not set"
    log "========================================="
    exit 1
fi

# Set default region if not provided
AWS_REGION="${AWS_REGION:-us-east-1}"

STATIC_DIR="$PROJECT_ROOT/static-site"

# Check if static-site directory exists
if [ ! -d "$STATIC_DIR" ]; then
    log "ERROR: Static site directory not found: $STATIC_DIR"
    log "========================================="
    exit 1
fi

if [ ! -f "$STATIC_DIR/index.html" ]; then
  log "ERROR: $STATIC_DIR/index.html not found — refusing to sync with --delete"
  exit 1
fi

log "Syncing to S3..."
log "Source: $STATIC_DIR"
log "Destination: s3://$AWS_S3_BUCKET"
log "Region: $AWS_REGION"
log "Cache-Control: public, max-age=600 (10 minutes)"

# Build AWS CLI command
# Add profile if specified
# Add region
AWS_CMD=(aws s3 sync)
[ -n "${AWS_PROFILE:-}" ] && AWS_CMD+=(--profile "$AWS_PROFILE")
AWS_CMD+=(--region "$AWS_REGION")

"${AWS_CMD[@]}" "$STATIC_DIR/" "s3://$AWS_S3_BUCKET/" \
    --delete \
    --exclude ".DS_Store" \
    --exclude "*.log" \
    --exclude ".gitkeep" \
    --cache-control "public,max-age=600" \
    --metadata-directive REPLACE >> "$LOG_FILE" 2>&1

SYNC_EXIT=$?

if [ $SYNC_EXIT -ne 0 ]; then
    log "ERROR: S3 sync failed with exit code $SYNC_EXIT"
    log "========================================="
    exit $SYNC_EXIT
fi

log "S3 sync completed successfully"
log "Note: CloudFront invalidation runs separately via hourly cronjob"
log "========================================="

# Clean up old log files (keep last 30 days)
find "$LOG_DIR" -name "sync-10min-*.log" -mtime +30 -delete

exit 0
