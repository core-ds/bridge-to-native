/*
 * Ключи стандартных заголовков.
 */

export const HEADER_KEY_COOKIE = 'cookie';
export const HEADER_KEY_USER_AGENT = 'user-agent';

/*
 * Ключи заголовков, query-параметров и пр., которые использует B2N.
 */

// Ключ cookie, с помощью которого серверная часть B2N передаст на клиент информацию об NA.
export const COOKIE_KEY_BRIDGE_TO_NATIVE_DATA = 'bridgeToNativeData';

// NA на обеих платформах подмешивает этот заголовок к запросу за HTML.
// TODO:
// * Исследовать, делает ли оно это при запросах к прочим ресурсам;
// * Есть подозрение на некоторую нестабильность — возможно делает это
//  только для первого документа в вебвью-сессии. Исследовать.
export const HEADER_KEY_NATIVE_APPVERSION = 'app-version';

// Ключ заголовка, в котором NA передаёт время старта открытия WV экрана в формате timestamp.
export const HEADER_KEY_WV_LAUNCH_TIME = 'webview-launch-time';

// Ключ в history.state, который B2N использует для хранения текущего `pageId`
// чтобы иметь возможность корректно синхронизироваться с NA после back-навигации.
export const HISTORY_STATE_KEY_B2N_PAGE_ID = 'b2n-pageId';

// Флаг, предписывающий клиентскому коду B2N начать связь
// с нативным приложением с указанного в этом параметре id, а не с 1.
// Необходимо для server-side (hard) навигации.
export const QUERY_B2N_NEXT_PAGEID = 'b2n-next-page-id';

// Query-параметр, который можно подмешать к URL в диплинке на открытие WV,
// и с помощью которого можно передать начальное значение
// для нативного заголовка — в область, которую не рендерит веб.
// Также некоторые методы навигации B2N используют эту сущность.
export const QUERY_B2N_TITLE = 'b2n-title';

// Deprecated вариант query-параметра 'b2n-title'
// (т.к. `title` часто может использоваться самим веб-приложением).
// Игнорируется, если указан 'b2n-title'.
export const QUERY_B2N_TITLE_DEPRECATED = 'title';

// NA на iOS передаёт в этом параметре схему,
// под которым оно зарегистрировано в OS.
// Некоторые особенности:
// * В старых версиях отсутствует, клиентский код использует хардкод
// (см. `VERSION_TO_IOS_APP_ID` в `src/client/constants.ts`);
// * Тестить WV на iOS надо на группе «B»!!! Иначе NA будет присылать в WA неверную схему,
//   что приведёт к неработоспособности методов, связанных с передачей диплинков в NA.
// * В сборках для Симулятора, схема всегда `aweassist`.
export const QUERY_NATIVE_IOS_APPID = 'applicationId';

// NA на iOS передаёт в этом параметре свою версию.
// B2N сознательно переиспользует этот query и для server-side (hard) переходов в Android,
// чтобы не вводить отдельный служебный параметр только для переноса версии между WA.
export const QUERY_NATIVE_IOS_APPVERSION = 'device_app_version';

// NA на обеих платформах в этом параметре передаёт активную тему (светлая/тёмная).
export const QUERY_NATIVE_THEME = 'theme';

// Ключ sessionStorage,в котором клиентская часть B2N сохраняет состояние синхронизации с NA.
export const SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK = 'bridgeToNativeHistoryStack';
