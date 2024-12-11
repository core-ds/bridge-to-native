# bridge-to-native

Утилита для удобной работы веб приложения внутри нативного приложения и коммуникации с ним

## Установка

```bash
npm install @alfalab/bridge-to-native
```

## Серверные утилиты

При открытии веб-ресурса в webview, нативное приложение добавляет к первому запросу специальные заголовки, позволяющие определить окружение вебвью. Это полезно, если ваше веб-приложение должно вести себя по-разному в вебвью и обычном браузере (например, отдавать разные бандлы или применять разные настройки).

Кроме того, нативное приложение передаёт информацию о себе через query-параметры и заголовки. Эту информацию удобно сохранить в cookie, чтобы затем использовать на клиентской стороне.

`b2native` предоставляет набор утилит для Node.js серверов, которые помогают решить эти задачи эффективно и удобно.


Пример:

 ```js
const { isWebviewEnvironment, extractNativeParams, setNativeParamsCookie } = require('@alfalab/bridge-to-native');

// ...

const server = http.createServer((req, res) => {

  // Проверяем, является ли запрос WebView
  if (isWebviewEnvironment(req)) {

      // Извлекаем параметры вебвью и записываем их в cookie
      handleNativeParams(
        req,
        (name, value) => {
            const cookieOptions = `HttpOnly=false; Max-Age=432000`;
            res.setHeader('Set-Cookie', `${name}=${value}; ${cookieOptions}; Path=/`);
      }
    );
      // ...
  } else {
      // ...
      // Не webview
      // ...
  }
});
```


| Название | Описание                                                                                                                      | Параметры  | Результат                                                                                                                     |
|----------|-------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------|
| `isWebviewEnvironment(request)` | Проверяет, является ли запрос исходящим из окружения WebView                                                                  | `request [Object]` Объект HTTP-запроса                                                                                                                  | `true` или `false`                                                                                                            |
| `handleNativeParams(request, setCookieMethod)` | Извлекает параметры, специфичные для WebView, из HTTP-запроса и записывает информацию из параметров WebView в куку | `request [Object]` Объект HTTP-запроса       `setCookieMethod (cookieName, cookieValue) [Function]`: Метод для установки куки. | Объект с извлеченными параметрами WebView (`theme`,  `appVersion`, `iosAppId`, `title`,`originalWebviewParams`, `nextPageId`) |
| `extractNativeParams(request)`                  | Извлекает параметры, специфичные для WebView, из HTTP-запроса.                                                                | `request [Object]` Объект HTTP-запроса                                                                                                                  | Объект с извлеченными параметрами WebView (`theme`,  `appVersion`, `iosAppId`, `title`,`originalWebviewParams`, `nextPageId`) |
| `setNativeParamsCookie(params, setCookieMethod)` | Записывает информацию из параметров WebView в не-HttpOnly куку                                                                | `params [Object]`: Параметры WebView, которые нужно записать в куку.  `setCookieMethod (cookieName, cookieValue) [Function]`: Метод для установки куки. | `void`                                                                                                                        |


## Работа с webview  на клиенте

На стороне клиента наличие cookie с параметрами webview будет означать, что приложение работает в webview. В таком случае для взаимодействия с нативным приложением будет использоваться специальный класс BridgeToNative, который предоставляет методы для навигации и выполнения других операций, специфичных для webview-среды.

### Инициализация BridgeToNative

 ```js
import { getNativeParamsFromCookies } from '@alfalab/bridge-to-native';

const blankPagePath = 'blank?reload=true';

const initBridgeToNative = () => {
    const isBridgeInitialized = IS_BROWSER_ENV && !window.bridgeToNative;
    // Берем параметры из cookies
    const nativeParams = getNativeParamsFromCookies();

    if (isBridgeInitialized && nativeParams) {
        const bridgeToNative = new BridgeToNative(handleRedirect, blankPagePath, nativeParams);

        window.bridgeToNative = bridgeToNative;
    }
}

```
 где

`handleRedirect` - метод для навигации внутри веб приложения. Например, `navigate` или `history.push`
`blankPagePath` -  патч для безопасной перезагрузки страницы. Страница перезагрузится если передать квери параметр `?reload=true`
