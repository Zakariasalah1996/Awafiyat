#!/usr/bin/env bash
# Verify release-critical manifest declarations in the final signed AAB.
# Usage: verify-final-android-aab.sh <bundle.aab> [expected.versionCode]
set -euo pipefail

bundle="${1:?Usage: $0 <bundle.aab> [expected.versionCode]}"
expected_version_code="${2:-}"
bundletool_jar="${BUNDLETOOL_JAR:-/home/ubuntu/tools/bundletool-all-1.17.2.jar}"
manifest="$(mktemp)"
trap 'rm -f "$manifest"' EXIT

if [[ ! -f "$bundle" || ! -f "$bundletool_jar" ]]; then
  echo "Missing AAB or bundletool JAR." >&2
  exit 2
fi

java -jar "$bundletool_jar" dump manifest --bundle="$bundle" --module=base > "$manifest"

if ! grep -Fq 'android:name="com.google.android.gms.permission.AD_ID"' "$manifest"; then
  echo "Missing required AD_ID permission in final AAB manifest." >&2
  exit 1
fi

if grep -qE 'android.permission.FOREGROUND_SERVICE|foregroundServiceType=' "$manifest"; then
  echo "Unexpected foreground-service declaration remains in final AAB manifest." >&2
  grep -nE 'android.permission.FOREGROUND_SERVICE|foregroundServiceType=' "$manifest" >&2
  exit 1
fi

package_name="$(sed -n 's/.* package="\([^"]*\)".*/\1/p' "$manifest" | head -1)"
version_code="$(sed -n 's/.*android:versionCode="\([^"]*\)".*/\1/p' "$manifest" | head -1)"
version_name="$(sed -n 's/.*android:versionName="\([^"]*\)".*/\1/p' "$manifest" | head -1)"

if [[ "$package_name" != "io.awafiyat.health" ]]; then
  echo "Unexpected Android package: $package_name" >&2
  exit 1
fi

if [[ -n "$expected_version_code" && "$version_code" != "$expected_version_code" ]]; then
  echo "Expected versionCode $expected_version_code; found $version_code." >&2
  exit 1
fi

printf 'PASS\npackage=%s\nversionName=%s\nversionCode=%s\nAD_ID=present\nforegroundServicePermissions=absent\n' \
  "$package_name" "$version_name" "$version_code"
