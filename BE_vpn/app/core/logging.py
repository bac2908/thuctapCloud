import json
import logging
from datetime import datetime, timezone

DEFAULT_LOG_FORMAT = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
DEFAULT_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


class JsonFormatter(logging.Formatter):
    """Format log records as a single-line JSON object."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        # Keep only selected structured fields to avoid leaking noisy internals.
        for key in ("method", "path", "status_code", "duration_ms", "client_ip"):
            if hasattr(record, key):
                payload[key] = getattr(record, key)

        return json.dumps(payload, ensure_ascii=True)


def _coerce_level(level: str | int) -> int:
    if isinstance(level, int):
        return level

    upper = str(level).strip().upper()
    numeric = logging.getLevelName(upper)
    if isinstance(numeric, int):
        return numeric
    return logging.INFO


def configure_logging(level: str | int = "INFO", use_json: bool = False) -> None:
    """Configure root logging handlers for the whole application."""
    root_logger = logging.getLogger()
    root_logger.handlers.clear()

    handler = logging.StreamHandler()
    if use_json:
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(logging.Formatter(DEFAULT_LOG_FORMAT, datefmt=DEFAULT_DATE_FORMAT))

    root_logger.addHandler(handler)
    root_logger.setLevel(_coerce_level(level))

    logging.captureWarnings(True)

    # Keep third-party noise down unless explicitly needed.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
