#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   SKIP_NPM_CI=1 ./scripts/build-apk.sh
# Runs a Gradle release build and copies resulting APK(s) into an "apks" folder
# The script writes logs and a short manifest of produced files in the apks folder.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APKS_DIR="$ROOT_DIR/apks"
LOG_FILE="$APKS_DIR/build.log"

mkdir -p "$APKS_DIR"

echo "[build-apk] Starting build at $(date --iso-8601=seconds)" | tee -a "$LOG_FILE"

if [ -z "${SKIP_NPM_CI-}" ]; then
  echo "[build-apk] Running npm ci (this may take a while)..." | tee -a "$LOG_FILE"
  (cd "$ROOT_DIR" && npm ci) 2>&1 | tee -a "$LOG_FILE"
else
  echo "[build-apk] SKIP_NPM_CI is set — skipping npm ci" | tee -a "$LOG_FILE"
fi

echo "[build-apk] Running Gradle assembleRelease..." | tee -a "$LOG_FILE"
cd "$ROOT_DIR/android"

# Run Gradle and capture output to apks/build.log
./gradlew clean assembleRelease -x lint --no-daemon --console=plain 2>&1 | tee -a "$LOG_FILE"

echo "[build-apk] Build finished — collecting APKs" | tee -a "$LOG_FILE"

cd "$ROOT_DIR"
GIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo 'nogit')"
TS="$(date +%Y%m%d-%H%M%S)"

FOUND=0
while IFS= read -r -d '' apk; do
  FOUND=1
  base="$(basename "$apk")"
  name="${base%.*}-$GIT_SHA-$TS.apk"
  cp -v "$apk" "$APKS_DIR/$name" | tee -a "$LOG_FILE"
done < <(find "$ROOT_DIR/android/app/build/outputs/apk" -type f -name "*.apk" -print0 || true)

if [ "$FOUND" -eq 0 ]; then
  echo "[build-apk] No APKs found under android/app/build/outputs/apk — check logs: $LOG_FILE" | tee -a "$LOG_FILE"
  exit 1
fi

echo "[build-apk] Writing artifacts manifest" | tee -a "$LOG_FILE"
ls -la "$APKS_DIR" | tee -a "$LOG_FILE" > "$APKS_DIR/artifacts.txt"

echo "[build-apk] Done — APK(s) available in: $APKS_DIR" | tee -a "$LOG_FILE"
echo "[build-apk] Last line of build log:" | tee -a "$LOG_FILE"
tail -n 20 "$LOG_FILE" | tee -a "$LOG_FILE"

exit 0
