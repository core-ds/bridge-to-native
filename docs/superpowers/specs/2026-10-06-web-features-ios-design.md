# Внедрение методов WebFeatures v1.0.0 (iOS)

**Дата:** 2026-10-06
**Статус:** черновик на ревью
**Связанные документы:**
- Confluence: `[DRAFT] Методы взаимодействия веб-натив в WebFeatures v1.0.0`
  (space `DARPPNEW`, pageId `3863034507`)
- `AGENTS.md` (запрет на расширение публичного API)
- `README.md`, `CLIENT_SERVER_INTERACTION.md`

## 1. Цель

Добавить в библиотеку `bridge-to-native` поддержку набора методов модуля
**WebFeatures** нативного приложения на iOS, начиная с версии АМ **17.0.0**.

Модуль описывает транспорт «веб → натив» через `window.nativeBridge.send` и
ответ на запросы типа *call* через `window.webBridge.callback`.

## 2. Ограничения и контекст

- Доработка касается **только iOS**. На Android эти возможности отсутствуют.
- Гейт доступности — версия АМ `>= 17.0.0`. Часть команд дополнительно управляется
  нативными фича-тоглами (`webViewHapticsIOS`, `mainSuperAppIOS`), но веб их
  проверить не может — при выключенном тогле натив сам игнорирует команду.
- **Публичный API расширять нельзя** (см. `AGENTS.md`). Разрешённые экспорты:
  - `client`: `BridgeToNative` + существующие pure-функции и типы;
  - `client/primitives`: те же pure-функции и типы;
  - `server`: без изменений.
  Новые возможности добавляются **методами на `BridgeToNative`**, новых
  именованных экспортов не появляется.
- Введённый ранее фича-ключ `geolocation` к текущей задаче **отношения не имеет**
  (это другая функция) и не переиспользуется.

## 3. Контракт WebFeatures v1.0.0

### 3.1 Транспорт

Единая точка отправки сообщений в натив:

```js
window.nativeBridge.send(action, requestId, data, kind = 'send')
```

Тело сообщения:

```json
{ "kind": "call" | "send", "action": "...", "requestId": "...", "data": { ... } }
```

- iOS: `window.webkit.messageHandlers.bridge.postMessage(body)`
- Android: `window.Android.send(JSON.stringify(body))`
- Нет моста: сообщение логируется, вызов не падает.
- `kind: 'call'` — натив отвечает через `window.webBridge.callback`.
- `kind: 'send'` — fire-and-forget, ответа нет.

Ответ на call:

```js
window.webBridge.callback(requestId, { data, error })
```

- Успех: `{ data: {...}, error: null }`
- Ошибка: `{ data: null, error: { code, message } }`

### 3.2 Методы

| action | kind | data | Поведение |
| --- | --- | --- | --- |
| `geo.configuration` | call | `{}` или `null` | Возвращает статус доступа к геолокации и координаты (при разрешении) |
| `haptics.vibrate` | send | `{ type, intensity? }` | Тактильный отклик |
| `sheet.setDragArea` | send | `{ area }` | Область перетаскивания нативной шторы |
| `tabbar.hide` | send | `{}` | Скрыть нативный таббар |
| `tabbar.show` | send | `{ selectedId? }` | Показать таббар и выбрать вкладку |

Ответ `geo.configuration`:

```ts
{
  permission: 'allowed' | 'denied' | 'notDetermined' | 'restricted';
  userCoordinate: { latitude: number; longitude: number } | null;
}
```

Ошибка `geo.configuration`: `code: 1` — конфигурация геолокации недоступна.

Типы тактильного отклика:

- impact: `light`, `medium`, `heavy`, `soft`, `rigid` (учитывают `intensity`);
- notification: `success`, `warning`, `error`;
- selection: `selection`.

`intensity` — `0...1`, применяется только к impact-типам.

Области шторы: `wholeSheet` (по умолчанию), `navigationBar`.

## 4. Архитектура решения

### 4.1 Новые модули

```
src/client/services-and-utils/
├── native-bridge-service.ts   # транспорт: send/call, webBridge.callback, таймауты
└── web-features-service.ts    # типизированные методы + гейт по версии
```

#### `NativeBridgeService` (транспорт)

Единая ответственность — отправка сообщений в натив и обработка ответов на call.

- `send(action, data): void` — отправляет `kind: 'send'`, fire-and-forget.
- `call<Data>(action, data): Promise<Data>` — отправляет `kind: 'call'`,
  возвращает `Promise`, который:
  - резолвится `data` при `{ data, error: null }`;
  - реджектится при `error`, при отсутствии моста и по таймауту.
- Генерирует `requestId` (`crypto.randomUUID()` с фолбэком на счётчик).
- Держит `Map<requestId, { resolve, reject, timeoutId }>` ожидающих вызовов.
- Устанавливает `window.webBridge.callback`, маршрутизирует ответы по `requestId`.
  Ранее установленный сторонний `callback` сохраняется и вызывается для
  неизвестных `requestId` (не затираем чужой обработчик).
- Константа таймаута — модульная (например, `CALL_TIMEOUT_MS = 10_000`).

#### `WebFeaturesService` (домен)

Зависит от `NativeParamsService` (платформа/версия) и `NativeBridgeService`.
Инкапсулирует гейт `iOS >= 17.0.0` и типизированные вызовы методов.
Это позволяет тестировать доменную логику отдельно от транспорта.

### 4.2 Гейты (отдельная структура)

Так как эти обработчики относятся и к `call`, и к `send`, для них вводится
**отдельная структура версий**, не смешанная с `NativeFeatureKey`:

```ts
// types.ts (локальный тип)
export type WebFeatureAction =
  | 'geo.configuration'
  | 'haptics.vibrate'
  | 'sheet.setDragArea'
  | 'tabbar.hide'
  | 'tabbar.show';

// constants.ts
export const WEB_FEATURES_FROM_VERSION: Readonly<
  Record<WebFeatureAction, { ios: string }>
> = {
  'geo.configuration': { ios: '17.0.0' },
  'haptics.vibrate': { ios: '17.0.0' },
  'sheet.setDragArea': { ios: '17.0.0' },
  'tabbar.hide': { ios: '17.0.0' },
  'tabbar.show': { ios: '17.0.0' },
};
```

Гейт-функция (в `native-features.ts`):

```ts
canUseWebFeature(platform, appVersion, action): boolean
// platform === 'ios' && isVersionHigherOrEqual(appVersion, fromVersion)
```

Каждая команда помечена версией `17.0.0`; при появлении в будущем более поздних
версий для отдельных `action` структура это выразит без изменения публичного API.

### 4.3 Публичные методы на `BridgeToNative` (краткие имена)

| Метод | Сигнатура (внешняя) | action |
| --- | --- | --- |
| `getGeoConfiguration` | `(): Promise<WebFeaturesGeoConfiguration>` | `geo.configuration` (call) |
| `vibrate` | `(options: WebFeaturesHapticsOptions): void` | `haptics.vibrate` (send) |
| `setSheetDragArea` | `(area: WebFeaturesSheetDragArea): void` | `sheet.setDragArea` (send) |
| `hideTabbar` | `(): void` | `tabbar.hide` (send) |
| `showTabbar` | `(selectedId?: string): void` | `tabbar.show` (send) |

Поведение в несовместимом окружении (Android или iOS `< 17.0.0`):

- `send`-методы — **тихий no-op** (согласовано с «натив сам игнорирует»);
- `getGeoConfiguration` — **`Promise.reject(...)`** с понятной ошибкой.

### 4.4 Типы

Новые типы параметров и результатов — **локальные** (не экспортируются ни из
`client`, ни из `client/primitives`). Потребитель выводит их через сигнатуры
методов (`Parameters`/`ReturnType`/`Awaited`). Именованных импортов не добавляем —
это соответствует `AGENTS.md`.

```ts
type WebFeaturesGeoPermission = 'allowed' | 'denied' | 'notDetermined' | 'restricted';
type WebFeaturesUserCoordinate = { latitude: number; longitude: number };
type WebFeaturesGeoConfiguration = {
  permission: WebFeaturesGeoPermission;
  userCoordinate: WebFeaturesUserCoordinate | null;
};
type WebFeaturesHapticsType =
  | 'light' | 'medium' | 'heavy' | 'soft' | 'rigid'
  | 'success' | 'warning' | 'error' | 'selection';
type WebFeaturesHapticsOptions = { type: WebFeaturesHapticsType; intensity?: number };
type WebFeaturesSheetDragArea = 'wholeSheet' | 'navigationBar';
```

### 4.5 Глобальные объявления (`global.d.ts`)

```ts
interface Window {
  Android?: {
    setPageSettings: (params: string) => void;
    send?: (body: string) => void; // транспорт WebFeatures (в текущей задаче не используется)
  };
  nativeBridge?: { send: (action, requestId, data, kind) => void };
  webBridge?: { callback?: (requestId, payload) => void };
  webkit?: {
    messageHandlers?: {
      bridge?: { postMessage: (body: unknown) => void };
    };
  };
}
```

`window.nativeBridge` B2N **не создаёт** — по контракту его определяет WA; B2N
лишь использует его, если он есть (доступ к мосту через `window.nativeBridge.send`).

### 4.6 Изменяемые файлы

| Файл | Изменение |
| --- | --- |
| `src/client/types.ts` | Локальные типы WebFeatures, `WebFeatureAction` |
| `src/client/constants.ts` | `WEB_FEATURES_FROM_VERSION`, имена action и т.п. |
| `src/client/services-and-utils/native-features.ts` | `canUseWebFeature` |
| `src/client/services-and-utils/native-bridge-service.ts` | **новый** транспорт |
| `src/client/services-and-utils/web-features-service.ts` | **новый** доменный сервис |
| `src/client/bridge-to-native.ts` | 5 новых публичных методов + JSDoc |
| `src/client/global.d.ts` | объявления `nativeBridge`/`webBridge`/`webkit` |
| `README.md` | раздел о WebFeatures-методах |

Экспортные точки `src/client/index.ts` и `src/client/primitives.ts`
**не меняются**. `src/query-and-headers-keys.ts` не затрагивается: поля
bridge-сообщений (`kind`/`action`/`requestId`/`data`) — не заголовки и не
query-параметры; их константы живут в модуле WebFeatures.

## 5. Обработка ошибок

- Нет моста (`window.nativeBridge.send` отсутствует) при `call` → reject.
- Таймаут ответа на `call` → reject (`...: request timeout`).
- Ошибка от натива (`error`) → reject; сообщение формируется из `error.code` и
  `error.message`, код сохраняется в свойстве ошибки.
- Ошибки логируются через переданный `logError` (если задан); транспорт не
  бросает синхронных исключений наружу.

## 6. Тестирование

**`__tests__/client/services-and-utils/native-bridge-service.test.ts`**
- iOS: `send` кладёт корректное тело в `window.webkit.messageHandlers.bridge.postMessage`.
- Android: `send` вызывает `window.Android.send` с JSON-строкой.
- Нет моста: вызов не падает, пишет в `console.error`.
- `call`: резолвится при ответе `webBridge.callback` с нужным `requestId`.
- `call`: реджектится при `error`.
- `call`: реджектится по таймауту (fake timers).
- `webBridge.callback` не затирает ранее установленный сторонний обработчик.

**`__tests__/client/services-and-utils/web-features-service.test.ts`**
- Гейт: Android → no-op/reject; iOS `< 17.0.0` → no-op/reject;
  iOS `>= 17.0.0` → вызов транспорта с правильными `action` и `data`.
- `vibrate` передаёт `type`/`intensity`; без `intensity` — только `type`.
- `setSheetDragArea`/`showTabbar`/`hideTabbar` формируют корректный `data`.
- `getGeoConfiguration` резолвится данными натива и реджектится при гейте.

**`__tests__/client/bridge-to-native.test.ts`**
- Проксирование: методы фасада делегируют в `WebFeaturesService`.
- Публичный API не изменился: новые экспорты отсутствуют.

## 7. Что вне области

- Изменение существующего ключа `geolocation`.
- Поддержка WebFeatures на Android.
- Проверка нативных фича-тоглов на стороне веба.
- `tabbar.setBadge` (в WebFeatures игнорируется).
- Событие `emit` из натива (в WebFeatures пока не используется).
- Экспорт новых именованных типов из публичных точек входа.

## 8. Критерии готовности

1. Пять методов доступны на `BridgeToNative` с описанным поведением.
2. В несовместимом окружении `send`-методы не делают ничего, `getGeoConfiguration`
   реджектится.
3. Публичная export-поверхность (`client`, `client/primitives`, `server`) не
   расширена.
4. Все новые и существующие тесты проходят (`yarn test`), lint/format — чисто.
5. README описывает новые методы и их ограничения.

## 9. Поставка (delivery)

После завершения реализации:

1. Работы ведутся в отдельной ветке от актуального `main`.
2. Открыть Pull Request в GitHub
   (`core-ds/bridge-to-native`) с описанием изменений.
3. Отправить ссылку на PR **Демидову Артему Николаевичу** (`ademidov3@alfabank.ru`)
   в **А-Чате** (через MCP-инструменты namespace `achat`).
   Перед отправкой убедиться в корректности получателя (поиск контакта/диалога).