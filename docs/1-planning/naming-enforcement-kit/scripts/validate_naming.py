#!/usr/bin/env python3
"""Validate AWS naming conventions for names found in repo config files.

This script is intentionally conservative: it validates *candidate names* found in:
- Terraform (.tf, .tfvars)
- CloudFormation (.yml, .yaml, .json)
- Markdown docs (.md)
- JSON/YAML config files

How it works:
- It scans for strings that look like AWS resource names (lowercase-hyphen patterns)
- It checks them against regex rules in scripts/naming_rules.json
- It reports failures with file + line numbers

Usage:
  python3 scripts/validate_naming.py --root . --config scripts/naming_rules.json
"""

from __future__ import annotations
import argparse
import json
import os
import re
from dataclasses import dataclass
from typing import Dict, Iterable, List, Tuple


SCAN_EXTS = {".tf", ".tfvars", ".yml", ".yaml", ".json", ".md", ".txt"}


@dataclass
class Finding:
    path: str
    lineno: int
    value: str
    rule: str
    message: str


def load_rules(path: str) -> Dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def iter_files(root: str) -> Iterable[str]:
    for dirpath, dirnames, filenames in os.walk(root):
        # ignore common noisy folders
        dirnames[:] = [d for d in dirnames if d not in {".git", "node_modules", "dist", "build", ".next", ".cache"}]
        for fn in filenames:
            ext = os.path.splitext(fn)[1].lower()
            if ext in SCAN_EXTS:
                yield os.path.join(dirpath, fn)


def extract_candidates(line: str) -> List[str]:
    # candidate tokens: lowercase + digits + hyphen, 3+ chars, not purely numeric
    # keep it permissive; rules will filter
    return re.findall(r"(?<![A-Za-z0-9_])([a-z0-9]+(?:-[a-z0-9]+)+)(?![A-Za-z0-9_])", line)


def check_value(value: str, rules: Dict) -> Tuple[bool, str, str]:
    """Return (ok, rule_name, message)."""
    # Always enforce global rule
    global_pat = rules["global"]["regex"]
    if not re.fullmatch(global_pat, value):
        return False, "global", f"Does not match global regex: {global_pat}"

    # Try matching any specific rule
    for rule in rules.get("specific", []):
        if re.fullmatch(rule["regex"], value):
            return True, rule["name"], "OK"

    # If no specific rule matched, treat as ok but warn? Here: ok if global ok.
    return True, "global-only", "Matches global rule; no specific rule matched (informational)"


def scan_files(root: str, rules: Dict) -> Tuple[List[Finding], List[Finding]]:
    """Scan all files under root and classify candidates into findings and info."""
    findings: List[Finding] = []
    info: List[Finding] = []

    for filepath in iter_files(root):
        _scan_single_file(filepath, rules, findings, info)

    return findings, info


def _scan_single_file(filepath: str, rules: Dict, findings: List[Finding], info: List[Finding]) -> None:
    """Scan a single file for naming convention violations."""
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        for i, line in enumerate(f, start=1):
            for cand in extract_candidates(line):
                ok, rule, msg = check_value(cand, rules)
                if not ok:
                    findings.append(Finding(filepath, i, cand, rule, msg))
                elif rule == "global-only":
                    info.append(Finding(filepath, i, cand, rule, msg))


def print_info(info: List[Finding]) -> None:
    """Print informational findings (global-only matches)."""
    if not info:
        return
    print("\n[info] Names that only match global rule (no specific rule matched):")
    for x in info[:200]:
        print(f"  {x.path}:{x.lineno}: {x.value} ({x.message})")
    if len(info) > 200:
        print(f"  ... and {len(info)-200} more")


def print_errors(findings: List[Finding]) -> None:
    """Print error findings."""
    print("\n[error] Naming convention violations:")
    for x in findings:
        print(f"  {x.path}:{x.lineno}: {x.value} -> {x.rule}: {x.message}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True, help="Repo root to scan")
    ap.add_argument("--config", required=True, help="JSON config with naming rules")
    ap.add_argument("--fail-on-global-only", action="store_true",
                    help="Fail if a candidate matches global rule but no specific rule")
    args = ap.parse_args()

    rules = load_rules(args.config)
    findings, info = scan_files(args.root, rules)

    print_info(info)

    if findings:
        print_errors(findings)
        return 2

    if args.fail_on_global_only and info:
        print("\n[error] --fail-on-global-only set and some candidates didn't match a specific rule.")
        return 3

    print("Naming convention checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
