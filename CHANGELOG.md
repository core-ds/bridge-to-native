### 0.0.9 ([528ed6b](https://github.com/core-ds/bridge-to-native/commit/528ed6b)) (20-02-2024)

### Features
- Улучшена работы методов visitExternalUrl и getExternalLinkProps в android > 10.35.0.
- Добавлен новый метод checkAndroidAllowOpenInNewWebview

### 0.0.8 ([7a01c27](https://github.com/core-ds/bridge-to-native/commit/7a01c27)) (20-02-2024)

### Features
- Дополнен файл CODEOWNERS.
- Покрыт тестом метод closeWebview.
- Добавлен метод handleNativeDeeplink.
- Исправлены импорты необходимых модулей на один уровень.
### BREAKING CHANGES
- Убрано property nativeFeaturesFts и все что с ним связано.
- Добавлен метод pseudoReloadPage вместо неработающего reloadPage.

### 0.0.7 ([ac71c88](https://github.com/core-ds/bridge-to-native/commit/ac71c88)) (13-02-2024)

### Features
- Добавлена логика по автоматическому выпуску beta версий при наличии строки deploy_beta в сообщении коммита.

