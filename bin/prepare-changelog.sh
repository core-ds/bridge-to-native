#!/bin/bash
changelog_file="CHANGELOG.md";

# Генерирует title для записи в changelog в формате: # 2.2.8 (24ewe456) (01.01.2024)
function generateTitle {
  gmt_time=$(TZ="GMT+3" date +%d-%m-%Y);

  echo "# $VERSION ([$SHA_SHORT]($LAST_COMMIT_URL)) ($gmt_time)"
};

# Описание changelog из github релиза
RELEASE_BODY=$(jq -r '.release.body' "$GITHUB_EVENT_PATH")

# Передает в summary информацию о Features, Bug Fixes, BREAKING CHANGES, или об ее отсутствии
if [[ -z "$RELEASE_BODY" ]]; then
  echo "В release body нет описания изменений для заполнения $changelog_file." >> "$GITHUB_STEP_SUMMARY"
else
  echo "$RELEASE_BODY" >> "$GITHUB_STEP_SUMMARY"
fi

Title=$(generateTitle)

fullChangelogInfo="$Title
$RELEASE_BODY
"

echo "$fullChangelogInfo" | cat - "$changelog_file" > temp && mv temp "$changelog_file"

echo "# Выпущена новая версия библиотеки: $VERSION" >> "$GITHUB_STEP_SUMMARY"
