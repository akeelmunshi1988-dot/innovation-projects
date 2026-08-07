import logging
import os
from logging.handlers import RotatingFileHandler

LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "logs")


def setup_logging() -> logging.Logger:
    """Writes API request/error logs to backend/logs/app.log (5MB x 5 backups),
    in addition to the console output uvicorn already prints. This is a stopgap
    so failures are recoverable after the fact instead of only visible in
    whichever terminal happened to be running uvicorn at the time."""
    os.makedirs(LOG_DIR, exist_ok=True)

    logger = logging.getLogger("loomcraft")
    if logger.handlers:  # avoid duplicate handlers when uvicorn --reload re-imports this module
        return logger
    logger.setLevel(logging.INFO)

    formatter = logging.Formatter(
        "%(asctime)s %(levelname)s [%(name)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
    )

    file_handler = RotatingFileHandler(
        os.path.join(LOG_DIR, "app.log"), maxBytes=5 * 1024 * 1024, backupCount=5,
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    return logger


logger = setup_logging()
