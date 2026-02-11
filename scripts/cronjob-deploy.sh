#!/bin/bash

###############################################################################
# Cronjob Deployment Wrapper
#
# This script is designed to be called by cron for automated deployments
# It handles logging, environment setup, error reporting, and CloudFront invalidation
#
# Usage:
#   ./cronjob-deploy.sh [distribution-id]
#
# Usage in crontab:
#   */30 * * * * /path/to/dailypolitics-cms/scripts/cronjob-deploy.sh
#
# Example crontab entries:
#   # Every 30 minutes (uses default or env CLOUDFRONT_DISTRIBUTION_ID)
#   */30 * * * * /Users/mizanurrahman/Workshop/Platforms/node/18.7/backup/dailypolitics-cms/scripts/cronjob-deploy.sh
#
#   # Every hour with custom distribution ID
#   0 * * * * /Users/mizanurrahman/Workshop/Platforms/node/18.7/backup/dailypolitics-cms/scripts/cronjob-deploy.sh E1VSD95WQ4F48Y
#
#   # Every day at 2 AM
#   0 2 * * * /Users/mizanurrahman/Workshop/Platforms/node/18.7/backup/dailypolitics-cms/scripts/cronjob-deploy.sh
#
# CloudFront Distribution ID Priority:
#   1. Command line argument: ./cronjob-deploy.sh E1VSD95WQ4F48Y
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
LOG_FILE="$LOG_DIR/deploy-$(date +%Y%m%d).log"

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

# Start deployment
log "========================================="
log "Deployment started"
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

# Deploy to S3
log "Deploying to S3..."
"$SCRIPT_DIR/sync-to-s3.sh" >> "$LOG_FILE" 2>&1
DEPLOY_EXIT=$?

if [ $DEPLOY_EXIT -ne 0 ]; then
    log "ERROR: Deployment failed with exit code $DEPLOY_EXIT"
    log "========================================="
    exit $DEPLOY_EXIT
fi

log "Deployment completed successfully"

# Invalidate CloudFront cache
log "Invalidating CloudFront cache..."
log "Distribution ID: $CLOUDFRONT_DISTRIBUTION_ID"

aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "/*" >> "$LOG_FILE" 2>&1
INVALIDATION_EXIT=$?

if [ $INVALIDATION_EXIT -ne 0 ]; then
    log "WARNING: CloudFront invalidation failed with exit code $INVALIDATION_EXIT"
    log "Deployment was successful but cache may not be cleared"
    log "========================================="
    # Don't exit with error - deployment was successful
else
    log "CloudFront cache invalidation completed successfully"
fi

log "========================================="

# Clean up old log files (keep last 30 days)
find "$LOG_DIR" -name "deploy-*.log" -mtime +30 -delete

exit 0
