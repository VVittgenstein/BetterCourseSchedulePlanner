#!/usr/bin/env python3
"""
Utility to download Rutgers SOC courses/openSections payloads for a term×campus
combination and store both the gzipped JSON snapshot plus lightweight metadata.
"""

from __future__ import annotations

import argparse
import datetime as dt
import gzip
import hashlib
import json
import pathlib
import sys
import time
import urllib.parse
import urllib.request
from typing import Any, Dict, List


BASE_URL = "https://sis.rutgers.edu/soc/api"
USER_AGENT = "BetterCourseSchedulePlanner/0.1 (+sample-fetcher)"


def request_json(endpoint: str, *, year: int, term: int, campus: str) -> Dict[str, Any]:
    params = urllib.parse.urlencode({"year": year, "term": term, "campus": campus})
    url = f"{BASE_URL}/{endpoint}.json?{params}"
    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": USER_AGENT,
            # Skip --compressed here; urllib handles gzip transparently.
        },
    )

    start_ts = time.time()
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw_bytes = resp.read()
        content_encoding = resp.headers.get("Content-Encoding", "").lower()
        if content_encoding == "gzip":
            data_bytes = gzip.decompress(raw_bytes)
        else:
            data_bytes = raw_bytes
        status = resp.status
        resp_headers = dict(resp.headers.items())
    duration_ms = int((time.time() - start_ts) * 1000)

    payload = json.loads(data_bytes.decode("utf-8"))
    return {
        "payload": payload,
        "url": url,
        "status": status,
        "duration_ms": duration_ms,
        "headers": resp_headers,
        "data_bytes": data_bytes,
    }


def write_snapshot(
    *,
    out_dir: pathlib.Path,
    endpoint: str,
    campus: str,
    year: int,
    term: int,
    payload_info: Dict[str, Any],
) -> None:
    timestamp = dt.datetime.now(dt.timezone.utc).isoformat()
    base_name = f"spring-2026-{campus}-{endpoint}"
    if year != 2026 or term != 1:
        base_name = f"{year}-term{term}-{campus}-{endpoint}"

    gz_path = out_dir / f"{base_name}.json.gz"
    meta_path = out_dir / f"{base_name}.metadata.json"

    payload_bytes = payload_info["data_bytes"]
    payload = payload_info["payload"]

    gz_path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(gz_path, "wb") as fh:
        fh.write(payload_bytes)

    sha256 = hashlib.sha256(payload_bytes).hexdigest()
    metadata: Dict[str, Any] = {
        "fetched_at": timestamp,
        "year": year,
        "term": term,
        "campus": campus,
        "endpoint": endpoint,
        "url": payload_info["url"],
        "status": payload_info["status"],
        "duration_ms": payload_info["duration_ms"],
        "headers": payload_info["headers"],
        "payload_bytes": len(payload_bytes),
        "gz_file_size_bytes": gz_path.stat().st_size,
        "sha256": sha256,
    }

    if endpoint == "courses":
        courses_count = len(payload)
        sections_count = sum(len(course.get("sections", [])) for course in payload)
        metadata.update(
            {
                "courses_count": courses_count,
                "sections_count": sections_count,
            }
        )
    elif endpoint == "openSections":
        metadata["open_section_count"] = len(payload)

    with meta_path.open("w", encoding="utf-8") as fh:
        json.dump(metadata, fh, indent=2, ensure_ascii=False)

    print(
        f"[OK] {endpoint} {campus} -> {gz_path.name} "
        f"(payload={metadata.get('payload_bytes')} bytes)"
    )


def parse_args(argv: List[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download Rutgers SOC courses/openSections samples."
    )
    parser.add_argument("--year", type=int, default=2026)
    parser.add_argument("--term", type=int, default=1, help="1=Spring, 9=Fall, etc.")
    parser.add_argument(
        "--campuses",
        type=str,
        default="NB,NK,CM",
        help="Comma separated campus codes (NB/NK/CM/ONLINE, etc.)",
    )
    parser.add_argument(
        "--endpoints",
        type=str,
        default="courses,openSections",
        help="Comma separated endpoints (courses,openSections)",
    )
    parser.add_argument(
        "--out-dir",
        type=pathlib.Path,
        default=pathlib.Path("data/raw"),
    )
    return parser.parse_args(argv)


def main(argv: List[str]) -> int:
    args = parse_args(argv)
    campuses = [c.strip().upper() for c in args.campuses.split(",") if c.strip()]
    endpoints = [e.strip() for e in args.endpoints.split(",") if e.strip()]

    if not campuses:
        print("No campuses provided.", file=sys.stderr)
        return 1
    if not endpoints:
        print("No endpoints provided.", file=sys.stderr)
        return 1

    args.out_dir.mkdir(parents=True, exist_ok=True)

    for campus in campuses:
        for endpoint in endpoints:
            try:
                payload_info = request_json(
                    endpoint,
                    year=args.year,
                    term=args.term,
                    campus=campus,
                )
            except Exception as exc:  # noqa: BLE001 - bubble up context
                print(f"[ERR] Failed {endpoint} {campus}: {exc}", file=sys.stderr)
                return 1

            write_snapshot(
                out_dir=args.out_dir,
                endpoint=endpoint,
                campus=campus,
                year=args.year,
                term=args.term,
                payload_info=payload_info,
            )

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
