### 0.2.1 ([a20e585](https://github.com/core-ds/bridge-to-native/commit/a20e585)) (02-06-2025)


## 0.2.0 ([607be9e](https://github.com/core-ds/bridge-to-native/commit/607be9e)) (26-05-2025)

### Features
- Добалено свойство savedBackStack (информация о версии android приложения, с которой доступно открытие последующего webview без закрытия текущего

## 0.1.0 ([1dd9cd9](https://github.com/core-ds/bridge-to-native/commit/1dd9cd9)) (07-02-2025)

### Features
- Добавлена Esm сборка

### 0.0.13 ([c1d56d9](https://github.com/core-ds/bridge-to-native/commit/c1d56d9)) (29-08-2024)

### Bug Fixes
- Починен метод b2n.restorePreviousState, который ранее не восстанавливал ссылку на handleRedirect.

### 0.0.12 ([4f99466](https://github.com/core-ds/bridge-to-native/commit/4f99466)) (30-05-2024)

### Bug Fixes
- Добавлен fallback для открытия pdf через метод window.location.replace так как b2n.nativeFallbacks.openPdf открывал PDF файлы глобальным методом window.open что на IOS не отрабатывало.

### 0.0.11 ([56b4422](https://github.com/core-ds/bridge-to-native/commit/56b4422)) (25-04-2024)

### Bug Fixes
- Пофикшен баг с потерей контекста в утилите getExternalLinkProps

### 0.0.10 ([1acbaee](https://github.com/core-ds/bridge-to-native/commit/1acbaee)) (02-04-2024)

### Features
- Интерфейс утилиты  handleRedirect дополнен еще одним необязательным параметром **historyState**

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

