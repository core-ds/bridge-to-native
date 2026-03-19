#!/bin/bash
VERSION=$(jq -r '.version' package.json)

# Получает id релиза на основе версии
RELEASE_ID=$(curl -s \
  -H "Authorization: Bearer $BOT_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$REPOSITORY/releases/tags/$VERSION" \
  | jq -r '.id')

echo "Загрузка ассетов для релиза $VERSION (id=$RELEASE_ID)"

ARCHIVE="release-$VERSION.zip"
git archive --format=zip --output="$ARCHIVE" HEAD

# Добавляет в релиз архив с актуальными исходниками
echo "::group::Upload asset"
curl -s \
  -X POST \
  -H "Authorization: Bearer $BOT_TOKEN" \
  -H "Content-Type: application/zip" \
  "https://uploads.github.com/repos/$REPOSITORY/releases/$RELEASE_ID/assets?name=$ARCHIVE" \
  --data-binary "@$ARCHIVE"
echo "::endgroup::"
