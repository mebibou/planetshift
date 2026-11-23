"""Downloads kept in `pipeline/cache/`, each with a sidecar saying when and where it came from."""

import hashlib
import json
import logging
import os
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import unquote, urlparse

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

log = logging.getLogger(__name__)

DEFAULT_CACHE = Path(__file__).resolve().parent.parent / "cache"
USER_AGENT = "planetshift-pipeline/0.1"


def session() -> requests.Session:
    """HTTP with retries on connection errors, rate limits and server errors."""
    retry = Retry(
        total=5,
        backoff_factor=2,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset({"GET", "POST"}),
    )
    http = requests.Session()
    http.mount("https://", HTTPAdapter(max_retries=retry))
    http.mount("http://", HTTPAdapter(max_retries=retry))
    http.headers.update({"User-Agent": USER_AGENT})
    return http


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
    partial = path.with_name(f"{path.name}.{os.getpid()}.part")
    with session().get(url, stream=True, timeout=timeout) as r:
        r.raise_for_status()
        with partial.open("wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                f.write(chunk)
    with partial.open("rb") as f:
        digest = hashlib.file_digest(f, "sha256").hexdigest()
    partial.rename(path)
    record(path, url=url, downloaded=today(), sha256=digest)
    return path


def recorded(path: Path) -> dict:
    """What the sidecar says of a cached file ({} without one)."""
    side = sidecar(path)
    return json.loads(side.read_text()) if side.exists() else {}


def record(path: Path, **fields) -> None:
    """Adds fields to a cached file's sidecar."""
    sidecar(path).write_text(json.dumps(recorded(path) | fields, indent=2))


def downloaded_on(path: Path) -> str | None:
    return recorded(path).get("downloaded")


def today() -> str:
    return datetime.now(UTC).date().isoformat()
