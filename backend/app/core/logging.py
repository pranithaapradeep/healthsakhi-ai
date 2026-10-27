import logging

# Policy: never log request bodies, passwords, session tokens, API keys, raw audio, or message text.
# Log only event names, request paths, status codes and opaque ids.


def configure_logging(level: str = "INFO") -> None:
    logging.basicConfig(level=level, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


logger = logging.getLogger("healthsakhi")
