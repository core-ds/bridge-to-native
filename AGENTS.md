# Bridge To Native — Agent Guidelines

- Before any planning or coding, study `README.md` and all documents linked from it (e.g., `CLIENT_SERVER_INTERACTION.md`).
- Treat this repo as a library with two public surfaces: `@alfalab/bridge-to-native/client` and `@alfalab/bridge-to-native/server`.
- Before any Node.js commands (`node`, `npm`, `yarn`, tests, build, lint), switch to the project's Node version via `nvm use`.
- Use `yarn` for project commands; do not use `npm` unless explicitly required outside the normal library workflow.
- Do not expand the public API: only `BridgeToNative`, `isWebviewEnv`, `prepareNativeAppDetailsForClient` should be exported.
- When changing protocol fields, first update `src/query-and-headers-keys.ts`, then client/server code and tests.
- In `src/server`, maintain framework-agnostic compatibility with `IncomingMessage | Request`; do not rely on specific framework APIs.
- Verify any navigation changes through the chain: `src/server/prepare-native-app-details-for-client.ts`, `src/client/services-and-utils/native-navigation-and-title-service.ts`, `bridgeToNativeData` cookie, and `sessionStorage`.
- Account for iOS/Android platform differences, especially around `pageId`, back-navigation, and opening external screens.
- Do not silently change public API behavior: if a contract changes, update tests and documentation in sync.
