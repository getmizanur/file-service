#!/usr/bin/env bash
set -euo pipefail

# Audits a subset of AWS resources for naming convention compliance.
# Requires: aws CLI configured + jq installed.
#
# Usage:
#   ./scripts/audit_aws_names.sh eu-west-2
#
# Output: prints violations to stdout and exits non-zero if any are found.

REGION="${1:-}"
if [[ -z "${REGION}" ]]; then
  echo "Usage: $0 <aws-region> (e.g., eu-west-2)" >&2
  exit 1
fi

GLOBAL_REGEX='^[a-z0-9]+(-[a-z0-9]+)*$'

fail=0

check_name () {
  local kind="$1"
  local name="$2"
  if ! [[ "$name" =~ $GLOBAL_REGEX ]]; then
    echo "[violation] $kind: $name (fails global lowercase-hyphen rule)"
    fail=1
  fi
}

echo "Auditing S3 bucket names..."
aws s3api list-buckets --query 'Buckets[].Name' --output json | jq -r '.[]' | while read -r b; do
  check_name "s3-bucket" "$b"
done

echo "Auditing IAM role names..."
aws iam list-roles --query 'Roles[].RoleName' --output json | jq -r '.[]' | while read -r r; do
  check_name "iam-role" "$r"
done

echo "Auditing IAM policy names (customer-managed only)..."
aws iam list-policies --scope Local --query 'Policies[].PolicyName' --output json | jq -r '.[]' | while read -r p; do
  check_name "iam-policy" "$p"
done

echo "Auditing CloudWatch log groups..."
aws logs describe-log-groups --region "$REGION" --query 'logGroups[].logGroupName' --output json | jq -r '.[]' | while read -r lg; do
  # log group names often include slashes; only validate the trailing token to avoid false positives
  tail="${lg##*/}"
  check_name "cloudwatch-log-group-tail" "$tail"
done

if [[ "$fail" -ne 0 ]]; then
  echo "Audit completed with violations."
  exit 2
fi

echo "Audit completed: no violations detected by global rule."
