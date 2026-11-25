"""Namespace-tokenize CMDT record files retrieved from a non-namespaced org.

A scratch org created with `namespaced: false` has no namespace to strip, so
`cci task run retrieve_changes --namespace_tokenize true ...` retrieves CMDT
records with plain field names and plain filenames instead of CumulusCI's
namespace-injection tokens (`%%%NAMESPACE%%%` in file content, `___NAMESPACE___`
in filenames). This module adds those tokens back in, in place and idempotently,
for the four Indicator_*__mdt objects' record files under a `customMetadata`
folder.
"""

import re
from pathlib import Path

from cumulusci.core.tasks import BaseTask
from cumulusci.core.utils import process_bool_arg

FILENAME_TOKEN = "___NAMESPACE___"
FIELD_TOKEN = "%%%NAMESPACE%%%"

KNOWN_OBJECT_PREFIXES = (
    "Indicator_Bundle_Item.",
    "Indicator_Bundle.",
    "Indicator_Item_Extension.",
    "Indicator_Item.",
)

FIELD_PATTERN = re.compile(
    r"<field>(?!" + re.escape(FIELD_TOKEN) + r")([A-Za-z0-9_]+)</field>"
)


def _is_cmdt_record_file(file_path: Path) -> bool:
    if file_path.parent.name != "customMetadata":
        return False
    name = file_path.name
    if name.startswith(FILENAME_TOKEN):
        name = name[len(FILENAME_TOKEN) :]
    return name.startswith(KNOWN_OBJECT_PREFIXES)


def tokenize_directory(path: Path, dry_run: bool = False) -> list[str]:
    """Tokenize every CMDT record file found recursively under `path`.

    Returns a list of human-readable change descriptions. When `dry_run` is
    True, changes are computed and reported but not written.
    """
    changes: list[str] = []

    for file_path in sorted(Path(path).rglob("*")):
        if not file_path.is_file() or not _is_cmdt_record_file(file_path):
            continue

        original_content = file_path.read_text(encoding="utf-8")
        new_content, count = FIELD_PATTERN.subn(
            f"<field>{FIELD_TOKEN}\\1</field>", original_content
        )
        if count:
            changes.append(
                f"{file_path}: tokenized {count} <field> reference(s)"
            )
            if not dry_run:
                file_path.write_text(new_content, encoding="utf-8")

        if not file_path.name.startswith(FILENAME_TOKEN):
            new_path = file_path.with_name(FILENAME_TOKEN + file_path.name)
            changes.append(f"{file_path} -> {new_path}")
            if not dry_run:
                file_path.rename(new_path)

    return changes


class TokenizeCmdtNamespace(BaseTask):
    task_options = {
        "path": {
            "description": (
                "Directory to process recursively, e.g. a customMetadata "
                "folder from a retrieve."
            ),
            "required": True,
        },
        "dry_run": {
            "description": "If true, report planned changes without writing them.",
            "required": False,
        },
    }

    def _init_options(self, kwargs):
        super()._init_options(kwargs)
        self.options["dry_run"] = process_bool_arg(self.options.get("dry_run", False))

    def _run_task(self):
        changes = tokenize_directory(
            Path(self.options["path"]), dry_run=self.options["dry_run"]
        )
        if not changes:
            self.logger.info("No untokenized CMDT record files found.")
            return
        for change in changes:
            self.logger.info(change)
