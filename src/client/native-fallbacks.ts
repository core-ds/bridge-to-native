import { type BridgeToNative } from './bridge-to-native';
import { type ExternalNavigationOptions, type PdfType } from './types';
import { getUrlInstance } from './utils';

/**
 * Класс содержит реализацию обходных путей для веб-фич, которые не работают в нативном-вебвью.
 */
export class NativeFallbacks {
    constructor(private b2n: BridgeToNative) {}

    /**
     * Метод, возвращающий пропсы для ссылок, ведущих на ВНЕШНИЙ ресурс. Которые просто
     * нужно «подмешать» к ссылке в JSX:
     *
     * ```
     * <a {...bridgeToNative.nativeFallbacks.getExternalLinkProps('https://ya.ru')}>Link to external feature</a>
     * ```
     * Либо просто достать интересующие поля - onClick или href
     * ```
     * const {onClick, href} = bridgeToNative.nativeFallbacks.getExternalLinkProps(url, clickHandler)
     * document.querySelector('.myLink').onclick = onClick;
     * <a {...bridgeToNative.nativeFallbacks.getExternalLinkProps('https://ya.ru')}>Link to external feature</a>
     * ```
     * В разных OS и разных версиях приложения, открытие ресурса будет работать по-разному:
     *
     * - Если текущая версия приложения может открыть ссылку в браузере и не задан параметр `forceOpenInWebview`,
     *  обогащаем URL специальным query-параметром (`target=_blank` в приложении не работает).
     * - Если это iOS, меняем URL на диплинк, который откроет ссылку в новом вебвью, поверх текущего.
     *  К первому-вебвью, пользователь вернётся, когда закроет второе вебвью с внешним ресурсом.
     * - В старых приложениях на Андроид – URL не меняем, но добавляем `onClick` для сбрасывания синхронизации
     *  навигации с приложением. Это «фолбэк-сценарий» с плохим UX (сайт полностью выпадает из истории), но другого способа нет.
     *
     * @param link Строка - валидный урл.
     * @param options - опции
     * @param options.forceOpenInWebview Boolean - по умолчанию = false, если передать true,
     * все ссылки будут открываться в рамках webview, иначе открытие по возможности будет происходить в браузере.
     * @param options.onClick Дополнительный обработчик на клик, например, для отправки метрики.
     *  Внимание! Не факт, что в «фолбэк-сценарии» асинхронная операция будет выполнена (метрика отправлена)!
     * @returns Пропсы для ссылки в вебвью окружении.
     */

    public getExternalLinkProps(link: string, options: ExternalNavigationOptions = {}) {
        const { onClick, forceOpenInWebview } = options;

        const url = getUrlInstance(link);

        if (!forceOpenInWebview && this.b2n.canUseNativeFeature('linksInBrowser')) {
            url.searchParams.append('openInBrowser', 'true');

            return { href: url.href, onClick };
        }

        return {
            href: `${this.b2n.appId}://webFeature?type=recommendation&url=${encodeURIComponent(
                url.href,
            )}`,
            onClick: options?.onClick,
        };
    }

    /**
     * Метод для открытия PDF в нативном вьювере.
     *
     * Есть нюансы с версиями приложения, OS устройства.
     * Надо тестировать по моде статистики.
     *
     * @param url ссылка на pdf
     * @param type тип pdf ссылки
     * @param title название pdf файла
     */
    public openPdf(url: string, type: PdfType = 'pdfFile', title?: string) {
        const params = new URLSearchParams();

        params.append('type', type);
        params.append('url', decodeURIComponent(url));

        if (title) {
            params.append('title', title.replace(/\s/g, '_'));
        }

        let replaceUrl = url;
        const paramsStr = params.toString();

        if (this.b2n.environment === 'ios') {
            replaceUrl = `${this.b2n.appId}:///dashboard/pdf_viewer?${paramsStr}`;
        }

        // У андройда через диплинк открывается, но предыдущий экран затирается.
        // Поэтому мы открываем base64 через конвертирование в бинарный pdf (через ручки сервиса)
        // Это позволяет перейти назад к вебвью
        if (this.b2n.environment === 'android' && type === 'base64') {
            replaceUrl = `/services/base64-to-pdf?${paramsStr}`;
        }

        const windowObjectReference = window.open(replaceUrl);

        if (windowObjectReference === null) {
            window.location.replace(replaceUrl);
        }
    }

    /**
     * Метод, для перехода на ВНЕШНИЙ ресурс.
     *
     * См. описание в `getExternalLinkProps`, чтобы узнать, как выбирается способ для перехода.
     *
     * @param link Строка - валидный урл.
     * @param forceOpenInWebview Boolean - по умолчанию = false, если передать true,
     * все ссылки будут открываться в рамках webview, иначе открытие по возможности будет происходить в браузере.
     */
    public visitExternalResource(link: string, forceOpenInWebview = false) {
        const url = getUrlInstance(link);

        if (!forceOpenInWebview && this.b2n.canUseNativeFeature('linksInBrowser')) {
            url.searchParams.append('openInBrowser', 'true');

            window.location.replace(url.href);
        } else {
            window.location.replace(
                `${this.b2n.appId}://webFeature?type=recommendation&url=${encodeURIComponent(
                    url.href,
                )}`,
            );
        }
    }
}
