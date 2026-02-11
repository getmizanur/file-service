#!/bin/bash

###############################################################################
# Static Site S3 Sync Script
#
# Syncs the static-site directory to AWS S3
# Can be run manually or via cronjob
#
# Usage:
#   ./scripts/sync-to-s3.sh
#
# Prerequisites:
#   - AWS CLI installed and configured
#   - AWS credentials set up (via ~/.aws/credentials or environment variables)
#   - S3 bucket created
#
# Environment Variables:
#   AWS_S3_BUCKET       - S3 bucket name (required)
#   AWS_REGION          - AWS region (default: us-east-1)
#   AWS_PROFILE         - AWS CLI profile to use (optional)
#   CLOUDFRONT_DIST_ID  - CloudFront distribution ID for cache invalidation (optional)
#   DRY_RUN            - Set to "true" to perform a dry run (optional)
###############################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STATIC_DIR="$PROJECT_ROOT/static-site"

# Log function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ✓ $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ✗ $1"
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ⚠ $1"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed. Please install it first:"
    echo "  brew install awscli  # macOS"
    echo "  sudo apt-get install awscli  # Ubuntu/Debian"
    exit 1
fi

# Check if S3 bucket is configured
if [ -z "$AWS_S3_BUCKET" ]; then
    log_error "AWS_S3_BUCKET environment variable is not set"
    echo ""
    echo "Please set the S3 bucket name:"
    echo "  export AWS_S3_BUCKET=your-bucket-name"
    echo ""
    echo "Or create a .env file in the project root with:"
    echo "  AWS_S3_BUCKET=your-bucket-name"
    exit 1
fi

# Set default region if not provided
AWS_REGION="${AWS_REGION:-us-east-1}"

# Check if static-site directory exists
if [ ! -d "$STATIC_DIR" ]; then
    log_error "Static site directory not found: $STATIC_DIR"
    echo "Run 'npm run build' first to generate the static site"
    exit 1
fi

# Build AWS CLI command
AWS_CMD="aws s3 sync"

# Add profile if specified
if [ -n "$AWS_PROFILE" ]; then
    AWS_CMD="$AWS_CMD --profile $AWS_PROFILE"
fi

# Add region
AWS_CMD="$AWS_CMD --region $AWS_REGION"

# Add dry-run flag if requested
if [ "$DRY_RUN" = "true" ]; then
    log_warn "DRY RUN MODE - No files will be uploaded"
    AWS_CMD="$AWS_CMD --dryrun"
fi

log "Starting S3 sync..."
log "Source: $STATIC_DIR"
log "Destination: s3://$AWS_S3_BUCKET"
log "Region: $AWS_REGION"
echo ""

# Sync files to S3 with proper content types and cache headers
$AWS_CMD "$STATIC_DIR/" "s3://$AWS_S3_BUCKET/" \
    --delete \
    --exclude ".DS_Store" \
    --exclude "*.log" \
    --exclude ".gitkeep" \
    --cache-control "public, max-age=3600" \
    --metadata-directive REPLACE

SYNC_EXIT_CODE=$?

if [ $SYNC_EXIT_CODE -eq 0 ]; then
    log_success "S3 sync completed successfully"
else
    log_error "S3 sync failed with exit code $SYNC_EXIT_CODE"
    exit $SYNC_EXIT_CODE
fi

# Set specific cache headers for HTML files (shorter cache)
log "Setting cache headers for HTML files..."
$AWS_CMD "$STATIC_DIR/" "s3://$AWS_S3_BUCKET/" \
    --exclude "*" \
    --include "*.html" \
    --cache-control "public, max-age=3600, must-revalidate" \
    --metadata-directive REPLACE \
    --only-show-errors

# Set longer cache for static assets
log "Setting cache headers for static assets..."
$AWS_CMD "$STATIC_DIR/" "s3://$AWS_S3_BUCKET/" \
    --exclude "*" \
    --include "*.css" \
    --include "*.js" \
    --include "*.jpg" \
    --include "*.jpeg" \
    --include "*.png" \
    --include "*.gif" \
    --include "*.svg" \
    --include "*.woff" \
    --include "*.woff2" \
    --include "*.ttf" \
    --cache-control "public, max-age=600, immutable" \
    --metadata-directive REPLACE \
    --only-show-errors

log_success "Cache headers updated"

# Invalidate CloudFront cache if distribution ID is provided
if [ -n "$CLOUDFRONT_DIST_ID" ]; then
    if [ "$DRY_RUN" = "true" ]; then
        log_warn "DRY RUN: Skipping CloudFront invalidation"
    else
        log "Invalidating CloudFront cache..."
        INVALIDATION_CMD="aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DIST_ID --paths '/*'"

        if [ -n "$AWS_PROFILE" ]; then
            INVALIDATION_CMD="$INVALIDATION_CMD --profile $AWS_PROFILE"
        fi

        eval $INVALIDATION_CMD > /dev/null 2>&1

        if [ $? -eq 0 ]; then
            log_success "CloudFront invalidation created"
        else
            log_warn "CloudFront invalidation failed (non-critical)"
        fi
    fi
fi

echo ""
log_success "Deployment complete!"
echo ""
echo "Your site is now available at:"
echo "  http://$AWS_S3_BUCKET.s3-website-$AWS_REGION.amazonaws.com"
if [ -n "$CLOUDFRONT_DIST_ID" ]; then
    echo "  Or via CloudFront (may take a few minutes to propagate)"
fi
echo ""
