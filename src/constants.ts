/*
 * Ключи заголовков и query-параметров, которые использует B2N.
 */

// Ключ cookie, с помощью которого серверная часть b2native передаст на клиент информацию об B2N.
export const COOKIE_KEY_BRIDGE_TO_NATIVE_DATA = 'bridgeToNativeData';

// Query-параметр, с помощью которого можно передать начальное значение
// для нативного заголовка — в область, которую не рендерит веб.
export const QUERY_B2N_TITLE = 'b2n-title';

// Deprecated вариант query-параметра 'b2n-title'
// (т.к. `title` часто может использоваться самим веб-приложением).
// Игнорируется, если указан 'b2n-title'.
export const QUERY_B2N_TITLE_DEPRECATED = 'title';
