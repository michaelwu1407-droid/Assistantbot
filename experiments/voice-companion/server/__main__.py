"""Run: python -m server [--demo]"""
import argparse
import logging

import uvicorn

from .app import create_app
from .config import load_config


def main() -> None:
    parser = argparse.ArgumentParser(description="Local voice companion")
    parser.add_argument("--demo", action="store_true", help="no models: canned replies + browser voice")
    args = parser.parse_args()
    cfg = load_config()
    logging.basicConfig(level=logging.INFO)
    print(f"\n  Open http://{cfg.host}:{cfg.port}\n")
    uvicorn.run(create_app(demo=args.demo), host=cfg.host, port=cfg.port, log_level="warning")


if __name__ == "__main__":
    main()
