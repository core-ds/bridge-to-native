# 1.3.2 ([9f562ad](https://github.com/core-ds/bridge-to-native/commit/9f562ad)) (07-04-2026)
## Bugfixes

* Исправлен сценарий с переходами «назад» после нескольких переходов «вперёд» с помощью `navigateServerSide`.
* Исправлено определение версии NA, когда запрос не содержит информации об этом (берём из куки, в которой ранее это сохранили).

# 1.3.1 ([81ae1c0](https://github.com/core-ds/bridge-to-native/commit/1614f20)) (20-03-2026)

### Features

- Изменен процесс релиза библиотеки

### 1.2.1 ([4b161a7](https://github.com/core-ds/bridge-to-native/commit/4b161a7)) (11-03-2026)

### Features

- Добавлено обновление куки всегда, кроме случая вызова reload()

## 1.2.0 ([6fa0bec](https://github.com/core-ds/bridge-to-native/commit/6fa0bec)) (11-02-2026)

### Features

- Добавлено свойство webviewLaunchTime, где будет храниться значение заголовка webview-launch-time, полученное от АМ

## 1.1.0 ([bfe7607](https://github.com/core-ds/bridge-to-native/commit/bfe7607)) (26-01-2026)

### Features

- Миграция с yarn classic (1.22) на yarn Berry (4.12)

### 1.0.2 ([b6683a7](https://github.com/core-ds/bridge-to-native/commit/b6683a7)) (26-01-2026)

### Features

- Изменен метод reload и регулярное выражение для iosAppId.

### 1.0.1 ([52d25f0](https://github.com/core-ds/bridge-to-native/commit/52d25f0)) (12-11-2025)

### Features

- Добавлено обновление cookie с данными о нативном приложении при изменении темы

# 1.0.0 ([73a6886](https://github.com/core-ds/bridge-to-native/commit/73a6886)) (17-09-2025)

### Features

- Добавлена серверная логика в Библиотеку, без которой Библиотека не самодостаточна.
- Упрощен интерфейс Библиотеки.
- Добавлен `README.md`.
- Обновлены зависимости, удалены лишние.
- Доработана конфигурация;

### Bug Fixes

- Починены `eslint` и `prettier`, теперь работуют;

#### BREAKING CHANGES

##### Ломающие изменения есть только в клиентской части (серверного кода просто не было)

1. Конструктор B2N теперь **не принимает**:

    - ~`handleRedirect`~ — это была «локальная 🅰️ тема» (убрано в пользу унифицированного интерфейса `browserHistoryApiWrappers`).
    - ~`blankPagePath`~ — это была «локальная 🅰️ тема», нужная для `pseudoReloadPage`, который больше не нужен.
    - ~`nativeParams`~ — B2N теперь сам получает всё, что ему нужно из cookie.

2. Конструктор B2N теперь **принимает** _опциональные_ параметры:

    - `browserHistoryApiWrappers` — обёртка над `history.pushState` и `history.go` методами, которая вызывает специфичные для использования в конкретном фреймворке/библиотеке методы навигации.
    - `logError` — обёртка над функциями логирования, с помощью которых B2N сможет логировать свои ошибки.

3. B2N теперь предоставляет пользователям Библиотеки все методы напрямую (прокси из другого сервиса + описание).

4. Свойство `iosAppId` переименовано в `appId` (для удобства теперь есть и в андроид окружении).

5. Новое свойство `wasNativeParamsDataFailedToRead` — флаг, на случай если не удалось прочитать данные о NA из cookie.

6. ❌ ~`NativeFallbacks: getExternalLinkProps()`~ удалён (это Реакт специфика).

7. 🔄 `NativeFallbacks: openPdf()` — убрана часть с заменой URL для вызова мидл-ручки, т.к. это локальная специфика.

8. ❌ ~`NativeFallbacks: visitExternalResource()`~ удалён. Изначально задумывался как метод открытия в браузере с фолбэком открытия в WV (где невозможно открыть в браузере). Потом оброс свойством `forceOpenInWebview` и все стали путаться, зачем он нужен. Вместо него теперь два новых метода — `openInBrowser` и `openInNewWebview`, назначение которых явно прописано в названии.

9. 🔄 `NativeNavigationAndTitle: goBackAFewSteps()` переименован в `goBackAFewStepsClientSide()`, чтобы явно указать, что его можно использовать только в рамках SPA навигации.

10. ❌ ~`NativeNavigationAndTitle: handleRedirect()`~ удалён. Это прямо переехавшая локальная специфика из 🅰️. Вместо этого метода в B2N теперь есть `navigateClientSide()`.

11. 🔄 `NativeNavigationAndTitle: navigateInsideASharedSession()` переименован в `navigateServerSide`. Также изменена реализация.

12. 🔄 `NativeNavigationAndTitle: pseudoReloadPage()` переименован в `reload`. Больше не использует локальную специфику (спец. маршрут).

13. 🔄 `NativeNavigationAndTitle: handleNativeDeeplink()` — у метода переименован второй аргумент `closeIOSWebviewBeforeCallNativeDeeplinkHandler` → `closeWebviewBeforeCallNativeDeeplinkHandler`, он влияет теперь и на Андроид окружение. Связано это с тем, что в новых версиях NA на Android теперь не закрываются WV при открытии нового экрана и этот аргумент теперь будет влиять и на эти версии.

### 0.2.2 ([7121d08](https://github.com/core-ds/bridge-to-native/commit/7121d08)) (02-06-2025)

#### Bug Fixes

- Исправлена версия для фичи savedBackStack

### 0.2.1 ([a20e585](https://github.com/core-ds/bridge-to-native/commit/a20e585)) (02-06-2025)

## 0.2.0 ([607be9e](https://github.com/core-ds/bridge-to-native/commit/607be9e)) (26-05-2025)

#### Features

- Добалено свойство savedBackStack (информация о версии android приложения, с которой доступно открытие последующего webview без закрытия текущего

## 0.1.0 ([1dd9cd9](https://github.com/core-ds/bridge-to-native/commit/1dd9cd9)) (07-02-2025)

#### Features

- Добавлена Esm сборка

### 0.0.13 ([c1d56d9](https://github.com/core-ds/bridge-to-native/commit/c1d56d9)) (29-08-2024)

#### Bug Fixes

- Починен метод b2n.restorePreviousState, который ранее не восстанавливал ссылку на handleRedirect.

### 0.0.12 ([4f99466](https://github.com/core-ds/bridge-to-native/commit/4f99466)) (30-05-2024)

#### Bug Fixes

- Добавлен fallback для открытия pdf через метод window.location.replace так как b2n.nativeFallbacks.openPdf открывал PDF файлы глобальным методом window.open что на IOS не отрабатывало.

### 0.0.11 ([56b4422](https://github.com/core-ds/bridge-to-native/commit/56b4422)) (25-04-2024)

#### Bug Fixes

- Пофикшен баг с потерей контекста в утилите getExternalLinkProps

### 0.0.10 ([1acbaee](https://github.com/core-ds/bridge-to-native/commit/1acbaee)) (02-04-2024)

#### Features

- Интерфейс утилиты handleRedirect дополнен еще одним необязательным параметром **historyState**

### 0.0.9 ([528ed6b](https://github.com/core-ds/bridge-to-native/commit/528ed6b)) (20-02-2024)

#### Features

- Улучшена работы методов visitExternalUrl и getExternalLinkProps в android > 10.35.0.
- Добавлен новый метод checkAndroidAllowOpenInNewWebview

### 0.0.8 ([7a01c27](https://github.com/core-ds/bridge-to-native/commit/7a01c27)) (20-02-2024)

#### Features

- Дополнен файл CODEOWNERS.
- Покрыт тестом метод closeWebview.
- Добавлен метод handleNativeDeeplink.
- Исправлены импорты необходимых модулей на один уровень.

#### BREAKING CHANGES

- Убрано property nativeFeaturesFts и все что с ним связано.
- Добавлен метод pseudoReloadPage вместо неработающего reloadPage.

### 0.0.7 ([ac71c88](https://github.com/core-ds/bridge-to-native/commit/ac71c88)) (13-02-2024)

#### Features

- Добавлена логика по автоматическому выпуску beta версий при наличии строки deploy_beta в сообщении коммита.
