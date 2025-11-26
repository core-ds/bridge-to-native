#!/bin/bash
changelog_file="CHANGELOG.md";
new_line="
";
separator="
- ";

# Генерирует title для записи в changelog в формате: # 2.2.8 (24ewe456) (01.01.2024)
function generateTitle {
  gmt_time=$(TZ="GMT+3" date +%d-%m-%Y);

  echo "## $VERSION ([$SHA_SHORT]($LAST_COMMIT_URL)) ($gmt_time)"
};

# Берем описание changelog из github релиза
RELEASE_BODY=$(jq -r '.release.body' "$GITHUB_EVENT_PATH")

if [[ -z "$RELEASE_BODY" ]]; then
  echo "⚠️ В release body нет описания изменений для заполнения $changelog_file." >> "$GITHUB_STEP_SUMMARY"
else
  echo "$RELEASE_BODY" >> "$GITHUB_STEP_SUMMARY"
fi

Title=$(generateTitle)

fullChangelogInfo="$Title
$RELEASE_BODY
"

# Отправляет информацию о релизе и содержимое .public в github release
function postReleaseMessage {
  body=$(echo "$Changelog" | jq -sR '')

  response=$(
    curl -L \
        -X POST \
        -H "Accept: application/vnd.github+json" \
        -H "Authorization: Bearer $BOT_TOKEN" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "https://api.github.com/repos/$REPOSITORY/releases" \
        -d "{
          \"tag_name\": \"$VERSION\",
          \"target_commitish\": \"$BRANCH\",
          \"name\": \"$VERSION\",
          \"body\": $body,
          \"draft\": false,
          \"prerelease\": false,
          \"generate_release_notes\": false
        }"
  )

  release_id=$(echo "$response" | jq -r '.id')

  archive_name="release-$VERSION.zip"

  zip -j "$archive_name" .publish/*

  curl -L \
    -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer $BOT_TOKEN" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    -H "Content-Type: application/octet-stream" \
    "https://uploads.github.com/repos/$REPOSITORY/releases/$release_id/assets?name=$archive_name" \
    --data-binary "@$archive_name"
}

postReleaseMessage

echo "$fullChangelogInfo" | cat - "$changelog_file" > temp && mv temp "$changelog_file"

echo "# Выпущена новая версия библиотеки: $VERSION" >> "$GITHUB_STEP_SUMMARY"
