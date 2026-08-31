#!/usr/bin/env bash
set -euo pipefail

POSTGRES_BIN="${POSTGRES_BIN:-/opt/homebrew/opt/postgresql@14/bin}"
POSTGRES_DATA="${POSTGRES_DATA:-/opt/homebrew/var/postgresql@14}"
POSTGRES_PORT="${POSTGRES_PORT:-5434}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/logs/postgres_local.log"

mkdir -p "${SCRIPT_DIR}/logs"

case "${1:-status}" in
  start)
    if "${POSTGRES_BIN}/pg_ctl" -D "${POSTGRES_DATA}" status >/dev/null 2>&1; then
      echo "PostgreSQL is already running on port ${POSTGRES_PORT}."
    else
      "${POSTGRES_BIN}/pg_ctl" -D "${POSTGRES_DATA}" -l "${LOG_FILE}" -o "-p ${POSTGRES_PORT}" start
    fi
    ;;
  stop)
    "${POSTGRES_BIN}/pg_ctl" -D "${POSTGRES_DATA}" stop -m fast
    ;;
  restart)
    "${POSTGRES_BIN}/pg_ctl" -D "${POSTGRES_DATA}" restart -m fast -l "${LOG_FILE}" -o "-p ${POSTGRES_PORT}"
    ;;
  status)
    "${POSTGRES_BIN}/pg_ctl" -D "${POSTGRES_DATA}" status
    "${POSTGRES_BIN}/pg_isready" -h 127.0.0.1 -p "${POSTGRES_PORT}"
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}" >&2
    exit 2
    ;;
esac
