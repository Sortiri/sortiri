#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  if [[ -n "${CONVEX_PID:-}" ]]; then
    kill "$CONVEX_PID" 2>/dev/null || true
  fi
  if [[ -n "${NEXT_PID:-}" ]]; then
    kill "$NEXT_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

npx convex dev &
CONVEX_PID=$!

npm run dev &
NEXT_PID=$!

wait -n "$CONVEX_PID" "$NEXT_PID"
