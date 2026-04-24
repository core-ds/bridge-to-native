# Client-server flow внутри B2N

Этот документ схематично описывает, как внутри библиотеки связаны серверная и клиентская части, какие данные переносятся между ними и как это влияет на навигацию WebView.

Документ дополняет `README.md`: здесь фокус не на публичном API, а на внутренних сущностях и transport-данных, которые проходят через request, response, cookie и `sessionStorage`.

## Публичные surface библиотеки

- `@alfalab/bridge-to-native/server`
    - `isWebviewEnv`
    - `prepareNativeAppDetailsForClient`
- `@alfalab/bridge-to-native/client`
    - `BridgeToNative`

## Ключевые сущности

- `prepareNativeAppDetailsForClient`
    - Серверная точка входа. Читает request, собирает из него `NativeParams` (данные о NA), пишет cookie `bridgeToNativeData`.
- `BridgeToNative`
    - Единственная публичная клиентская точка входа. Создает экземпляры внутренних сервисов и
      является фасадом, который проксирует все их публичные методы.
- `BridgeToNative` → `NativeParamsService`
    - Читает `bridgeToNativeData` из cookie и обрабатывает параметры переданные на клиент: `appId`, `appVersion`, `theme`, …
- `BridgeToNative` → `NativeNavigationAndTitleService`
    - Хранит и синхронизирует состояние навигации между WA и NA.
- `BridgeToNative` → `ExternalLinksService`
    - Управляет навигацией пользователя в браузер, нативный экран, новое WV и т.п. через нативные механизмы.

## transport & store сущности

Все используемые библиотекой заголовки и query-параметры, session storage собраны в файле
`src/query-and-headers-keys.ts`. Каждый снабжен комментарием.

## Схема прохождения данных от NA к клиенту WA

<pre>
┌─────────────────────────┐
│  NA (нативное прил.)    │
│                         │
│  Открывает WV и делает  │
│  HTTP-запрос за HTML    │
└───┬─────────────────────┘
    │
    │  headers:  app-version, webview-launch-time
    │  query:    theme, b2n-title, b2n-next-page-id,
    │            applicationId, device_app_version, …
    │  cookie:   bridgeToNativeData (при повторных запросах)
    ▼
┌───────────────────────────────────────────────┐
│  Сервер (SSR)                                 │
│                                               │
│  prepareNativeAppDetailsForClient()           │
│                                               │
│  • Читает headers, query, cookie              │
│  • Собирает NativeParams для клиентского кода │
│  • Пишет Set-Cookie: bridgeToNativeData       │
└───┬───────────────────────────────────────────┘
    │
    │  HTTP-ответ:
    │  Set-Cookie: bridgeToNativeData = {JSON}
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Клиент WA (браузер внутри WV)                              │
│                                                             │
│  NativeParamsService                                        │
│  • Читает document.cookie → bridgeToNativeData              │
│  • Извлекает: appVersion, appId, theme, nextPageId,         │
│    title, environment (ios/android), …                      │
│                             │                               │
│         ┌───────────────────┴──────────────────┐            │
│         ▼                                      ▼            │
│  NativeNavigationAndTitleService    ExternalLinksService    │
│                                                             │
│  • nativeHistoryStack               • Формирует deeplink-и  │
│    ↔ sessionStorage                 • Открывает ссылки      │
│    (сохраняет стек                    в браузере / новом WV │
│     при навигации)                    с учётом версии       │
│                                                             │
│  • syncHistoryWithNative()                                  │
│    Android → AndroidBridge.setPageSettings()                │
│    iOS     → location.replace('ios:setPageSettings/…')      │
└───┬─────────────────────────────────────────────────────────┘
    │
    │  pageId, pageTitle (управление нативным UI)
    ▼
┌─────────────────────────┐
│  NA (нативное прил.)    │
└─────────────────────────┘
</pre>
