"""Downloads kept in `pipeline/cache/`, each with a sidecar saying when and where it came from."""

import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import unquote, urlparse

import requests

log = logging.getLogger(__name__)

DEFAULT_CACHE = Path(__file__).resolve().parent.parent / "cache"
USER_AGENT = "planetshift-pipeline/0.1"


def file_name(url: str) -> str:
    return unquote(Path(urlparse(url).path).name)


def sidecar(path: Path) -> Path:
    return path.with_name(path.name + ".json")


def fetched(cache_dir: Path, url: str, name: str | None = None, timeout: int = 600) -> Path:
    """The cached copy of `url`, downloading it the first time."""
    path = cache_dir / (name or file_name(url))
    if path.exists():
        return path
    cache_dir.mkdir(parents=True, exist_ok=True)
    log.info("downloading %s", url)
    partial = path.with_name(path.name + ".part")
    with requests.get(url, stream=True, timeout=timeout, headers={"User-Agent": USER_AGENT}) as r:
        r.raise_for_status()
        with partial.open("wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                f.write(chunk)
    partial.rename(path)
    sidecar(path).write_text(
        json.dumps({"url": url, "downloaded": datetime.now(UTC).date().isoformat()}, indent=2)
    )
    return path


def downloaded_on(path: Path) -> str | None:
    side = sidecar(path)
    return json.loads(side.read_text())["downloaded"] if side.exists() else None
