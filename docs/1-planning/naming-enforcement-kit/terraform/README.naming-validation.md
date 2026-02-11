# Terraform Naming Validation Snippets

These snippets demonstrate how to enforce the naming convention in Terraform variables.
Copy/paste into your module `variables.tf` and tailor patterns per resource.

## 1) Global lowercase-hyphen rule

```hcl
variable "name" {
  type        = string
  description = "Resource name. Lowercase letters, digits, hyphens only."

  validation {
    condition     = can(regex("^[a-z0-9]+(-[a-z0-9]+)*$", var.name))
    error_message = "Name must be lowercase letters, digits, hyphens only (e.g., static-site-s3-sync-prod)."
  }
}
```

## 2) IAM role name (project example: static-site-s3-sync-prod)

```hcl
variable "iam_role_name" {
  type        = string
  description = "IAM role name for static-site S3 sync"

  validation {
    condition     = can(regex("^[a-z0-9]+(?:-[a-z0-9]+)*-(dev|stage|staging|prod)$", var.iam_role_name))
    error_message = "IAM role must follow APP-SCOPE-ENV (e.g., static-site-s3-sync-prod)."
  }
}
```

## 3) IAM policy name (project example: static-site-s3-sync-policy-prod)

```hcl
variable "iam_policy_name" {
  type        = string
  description = "IAM policy name for static-site S3 sync"

  validation {
    condition     = can(regex("^[a-z0-9]+(?:-[a-z0-9]+)*-policy-(dev|stage|staging|prod)$", var.iam_policy_name))
    error_message = "IAM policy must follow APP-SCOPE-policy-ENV (e.g., static-site-s3-sync-policy-prod)."
  }
}
```

## 4) S3 bucket name (pattern: ORG-TEAM-ENV-SCOPE-bucket)

```hcl
variable "s3_bucket_name" {
  type        = string
  description = "S3 bucket name for static site content"

  validation {
    condition     = can(regex("^[a-z0-9]+(?:-[a-z0-9]+)*-(dev|stage|staging|prod)-(?:[a-z0-9]+-)*bucket$", var.s3_bucket_name))
    error_message = "Bucket must follow ORG-TEAM-ENV-SCOPE-bucket (e.g., dp-cms-prod-static-bucket)."
  }
}
```
