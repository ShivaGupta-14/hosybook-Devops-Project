#!/usr/bin/env bash
set -e

URL=${1:-http://hosybook.local}
COUNT=${2:-300}

echo "sending $COUNT requests to $URL"
for i in $(seq 1 "$COUNT"); do
  curl -s -o /dev/null "$URL/api/appointments" &
  curl -s -o /dev/null "$URL/api/appointments/stats" &
  curl -s -o /dev/null "$URL/api/appointments/99999" &
  if (( i % 20 == 0 )); then
    wait
    echo "$i done"
  fi
done
wait
echo "finished"
