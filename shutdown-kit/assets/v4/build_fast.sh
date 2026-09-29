#!/usr/bin/env bash
# Parallel asset build: one headless Blender per category, all CPU cores busy.
# Usage: ./build_fast.sh [path/to/blender]
set -u
cd "$(dirname "$0")"
BLENDER="${1:-$HOME/Downloads/blender-5.2.2-linux-x64/blender}"
GROUPS=(machinery environment core equipment effect character)
mkdir -p /tmp/v4-build
start=$(date +%s)
for g in "${GROUPS[@]}"; do
  "$BLENDER" -b --factory-startup --python-exit-code 1 -P source/complete_library.py -- --group "$g" \
    > "/tmp/v4-build/$g.log" 2>&1 &
done
fails=0
for job in $(jobs -p); do wait "$job" || fails=$((fails+1)); done
cat /tmp/v4-build/*.log > /tmp/build.log
echo "Done in $(( $(date +%s) - start ))s | failed groups: $fails"
echo "EXPORTED: $(grep -c '^EXPORTED' /tmp/build.log)"
echo "OVER BUDGET:"; grep 'OVER BUDGET' /tmp/build.log || echo "  none"
grep -h 'Error\|Traceback' /tmp/v4-build/*.log | head -5
python3 source/scene_recipes.py && python3 source/build_ui.py
