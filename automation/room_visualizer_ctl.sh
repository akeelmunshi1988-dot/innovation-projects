#!/bin/zsh
set -eu

label="com.dreamrugs.room-visualizer"
domain="gui/$(id -u)"
plist="/Users/user/Library/LaunchAgents/${label}.plist"
project_plist="/Applications/RugManufactureCustomApp/automation/${label}.plist"
log="/Applications/RugManufactureCustomApp/automation/room-visualizer.log"

case "${1:-status}" in
  start)
    cp "$project_plist" "$plist"
    launchctl bootstrap "$domain" "$plist" 2>/dev/null || true
    launchctl kickstart "$domain/$label"
    echo "Room visualizer agent started."
    ;;
  stop)
    launchctl bootout "$domain/$label" 2>/dev/null || true
    echo "Room visualizer agent stopped."
    ;;
  restart|rerun)
    launchctl kickstart -k "$domain/$label"
    echo "Room visualizer agent restarted; pending and incomplete files will resume."
    ;;
  status)
    launchctl print "$domain/$label" | grep -E 'state =|pid =|last exit code' || true
    ;;
  logs)
    tail -f "$log"
    ;;
  catalog)
    /Applications/RugManufactureCustomApp/backend/venv/bin/python \
      /Applications/RugManufactureCustomApp/automation/room_visualizer_agent.py \
      --watch-dir /Users/user/Downloads/GoogleDriveHarisPhotos \
      --env-file /Applications/RugManufactureCustomApp/backend/.env \
      --once --prompt-catalog
    ;;
  catalog-update)
    if [[ -z "${2:-}" ]] || ! [[ "$2" =~ ^[1-9][0-9]*$ ]]; then
      echo "Usage: $0 catalog-update <catalog-id> [original-image-path]" >&2
      exit 2
    fi
    args=(
      --watch-dir /Users/user/Downloads/GoogleDriveHarisPhotos
      --env-file /Applications/RugManufactureCustomApp/backend/.env
      --once
      --update-catalog-id "$2"
    )
    if [[ -n "${3:-}" ]]; then
      args+=(--update-source "$3")
    fi
    /Applications/RugManufactureCustomApp/backend/venv/bin/python \
      /Applications/RugManufactureCustomApp/automation/room_visualizer_agent.py \
      "${args[@]}"
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|rerun|status|logs|catalog|catalog-update <catalog-id> [original-image-path]}" >&2
    exit 2
    ;;
esac
