#!/usr/bin/env python3
"""
Export SonarQube issues and measures to CSV using sonar-project.properties.

Expected files in current directory:
  - sonar-project.properties

Outputs:
  - sonar_issues.csv
  - sonar_measures.csv

Usage:
  python3 export_sonarqube_csv.py
"""

from __future__ import annotations

import csv
import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import ssl
import base64


PROPERTIES_FILE = "sonar-project.properties"


def read_properties(path: Path) -> Dict[str, str]:
    props: Dict[str, str] = {}

    if not path.exists():
        raise FileNotFoundError(f"Missing {path}")

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#"):
            continue

        if "=" not in line:
            continue

        key, value = line.split("=", 1)
        props[key.strip()] = value.strip()

    return props


def build_auth_headers(token: str) -> Dict[str, str]:
    # SonarQube also supports bearer tokens, but Basic with token: works widely.
    auth_value = base64.b64encode(f"{token}:".encode("utf-8")).decode("utf-8")
    return {
        "Authorization": f"Basic {auth_value}",
        "Accept": "application/json",
    }


def http_get_json(
    base_url: str,
    endpoint: str,
    params: Dict[str, Any],
    headers: Dict[str, str],
    insecure: bool = False,
) -> Dict[str, Any]:
    query = urlencode(params, doseq=True)
    url = f"{base_url.rstrip('/')}{endpoint}?{query}"

    request = Request(url, headers=headers, method="GET")

    context = None
    if insecure:
        context = ssl._create_unverified_context()

    try:
        with urlopen(request, context=context, timeout=60) as response:
            body = response.read().decode("utf-8")
            return json.loads(body)
    except HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"HTTP {e.code} calling {url}\nResponse:\n{body}"
        ) from e
    except URLError as e:
        raise RuntimeError(f"Failed to connect to {url}: {e}") from e
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Invalid JSON response from {url}") from e


def fetch_all_issues(
    base_url: str,
    project_key: str,
    headers: Dict[str, str],
    insecure: bool = False,
) -> List[Dict[str, Any]]:
    issues: List[Dict[str, Any]] = []
    page = 1
    page_size = 500

    while True:
        data = http_get_json(
            base_url=base_url,
            endpoint="/api/issues/search",
            params={
                "componentKeys": project_key,
                "ps": page_size,
                "p": page,
            },
            headers=headers,
            insecure=insecure,
        )

        batch = data.get("issues", [])
        issues.extend(batch)

        paging = data.get("paging", {})
        total = int(paging.get("total", 0))
        fetched = len(issues)

        print(f"Fetched issues page {page} ({fetched}/{total})")

        if fetched >= total or not batch:
            break

        page += 1

    return issues


def fetch_measures(
    base_url: str,
    project_key: str,
    headers: Dict[str, str],
    insecure: bool = False,
) -> List[Dict[str, Any]]:
    metric_keys = [
        "bugs",
        "vulnerabilities",
        "code_smells",
        "coverage",
        "duplicated_lines_density",
        "ncloc",
        "sqale_rating",
        "security_rating",
        "reliability_rating",
        "alert_status",
    ]

    data = http_get_json(
        base_url=base_url,
        endpoint="/api/measures/component",
        params={
            "component": project_key,
            "metricKeys": ",".join(metric_keys),
        },
        headers=headers,
        insecure=insecure,
    )

    component = data.get("component", {})
    measures = component.get("measures", [])

    result: List[Dict[str, Any]] = []
    for m in measures:
        result.append(
            {
                "project": component.get("key", project_key),
                "metric": m.get("metric"),
                "value": m.get("value", ""),
                "bestValue": m.get("bestValue", ""),
            }
        )

    return result


def write_issues_csv(path: Path, issues: List[Dict[str, Any]]) -> None:
    fieldnames = [
        "key",
        "rule",
        "severity",
        "type",
        "status",
        "resolution",
        "component",
        "project",
        "line",
        "message",
        "assignee",
        "author",
        "effort",
        "debt",
        "creationDate",
        "updateDate",
        "tags",
        "cleanCodeAttribute",
        "cleanCodeCategory",
        "impacts",
    ]

    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for issue in issues:
            impacts = issue.get("impacts", [])
            writer.writerow(
                {
                    "key": issue.get("key", ""),
                    "rule": issue.get("rule", ""),
                    "severity": issue.get("severity", ""),
                    "type": issue.get("type", ""),
                    "status": issue.get("status", ""),
                    "resolution": issue.get("resolution", ""),
                    "component": issue.get("component", ""),
                    "project": issue.get("project", ""),
                    "line": issue.get("line", ""),
                    "message": issue.get("message", ""),
                    "assignee": issue.get("assignee", ""),
                    "author": issue.get("author", ""),
                    "effort": issue.get("effort", ""),
                    "debt": issue.get("debt", ""),
                    "creationDate": issue.get("creationDate", ""),
                    "updateDate": issue.get("updateDate", ""),
                    "tags": ",".join(issue.get("tags", [])),
                    "cleanCodeAttribute": issue.get("cleanCodeAttribute", ""),
                    "cleanCodeCategory": issue.get("cleanCodeAttributeCategory", ""),
                    "impacts": json.dumps(impacts, ensure_ascii=False),
                }
            )


def write_measures_csv(path: Path, measures: List[Dict[str, Any]]) -> None:
    fieldnames = ["project", "metric", "value", "bestValue"]

    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(measures)


def main() -> int:
    root = Path.cwd()
    props_path = root / PROPERTIES_FILE

    try:
        props = read_properties(props_path)
    except Exception as e:
        print(f"Error reading properties: {e}", file=sys.stderr)
        return 1

    project_key = props.get("sonar.projectKey")
    host_url = props.get("sonar.host.url")
    token = props.get("sonar.token")

    if not project_key:
        print("Missing sonar.projectKey in sonar-project.properties", file=sys.stderr)
        return 1

    if not host_url:
        print("Missing sonar.host.url in sonar-project.properties", file=sys.stderr)
        return 1

    if not token:
        print("Missing sonar.token in sonar-project.properties", file=sys.stderr)
        return 1

    insecure = os.environ.get("SONAR_INSECURE_SSL", "").lower() in {"1", "true", "yes"}

    headers = build_auth_headers(token)

    try:
        print(f"Connecting to: {host_url}")
        print(f"Project key:   {project_key}")

        issues = fetch_all_issues(
            base_url=host_url,
            project_key=project_key,
            headers=headers,
            insecure=insecure,
        )
        measures = fetch_measures(
            base_url=host_url,
            project_key=project_key,
            headers=headers,
            insecure=insecure,
        )

        issues_csv = root / "sonar_issues.csv"
        measures_csv = root / "sonar_measures.csv"

        write_issues_csv(issues_csv, issues)
        write_measures_csv(measures_csv, measures)

        print(f"Done.")
        print(f"Created: {issues_csv}")
        print(f"Created: {measures_csv}")
        print(f"Total issues exported: {len(issues)}")

        return 0

    except Exception as e:
        print(f"Export failed: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())