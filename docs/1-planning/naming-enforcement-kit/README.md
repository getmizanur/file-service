# Naming Enforcement Kit

This kit provides:
- GitHub Actions workflow to validate naming conventions in PRs
- Terraform validation snippets
- Repo scanner (Python) to catch convention drift in docs/config
- AWS inventory audit script (AWS CLI + jq)

## Quick start

1) Copy the workflow and scripts into your repo:
- `.github/workflows/naming-conventions.yml`
- `scripts/validate_naming.py`
- `scripts/naming_rules.json`

2) Ensure the python script is executable:
```bash
chmod +x scripts/validate_naming.py
```

3) Run locally:
```bash
python3 scripts/validate_naming.py --root . --config scripts/naming_rules.json
```

## AWS inventory audit (optional)

Requires:
- `aws` CLI configured
- `jq` installed

Run:
```bash
chmod +x scripts/audit_aws_names.sh
./scripts/audit_aws_names.sh eu-west-2
```

## Notes

- The repo scanner is conservative and may show informational matches that only satisfy the global rule.
- Tighten specific regex patterns in `scripts/naming_rules.json` as your resource catalog becomes clearer.
