# WebFeatures v1.0.0 (iOS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в `@alfalab/bridge-to-native` пять методов модуля WebFeatures (iOS, АМ ≥ 17.0.0), не расширяя публичную export-поверхность.

**Architecture:** Новый транспорт `NativeBridgeService` (send/call + `webBridge.callback` + таймаут) и доменный `WebFeaturesService` (гейт `iOS ≥ 17.0.0` + типизированные вызовы). Фасад `BridgeToNative` проксирует пять кратких методов. Новые типы — локальные, не экспортируются.

**Tech Stack:** TypeScript 5.5, Jest (`arui-scripts test`), happy-dom, Yarn 4, Node 20.19.2 (`.nvmrc`).

**Spec:** `docs/superpowers/specs/2026-10-06-web-features-ios-design.md`

## Global Constraints

- Публичные экспорты (`src/client/index.ts`, `src/client/primitives.ts`, `src/server/index.ts`) НЕ меняются. Новых именованных экспортов не добавлять.
- Методы доступны только на iOS при `appVersion >= 17.0.0`; иначе `send`-методы — no-op, `getGeoConfiguration` — reject.
- `window.nativeBridge` B2N не создаёт: использует, если WA определил; иначе отправляет напрямую (iOS `window.webkit.messageHandlers.bridge.postMessage`, Android `window.Android.send`). Глобалы не мутирует.
- Типы WebFeatures — локальные (в `src/client/types.ts`), не реэкспортируются.
- Перед любыми Node-командами: `source ~/.nvm/nvm.sh && nvm use`. Только `yarn`.
- Формат: `crypto.randomUUID()` с фолбэком на счётчик. Таймаут call: `CALL_TIMEOUT_MS = 10_000`.
- Тело сообщения: `{ kind, action, requestId, data }`.

## Review Focus

- **Ответ приходит до/после установки `webBridge.callback`.** Ожидание: ответ на неизвестный `requestId` не ломает сервис и вызывается ранее установленный сторонний `callback`.
- **`window.Android` присутствует, но не имеет `send`.** Ожидание: не падать; `call` реджектится, `send` логирует.
- **`getGeoConfiguration` без `userCoordinate`** (`permission: 'denied'`, `userCoordinate: null`). Ожидание: резолвится как есть, не реджектится.
- **Повторный call до ответа.** Ожидание: `requestId` уникальны, ответы маршрутизируются независимо.
- **`intensity` для notification/selection-типов.** Ожидание: значение передаётся нативу как есть; валидацию диапазона B2N не делает.

---

### Task 1: Типы, константы и гейт `canUseWebFeature`

**Files:**
- Modify: `src/client/types.ts`
- Modify: `src/client/constants.ts`
- Modify: `src/client/services-and-utils/native-features.ts`
- Test: `__tests__/client/services-and-utils/native-features.test.ts`

**Interfaces:**
- Produces:
  - `type WebFeatureAction = 'geo.configuration' | 'haptics.vibrate' | 'sheet.setDragArea' | 'tabbar.hide' | 'tabbar.show'`
  - `type WebFeaturesGeoPermission = 'allowed' | 'denied' | 'notDetermined' | 'restricted'`
  - `type WebFeaturesUserCoordinate = { latitude: number; longitude: number }`
  - `type WebFeaturesGeoConfiguration = { permission: WebFeaturesGeoPermission; userCoordinate: WebFeaturesUserCoordinate | null }`
  - `type WebFeaturesHapticsType = 'light' | 'medium' | 'heavy' | 'soft' | 'rigid' | 'success' | 'warning' | 'error' | 'selection'`
  - `type WebFeaturesHapticsOptions = { type: WebFeaturesHapticsType; intensity?: number }`
  - `type WebFeaturesSheetDragArea = 'wholeSheet' | 'navigationBar'`
  - `type WebFeaturesCallbackPayload = { data: unknown; error: { code: number; message: string } | null }`
  - `const WEB_FEATURES_FROM_VERSION: Readonly<Record<WebFeatureAction, { fromVersion: string }>>`
  - `canUseWebFeature(platform: Environment, appVersion: string, action: WebFeatureAction): boolean`

- [ ] **Step 1: Write the failing test**

Добавить в `__tests__/client/services-and-utils/native-features.test.ts` импорт `canUseWebFeature` и новый `describe`:

```ts
describe('canUseWebFeature', () => {
    it.each([
        ['ios', '16.99.99', 'geo.configuration', false],
        ['ios', '17.0.0', 'geo.configuration', true],
        ['ios', '17.2.0', 'haptics.vibrate', true],
        ['ios', 'unknown', 'geo.configuration', false],
        ['ios', '17.0.0', 'tabbar.show', true],
        ['android', '17.0.0', 'geo.configuration', false],
        ['android', '99.0.0', 'haptics.vibrate', false],
    ] as const)(
        'should return for %s `%s` action `%s` → `%s`',
        (platform, appVersion, action, expected) => {
            expect(canUseWebFeature(platform, appVersion, action)).toBe(expected);
        },
    );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use && yarn test native-features`
Expected: FAIL — `canUseWebFeature is not a function` / TS-ошибка импорта.

- [ ] **Step 3: Add the types to `src/client/types.ts`**

Добавить в конец файла типы из `Interfaces` (Task 1, Produces).

- [ ] **Step 4: Add `WEB_FEATURES_FROM_VERSION` to `src/client/constants.ts`**

```ts
export const WEB_FEATURES_FROM_VERSION: Readonly<
    Record<WebFeatureAction, { fromVersion: string }>
> = {
    'geo.configuration': { fromVersion: '17.0.0' },
    'haptics.vibrate': { fromVersion: '17.0.0' },
    'sheet.setDragArea': { fromVersion: '17.0.0' },
    'tabbar.hide': { fromVersion: '17.0.0' },
    'tabbar.show': { fromVersion: '17.0.0' },
};
```

(добавить `WebFeatureAction` в импорт типов из `./types`).

- [ ] **Step 5: Implement `canUseWebFeature` in `src/client/services-and-utils/native-features.ts`**

```ts
export const canUseWebFeature = (
    platform: Environment,
    appVersion: string,
    action: WebFeatureAction,
) => {
    if (platform !== 'ios') {
        return false;
    }

    const { fromVersion } = WEB_FEATURES_FROM_VERSION[action];

    return isVersionHigherOrEqual(
        isValidVersionFormat(appVersion) ? appVersion : '0.0.0',
        fromVersion,
    );
};
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use && yarn test native-features`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/client/types.ts src/client/constants.ts src/client/services-and-utils/native-features.ts __tests__/client/services-and-utils/native-features.test.ts
git commit -m "feat(client): add WebFeatures types, version gates and canUseWebFeature"
```

---

### Task 2: Транспорт `NativeBridgeService`

**Files:**
- Create: `src/client/services-and-utils/native-bridge-service.ts`
- Modify: `src/client/global.d.ts`
- Test: `__tests__/client/services-and-utils/native-bridge-service.test.ts`

**Interfaces:**
- Consumes: `LogError` (`../types`), `WebFeatureAction`, `WebFeaturesCallbackPayload` (Task 1).
- Produces:
  - `class NativeBridgeService`
    - `constructor(logError?: LogError)`
    - `send(action: WebFeatureAction, data: unknown): void`
    - `call<Data>(action: WebFeatureAction, data: unknown): Promise<Data>`
  - `const CALL_TIMEOUT_MS = 10_000`

- [ ] **Step 1: Extend `src/client/global.d.ts`**

```ts
declare global {
    interface Window {
        Android?: {
            setPageSettings: (params: string) => void;
            send?: (body: string) => void;
        };
        /** Транспорт «веб → натив». Определяет WA. */
        nativeBridge?: {
            send: (
                action: string,
                requestId: string,
                data: unknown,
                kind: 'call' | 'send',
            ) => void;
        };
        /** Канал ответов «натив → веб». Обработчик устанавливает B2N. */
        webBridge?: {
            callback?: (requestId: string, payload: WebFeaturesCallbackPayload) => void;
        };
    }
}

export {};
```

- [ ] **Step 2: Write the failing test**

Создать `__tests__/client/services-and-utils/native-bridge-service.test.ts`. Проверить: iOS-отправка, Android-отправка, приоритет `nativeBridge.send`, отсутствие транспорта, resolve/reject call, таймаут (fake timers), сохранение стороннего `callback`.

```ts
import { CALL_TIMEOUT_MS, NativeBridgeService } from '../../../src/client/services-and-utils/native-bridge-service';

describe('NativeBridgeService', () => {
    const originalWindow = window;

    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
        // eslint-disable-next-line no-global-assign
        window = originalWindow;
    });

    it('should send via webkit on iOS', () => {
        const postMessage = jest.fn();
        // эмулировать window.webkit.messageHandlers.bridge
        const inst = new NativeBridgeService();
        inst.send('haptics.vibrate', { type: 'medium' });
        expect(postMessage).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'send', action: 'haptics.vibrate' }),
        );
    });

    it('should prefer window.nativeBridge.send when defined', () => { /* ... */ });

    it('should reject call when no transport available', async () => {
        const inst = new NativeBridgeService();
        await expect(inst.call('geo.configuration', {})).rejects.toThrow();
    });

    it('should resolve call on webBridge.callback success', async () => {
        const inst = new NativeBridgeService();
        const promise = inst.call('geo.configuration', {});
        const requestId = /* поймать из mock транспорта */;
        window.webBridge?.callback?.(requestId, {
            data: { permission: 'allowed', userCoordinate: null },
            error: null,
        });
        await expect(promise).resolves.toEqual({ permission: 'allowed', userCoordinate: null });
    });

    it('should reject call on webBridge.callback error', async () => { /* ... */ });

    it('should reject call on timeout', async () => {
        jest.useFakeTimers();
        const inst = new NativeBridgeService();
        const promise = inst.call('geo.configuration', {});
        jest.advanceTimersByTime(CALL_TIMEOUT_MS);
        await expect(promise).rejects.toThrow();
    });

    it('should preserve a pre-existing webBridge.callback for unknown requestId', () => {
        const existing = jest.fn();
        window.webBridge = { callback: existing };
        const inst = new NativeBridgeService();
        window.webBridge.callback?.('unknown-id', { data: null, error: null });
        expect(existing).toHaveBeenCalledWith('unknown-id', { data: null, error: null });
    });

    it('should not throw when window.Android exists without send', async () => {
        // window.Android определён без метода send
        const inst = new NativeBridgeService();
        expect(() => inst.send('haptics.vibrate', { type: 'medium' })).not.toThrow();
        await expect(inst.call('geo.configuration', {})).rejects.toThrow();
    });

    it('should route independent responses for concurrent calls', async () => {
        const inst = new NativeBridgeService();
        const first = inst.call('geo.configuration', {});
        const second = inst.call('geo.configuration', {});
        const [firstId, secondId] = /* requestId из двух вызовов транспорта, по порядку */;

        window.webBridge?.callback?.(secondId, { data: { order: 'second' }, error: null });
        window.webBridge?.callback?.(firstId, { data: { order: 'first' }, error: null });

        await expect(first).resolves.toEqual({ order: 'first' });
        await expect(second).resolves.toEqual({ order: 'second' });
    });
});
```

Точные детали эмуляции `window.webkit`/`window.Android`/`window.nativeBridge` — по образцу `__tests__/client/services-and-utils/native-params-service.test.ts` (через `window = Object.create(window)` и `Object.defineProperty`).

- [ ] **Step 3: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use && yarn test native-bridge-service`
Expected: FAIL — модуль не найден.

- [ ] **Step 4: Implement `NativeBridgeService`**

Файл `src/client/services-and-utils/native-bridge-service.ts`. Ключевые решения:
- `requestId`: `crypto.randomUUID?.() ?? String(++requestIdCounter)`.
- Транспорт-резолвер:
  - `window.nativeBridge?.send` — если есть, использовать;
  - иначе iOS — `window.webkit?.messageHandlers?.bridge?.postMessage(body)`;
  - иначе Android — `window.Android?.send?.(JSON.stringify(body))`;
  - иначе — `logError` + `console.error`.
- `send(action, data)`: формирует тело с `kind: 'send'`, отправляет; транспорт отсутствует — только логирует (не бросает).
- `call<Data>(action, data)`: если транспорта нет — `Promise.reject(new Error(...))`; иначе тело с `kind: 'call'`, `requestId` кладётся в `pending`, ставится таймаут, при срабатывании — удалить из `pending` и reject.
- В конструкторе установить `window.webBridge = { ...window.webBridge, callback: this.handleCallback }`, сохранив прежний `callback` в приватном поле. `handleCallback(requestId, payload)`: если `requestId` есть в `pending` — снять таймаут, удалить, resolve `payload.data` при `error == null` иначе reject; если нет — вызвать сохранённый чужой `callback`, если он был.

- [ ] **Step 5: Run tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use && yarn test native-bridge-service`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/client/global.d.ts src/client/services-and-utils/native-bridge-service.ts __tests__/client/services-and-utils/native-bridge-service.test.ts
git commit -m "feat(client): add NativeBridgeService transport for WebFeatures"
```

---

### Task 3: Доменный `WebFeaturesService`

**Files:**
- Create: `src/client/services-and-utils/web-features-service.ts`
- Test: `__tests__/client/services-and-utils/web-features-service.test.ts`

**Interfaces:**
- Consumes: `NativeParamsService` (`./native-params-service`), `NativeBridgeService` (Task 2), `canUseWebFeature` (Task 1), типы WebFeatures (Task 1).
- Produces:
  - `class WebFeaturesService`
    - `constructor(nativeParamsService: NativeParamsService, nativeBridgeService: NativeBridgeService)`
    - `getGeoConfiguration(): Promise<WebFeaturesGeoConfiguration>`
    - `vibrate(options: WebFeaturesHapticsOptions): void`
    - `setSheetDragArea(area: WebFeaturesSheetDragArea): void`
    - `hideTabbar(): void`
    - `showTabbar(selectedId?: string): void`

- [ ] **Step 1: Write the failing test**

Создать `__tests__/client/services-and-utils/web-features-service.test.ts` с моками `NativeParamsService` (`environment`, `appVersion`) и `NativeBridgeService` (`send`, `call`):

```ts
describe('WebFeaturesService', () => {
    // helper: создаёт сервис с заданными environment/appVersion и шпионами bridge

    it('should no-op send methods on android', () => { /* vibrate/hideTabbar/showTabbar/setSheetDragArea */ });
    it('should no-op send methods below iOS 17.0.0', () => { /* ... */ });
    it('should call bridge.send with haptics.vibrate and options on iOS 17', () => { /* ... */ });
    it('should omit intensity when not provided', () => { /* ... */ });
    it('should pass intensity for notification type as-is', () => { /* success + intensity: 0.5 → { type: 'success', intensity: 0.5 } */ });
    it('should call bridge.send with sheet.setDragArea / tabbar.hide / tabbar.show', () => { /* ... */ });
    it('should reject getGeoConfiguration on android and below iOS 17.0.0', async () => { /* ... */ });
    it('should resolve getGeoConfiguration with native data on iOS 17', async () => { /* ... */ });
    it('should resolve getGeoConfiguration with userCoordinate null when permission is denied', async () => {
        // bridge.call резолвится { permission: 'denied', userCoordinate: null } — метод не реджектится
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use && yarn test web-features-service`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Implement `WebFeaturesService`**

- Приватный `isAvailable(action)` вызывает `canUseWebFeature(this.nativeParamsService.environment, this.nativeParamsService.appVersion, action)`.
- `send`-методы: если `!isAvailable(...)` — `return`; иначе `this.nativeBridgeService.send(action, data)`.
  - `vibrate({ type, intensity })`: `data = intensity === undefined ? { type } : { type, intensity }`.
  - `setSheetDragArea(area)`: `data = { area }`.
  - `hideTabbar()`: `data = {}`.
  - `showTabbar(selectedId)`: `data = selectedId === undefined ? {} : { selectedId }`.
- `getGeoConfiguration()`: если `!isAvailable('geo.configuration')` — `return Promise.reject(new Error('WebFeatures: geo.configuration is unavailable in this environment'))`; иначе `return this.nativeBridgeService.call('geo.configuration', {})`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use && yarn test web-features-service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/client/services-and-utils/web-features-service.ts __tests__/client/services-and-utils/web-features-service.test.ts
git commit -m "feat(client): add WebFeaturesService domain layer"
```

---

### Task 4: Проксирование методов в `BridgeToNative`

**Files:**
- Modify: `src/client/bridge-to-native.ts`
- Test: `__tests__/client/bridge-to-native.test.ts`

**Interfaces:**
- Consumes: `WebFeaturesService` (Task 3), `NativeBridgeService` (Task 2).
- Produces (методы `BridgeToNative`): `getGeoConfiguration()`, `vibrate(options)`, `setSheetDragArea(area)`, `hideTabbar()`, `showTabbar(selectedId?)`.

- [ ] **Step 1: Write the failing test**

В `__tests__/client/bridge-to-native.test.ts` добавить mock-модуль `web-features-service` (по образцу существующих mock'ов), mock-модуль `native-bridge-service`, и `describe('WebFeatures methods')`:

```ts
it('should pass `nativeParamsService` and `nativeBridgeService` to `WebFeaturesService`', () => { /* ... */ });
it('should call `webFeaturesService.getGeoConfiguration` and return its promise', () => { /* ... */ });
it('should call `webFeaturesService.vibrate` with options', () => { /* ... */ });
it('should call `webFeaturesService.setSheetDragArea` with area', () => { /* ... */ });
it('should call `webFeaturesService.hideTabbar` / `showTabbar`', () => { /* ... */ });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use && yarn test bridge-to-native`
Expected: FAIL — `getGeoConfiguration is not a function`.

- [ ] **Step 3: Wire into `BridgeToNative`**

- Импортировать `WebFeaturesService` и `NativeBridgeService`, а также типы WebFeatures.
- Добавить приватные поля:
  - `private nativeBridgeService = new NativeBridgeService(this.options?.logError);`
  - `private webFeaturesService = new WebFeaturesService(this.nativeParamsService, this.nativeBridgeService);`
- Добавить пять публичных методов с JSDoc (описание действия, ограничение «только iOS ≥ 17.0.0», поведение в несовместимом окружении), каждый — делегат в `webFeaturesService`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use && yarn test bridge-to-native`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/client/bridge-to-native.ts __tests__/client/bridge-to-native.test.ts
git commit -m "feat(client): expose WebFeatures methods on BridgeToNative"
```

---

### Task 5: Документация и финальная верификация

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add README section**

Добавить раздел «WebFeatures (iOS)» с таблицей пяти методов, требованием `iOS ≥ 17.0.0`, поведением в несовместимом окружении и примером `getGeoConfiguration` (async/await + обработка reject). Отметить, что новые именованные типы не экспортируются и выводятся из сигнатур.

- [ ] **Step 2: Verify public API unchanged**

Run: `git diff origin/main -- src/client/index.ts src/client/primitives.ts src/server/index.ts`
Expected: пустой вывод (нет изменений).

- [ ] **Step 3: Run full test + lint + build**

Run: `source ~/.nvm/nvm.sh && nvm use && yarn test && yarn lint && yarn build`
Expected: всё PASS без ошибок.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs(README): describe WebFeatures methods"
```

---

## Delivery (после всех задач)

1. Убедиться, что `main` в актуальном состоянии, а ветка `feat/DANISJS-web-features-ios` — впереди.
2. Push ветки и открыть Pull Request в `core-ds/bridge-to-native` с описанием изменений (Features: WebFeatures methods (iOS ≥ 17.0.0)).
3. Ссылку на PR отправить в А-Чате Демидову Артему Николаевичу (`ademidov3@alfabank.ru`) — через MCP namespace `achat`, предварительно найдя контакт.