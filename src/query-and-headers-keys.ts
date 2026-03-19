/*
 * Ключи стандартных заголовков.
 */

export const HEADER_KEY_COOKIE = 'cookie';
export const HEADER_KEY_USER_AGENT = 'user-agent';

/*
 * Ключи заголовков и query-параметров, которые использует B2N.
 */

// Ключ cookie, с помощью которого серверная часть B2N передаст на клиент информацию об NA.
export const COOKIE_KEY_BRIDGE_TO_NATIVE_DATA = 'bridgeToNativeData';

// Ключ cookie, указывающий, что запрос выполнен после вызова `bridgeToNative.reload()`.
// Используется для предотвращения перезаписи cookie bridgeToNativeData, чтобы сохранить
// актуальные параметры нативного приложения
export const COOKIE_KEY_BRIDGE_TO_NATIVE_RELOAD = 'bridgeToNativeReload';

// Нативное приложение на обеих платформах подмешивает этот заголовок к запросу за HTML.
// TODO:
// * Исследовать, делает ли оно это при запросах к прочим ресурсам;
// * Есть подозрение на некоторую нестабильность — возможно делает это
//  только для первого документа в вебвью-сессии. Исследовать.
export const HEADER_KEY_NATIVE_APPVERSION = 'app-version';

// Ключ заголовка, в котором передается время старта открытия WV экрана в формате timestamp
export const HEADER_KEY_WV_LAUNCH_TIME = 'webview-launch-time';

// Флаг, предписывающий клиентскому коду B2N начать связь
// с нативным приложением с указанного в этом параметре id, а не с 1.
// Необходимо для server-side навигации.
export const QUERY_B2N_NEXT_PAGEID = 'b2n-next-page-id';

// Query-параметр, с помощью которого можно передать начальное значение
// для нативного заголовка — в область, которую не рендерит веб.
export const QUERY_B2N_TITLE = 'b2n-title';

// Deprecated вариант query-параметра 'b2n-title'
// (т.к. `title` часто может использоваться самим веб-приложением).
// Игнорируется, если указан 'b2n-title'.
export const QUERY_B2N_TITLE_DEPRECATED = 'title';

// NA на iOS приложение передаёт в этом параметре схему,
// под которым оно зарегистрировано в OS.
// Известные проблемы:
// * В старых версиях отсутствует, клиентский код использует хардкод (см. `src/client/constants.ts`);
// * В тестовых сборках часто нарушена связь!!! Между фактической схемой
//  и схемой, которая приходит в этом параметре.
//  Нужно просить iOS разработчика собрать сборку нормально.
export const QUERY_NATIVE_IOS_APPID = 'applicationId';

// NA на iOS приложение передаёт в этом параметре свою версию.
export const QUERY_NATIVE_IOS_APPVERSION = 'device_app_version';

// NA на обеих платформах в этом параметре передаёт активную тему (светлая/тёмная).
export const QUERY_NATIVE_THEME = 'theme';

// Ключ sesseionStorage, с помощью которого клиентская часть B2N сохраняет своё состояние
// при server-side навигации.
export const SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK = 'bridgeToNativeHistoryStack';
