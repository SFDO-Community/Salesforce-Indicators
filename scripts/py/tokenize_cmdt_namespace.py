#!/usr/bin/env python3
"""CLI wrapper for tasks.tokenize_cmdt_namespace.tokenize_directory.

Usage:
    python scripts/py/tokenize_cmdt_namespace.py <path> [--dry-run]

No CumulusCI project or org context is required for this entry point, but the
`cumulusci` Python package must be importable (tasks/tokenize_cmdt_namespace.py
imports it at module level), e.g. run it with the Python that CumulusCI is
installed in.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tasks.tokenize_cmdt_namespace import tokenize_directory


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "path", help="Directory to process recursively (e.g. a customMetadata folder)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report planned changes without writing them",
    )
    args = parser.parse_args()

    changes = tokenize_directory(Path(args.path), dry_run=args.dry_run)
    if not changes:
        print("No untokenized CMDT record files found.")
        return
    for change in changes:
        print(change)


if __name__ == "__main__":
    main()
