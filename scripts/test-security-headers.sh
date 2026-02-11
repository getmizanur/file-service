#!/bin/bash

###############################################################################
# Security Headers Test Script
#
# Tests that security headers are properly configured
# Run this while the dev server is running (npm run dev)
#
# Usage:
#   ./scripts/test-security-headers.sh
###############################################################################

echo "=============================================="
echo "Security Headers Test"
echo "=============================================="
echo ""

# Check if server is running
if ! curl -s http://localhost:8080/ > /dev/null 2>&1; then
    echo "❌ ERROR: Server is not running on http://localhost:8080/"
    echo "   Please start the server first with: npm run dev"
    exit 1
fi

echo "✅ Server is running"
echo ""

# Fetch headers
echo "Fetching HTTP headers..."
echo "----------------------------------------------"
HEADERS=$(curl -s -I http://localhost:8080/ 2>&1)

# Check for security headers
echo ""
echo "Security Headers Status:"
echo "----------------------------------------------"

# Function to check header
check_header() {
    local header_name=$1
    local header_check=$2

    if echo "$HEADERS" | grep -i "^${header_check}:" > /dev/null; then
        echo "✅ ${header_name}"
        echo "$HEADERS" | grep -i "^${header_check}:" | sed 's/^/   /'
    else
        echo "❌ ${header_name} - NOT FOUND"
    fi
}

# Check each security header
check_header "Content Security Policy" "content-security-policy"
check_header "X-Frame-Options" "x-frame-options"
check_header "X-Content-Type-Options" "x-content-type-options"
check_header "Referrer-Policy" "referrer-policy"
check_header "X-DNS-Prefetch-Control" "x-dns-prefetch-control"

# Check that X-Powered-By is removed
if echo "$HEADERS" | grep -i "^x-powered-by:" > /dev/null; then
    echo "❌ X-Powered-By - SHOULD BE REMOVED (security risk)"
    echo "$HEADERS" | grep -i "^x-powered-by:" | sed 's/^/   /'
else
    echo "✅ X-Powered-By - Removed (good!)"
fi

# Check HSTS (production only)
if [ "$NODE_ENV" = "production" ]; then
    check_header "Strict-Transport-Security" "strict-transport-security"
else
    echo "ℹ️  Strict-Transport-Security - Disabled (development mode)"
fi

echo ""
echo "----------------------------------------------"
echo "Full Headers:"
echo "----------------------------------------------"
echo "$HEADERS"
echo ""
echo "=============================================="
echo "Test Complete"
echo "=============================================="
