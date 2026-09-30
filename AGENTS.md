# Bridge To Native — Agent Guidelines

- Before any planning or coding, study `README.md` and all documents linked from it (e.g., `CLIENT_SERVER_INTERACTION.md`).
- Treat this repo as a library with two public surfaces: `@alfalab/bridge-to-native/client` and `@alfalab/bridge-to-native/server`.
- Before any Node.js commands (`node`, `npm`, `yarn`, tests, build, lint), switch to the project's Node version via `nvm use`.
- Use `yarn` for project commands; do not use `npm` unless explicitly required outside the normal library workflow.
- Do not expand the public API: only the following should be exported.
    - `server`: `isWebviewEnv`, `prepareNativeAppDetailsForClient`.
    - `client`: `BridgeToNative`; pure native-URL builders for environments without a `BridgeToNative` instance (e.g. mini apps) — `prepareNativeDeeplinkUrl`, `prepareOpenInBrowserUrl`, `prepareOpenInNewWebviewDeeplink`, `preparePdfUrl`, `canUseNativeFeature`; types used in their signatures — `Environment`, `NativeAppTarget`, `NativeFeatureKey`, `PdfType`.
- `ExternalLinksService` must build native URLs only through the builders above, so `BridgeToNative` and their external consumers produce identical URLs.
- When changing protocol fields, first update `src/query-and-headers-keys.ts`, then client/server code and tests.
- In `src/server`, maintain framework-agnostic compatibility with `IncomingMessage | Request`; do not rely on specific framework APIs.
- Verify any navigation changes through the chain: `src/server/prepare-native-app-details-for-client.ts`, `src/client/services-and-utils/native-navigation-and-title-service.ts`, `bridgeToNativeData` cookie, and `sessionStorage`.
- Account for iOS/Android platform differences, especially around `pageId`, back-navigation, and opening external screens.
- Do not silently change public API behavior: if a contract changes, update tests and documentation in sync.
