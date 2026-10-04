#!/usr/bin/env python3
"""Convert the FastAPI OpenAPI 3.1 document to Generator 6.x compatible 3.0."""

import json
import sys
from pathlib import Path
from typing import Any


def normalize(value: Any) -> Any:
    if isinstance(value, list):
        return [normalize(item) for item in value]
    if not isinstance(value, dict):
        return value

    result = {key: normalize(item) for key, item in value.items()}
    alternatives = result.get("anyOf")
    if alternatives and any(item == {"type": "null"} for item in alternatives):
        non_null = [item for item in alternatives if item != {"type": "null"}]
        if len(non_null) == 1:
            result.pop("anyOf")
            result.update(non_null[0])
            result["nullable"] = True
    return result


def main() -> None:
    source, destination = map(Path, sys.argv[1:3])
    document = json.loads(source.read_text(encoding="utf-8"))
    document["openapi"] = "3.0.3"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(normalize(document), indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
