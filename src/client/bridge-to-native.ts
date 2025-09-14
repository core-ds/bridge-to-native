/* eslint max-lines: ["error", {"skipComments": true}] */ // Много комментариев.

import { ExternalLinksService } from './services-and-utils/external-links-service';
import { NativeNavigationAndTitleService } from './services-and-utils/native-navigation-and-title-service';
import { NativeParamsService } from './services-and-utils/native-params-service';
import {
    type BrowserHistoryApiWrappers,
    type HistoryPushStateParams,
    type LocationAssignParam,
    type LogError,
    type NativeFeatureKey,
    type PdfType,
} from './types';

/**
 * Сервис, предоставляет методы для WA, работающего внутри NA.
 */
export class BridgeToNative {
    /**
     * @param options.browserHistoryApiWrappers Объект с методами,
     *  которые вызовут методы обертки (например из react-router) над
     *  [History](https://developer.mozilla.org/en-US/docs/Web/API/History),
     *  если ваше WA такие использует. Если аргумент не передать,
     *  будут использованы стандартные `History: pushState()` и `History: go()`.
     * @param options.logError Функция с помощью которой B2N может залогировать ошибку,
     *  если не передать, B2N не будет логировать ошибки.
     */
    constructor(
        private options?: {
            browserHistoryApiWrappers?: BrowserHistoryApiWrappers;
            logError?: LogError;
        },
    ) {}

    private nativeParamsService = new NativeParamsService(this.options?.logError);

    private externalLinksService = new ExternalLinksService(this.nativeParamsService);

    private nativeNavigationAndTitleService = new NativeNavigationAndTitleService(
        this.nativeParamsService,
        this.options?.browserHistoryApiWrappers,
        this.options?.logError,
    );

    /**
     * Схема NA.
     */
    get appId() {
        return this.nativeParamsService.appId;
    }

    /**
     * Версия NA.
     */
    get appVersion() {
        return this.nativeParamsService.appVersion;
    }

    /**
     * Платформа, в окружении которой работает NA и WA.
     */
    get environment() {
        return this.nativeParamsService.environment;
    }

    /**
     * Индикатор проблемы чтения данных о NA. Если `true`, используются умолчания,
     * возможно ошибочные (например, версия будет `0.0.0`).
     */
    get wasNativeParamsDataFailedToRead() {
        return this.nativeParamsService.nativeParamsReadErrorFlag;
    }

    /**
     * Сохранённые query-параметры, которыми NA обогощает URL при открытии WV.
     */
    get originalWebviewParams() {
        return this.nativeParamsService.originalWebviewParams;
    }

    /**
     * Тема (светлая/тёмная), в котором работает NA.
     */
    get theme() {
        return this.nativeParamsService.theme;
    }

    /**
     * Метод, проверяющий, можно ли использовать ли указанную функциональность
     * в текущей версии NA.
     *
     * @param feature Ключ (ID) функциональности, которую нужно проверить.
     * @returns Результат проверки.
     */
    canUseNativeFeature(feature: NativeFeatureKey) {
        return this.nativeParamsService.canUseNativeFeature(feature);
    }

    /**
     * Метод, отправляющий сигнал NA, что нужно закрыть текущее WV.
     */
    closeWebview() {
        this.nativeNavigationAndTitleService.closeWebview();
    }

    /**
     * Модифицирует ссылку таким образом, чтобы NA открыл её в браузере.
     *
     * ВАЖНО!
     * В ранних версиях NA в браузере ссылку открыть НЕВОЗМОЖНО!
     * В таких версиях в качестве фолбэка этот метод вернет диплинк, открывающий
     * ресурс в новом WV.
     * Версии, с которых можно открыть ссылку в браузере:
     * Android  11.71.0
     * iOS      13.3.0
     *
     * @param link Абсолютная ссылка со всеми компонентами (включая протокол).
     * @returns Модифицированная ссылка для открытия в браузере или диплинк, открывающий
     *  ресурс в новом WV.
     */
    getHrefToOpenInBrowser(link: string) {
        return this.externalLinksService.getHrefToOpenInBrowser(link);
    }

    /**
     * Делает один шаг назад по браузерной истории и модифицирует внутреннее состояние B2N,
     * чтобы в дальнейшем зарегистрировать этот переход в NA.
     *
     * Метод автоматически закрывает WV, если отсутствуют записи в истории переходов B2N.
     */
    goBack() {
        this.nativeNavigationAndTitleService.goBack();
    }

    /**
     * Делает несколько шагов назад по браузерной истории и модифицирует внутреннее состояние,
     * чтобы в дальнейшем зарегистрировать этот переход в NA.
     *
     * ВАЖНО!
     * Метод можно использовать только в рамках истории по SPA WA! Движение назад
     * server-side переходом на несколько шагов не поддерживается.
     *
     * Снять это ограничение возможно, но нужны доработки.
     *
     * @param stepsNumber Количество шагов назад.
     *  Возможно передача как положительного, так и отрицательного числа. `0` будет проигнорирован.
     * @param autoCloseWebview Флаг — закрывать ли WV автоматически,
     *  если переданное кол-во шагов будет больше, чем записей в истории.
     */
    goBackAFewStepsClientSide(stepsNumber: number, autoCloseWebview = false) {
        this.nativeNavigationAndTitleService.goBackAFewStepsClientSide(
            stepsNumber,
            autoCloseWebview,
        );
    }

    /**
     * Вызывает обработчик диплинков NA для обработки переданного диплинка.
     *
     * Если диплинк приводит к открытию нового экрана, он открывается «поверх» текущего WV.
     * При выходе из нового экрана, пользователь возвращается обратно в WV.
     *
     * ВАЖНО!
     * В NA на Android до версии `12.30.0` текущее WV закрывается при открытии нового экрана,
     * поэтому в закрытое WV невозможно вернуться back-навигацией.
     *
     * @param deeplink Диплинк для передачи на обработку NA.
     * @param closeWebviewBeforeCallNativeDeeplinkHandler Флаг принудительного закрытия текущего WV перед открытием нового экрана.
     *  Применимо для всех версий на iOS и в новых версиях на Android (>=12.30.0), в более старых WV закрывается всегда автоматически.
     */
    handleNativeDeeplink(deeplink: string, closeWebviewBeforeCallNativeDeeplinkHandler = false) {
        this.externalLinksService.handleNativeDeeplink(
            deeplink,
            closeWebviewBeforeCallNativeDeeplinkHandler,
        );
    }

    /**
     * Сравнивает текущую версию приложения с переданной.
     *
     * @param versionToCompare Версия, с которой нужно сравнить текущую.
     * @returns `true` – текущая версия больше или равняется переданной,
     *  `false` – текущая версия ниже.
     */
    isCurrentVersionHigherOrEqual(versionToCompare: string) {
        return this.nativeParamsService.isCurrentVersionHigherOrEqual(versionToCompare);
    }

    /**
     * Для client-side навигации необходимо воспользоваться этим методом,
     * чтобы зарегистрировать навигацию WA в NA. В результате кнопка «Назад» в NA
     * сработает как кнопка «Назад» в Браузере, иначе эта кнопка закрывает WV.
     * Кол-во вызовов метода === кол-ву поведений кнопки, как «Назад» в браузере.
     *
     * Для сброса можно использовать метод `setInitialView`.
     *
     * Метод использует функцию `push` параметра `browserHistoryAbstractions`,
     * если такой был передан в конструктор. Иначе вызывает
     * `History: pushState()` <https://developer.mozilla.org/en-US/docs/Web/API/History/pushState>.
     *
     * @param url URL для перехода внутри WA client-side навигацией.
     * @param state <https://developer.mozilla.org/en-US/docs/Web/API/History/state> для новой записи в истории.
     * @param nativeTitle Текст заголовка, для «нативной» части WV, пустая строка — отсутствие заголовка.
     */
    navigateClientSide(
        url: HistoryPushStateParams[2],
        state?: HistoryPushStateParams[0],
        nativeTitle = '',
    ) {
        this.nativeNavigationAndTitleService.navigateClientSide(url, state, nativeTitle);
    }

    /**
     * Для seriver-side навигации необходимо воспользоваться этим методом,
     * чтобы корректно передать информацию экземпляру B2N следующего WA или
     * экзепляру B2N следующей страницы текущего WA (в случае multi-page application).
     *
     * ВАЖНО!
     *
     * Не поддерживаются такие сценарии:
     *
     * 1. Микс client-side навигации и server-side навигации в рамках одного WA.
     *  т.е. одно WA должно использовать либо только `navigateClientSide`, либо только `navigateServerSide`.
     * 2. Старт в WA 1 → переход к WA 2 → переход к WA 1,
     *  т.е. при использовании server-side навигации, история переходов разных WA не должна смешиваться.
     *
     * Снять эти ограничения возможно, но нужны доработки.
     *
     * @param url URL для перехода внутри WA server-side навигацией.
     * @param nativeTitle Текст заголовка, для «нативной» части WV, пустая строка — отсутствие заголовка.
     */
    navigateServerSide(url: LocationAssignParam, nativeTitle = '') {
        this.nativeNavigationAndTitleService.navigateServerSide(url, nativeTitle);
    }

    /**
     * Открывает переданную ссылку в браузере.
     *
     * ВАЖНО!
     * В ранних версиях NA в браузере ссылку открыть НЕВОЗМОЖНО!
     * В таких версиях в качестве фолбэка этот метод открывает ссылку в новом WV.
     * Версии, с которых можно открыть ссылку в браузере:
     * Android  11.71.0
     * iOS      13.3.0
     *
     * @param link Абсолютная ссылка со всеми компонентами (включая протокол).
     */
    openInBrowser(link: string) {
        this.externalLinksService.openInBrowser(link);
    }

    /**
     * Открывает переданную ссылку в новом WV, которое открывается «поверх» текущего WV.
     * При выходе из «нового WV», пользователь возвращается в текущее WV.
     *
     * ВАЖНО!
     * В NA на Android до версии `12.30.0` текущее WV закрывается при открытии нового
     * и в него будет невозможно вернуться back-навигацией.
     *
     * ВАЖНО!
     * В NA планируют внедрить «Белые списки» URL (на основе регулярных выражений),
     * которые разрешено открывать в WV. URL не подпадающие под «Белые списки» NA будет
     * принудительно открывать в браузере.
     *
     * @param link Абсолютная ссылка со всеми компонентами (включая протокол).
     * @param nativeTitle Текст заголовока, для «нативной» части WV, пустая строка — отсутствие заголовка.
     * @param closeCurrentWebview Флаг принудительного закрытия текущего WV перед открытием нового вебвью.
     *  Применимо для всех версий на iOS и в новых версиях на Android (>=12.30.0), в более старых WV закрывается всегда автоматически.
     */
    openInNewWebview(link: string, nativeTitle = '', closeCurrentWebview = false) {
        this.externalLinksService.openInNewWebview(link, nativeTitle, closeCurrentWebview);
    }

    /**
     * Метод для открытия PDF в нативном вьювере.
     * TODO: Есть нюансы с версиями приложения, OS устройства. Надо тестировать по моде статистики.
     *  Надо тщательно изучить вопрос и доработать реализацию.
     *
     * @param url Ссылка на PDF.
     * @param type Тип PDF ссылки (игнорируется в Android окружении).
     * @param title Название PDF файла (игнорируется в Android окружении).
     */
    openPdf(url: string, type: PdfType = 'pdfFile', title?: string) {
        this.externalLinksService.openPdf(url, type, title);
    }

    /**
     * Для перезагрузки страницы необходимо использовать этот метод.
     * Иначе синхронизация состояния с NA будет потеряна.
     */
    reload() {
        this.nativeNavigationAndTitleService.reload();
    }

    /**
     * Информирует NA, что WA находится на первом экране. Это приведёт к тому,
     * что следующее нажатие на кнопку «Назад» в NA закроет WV.
     *
     * @param pageTitle Текст заголовка, для «нативной» части WV, пустая строка — отсутствие заголовка.
     */
    setInitialView(nativeTitle = '') {
        this.nativeNavigationAndTitleService.setInitialView(nativeTitle);
    }

    /**
     * Метод для смены заголовка в NA.
     *
     * @param nativeTitle Текст заголовка, для «нативной» части WV, пустая строка — отсутствие заголовка.
     */
    setTitle(nativeTitle: string) {
        this.nativeNavigationAndTitleService.setTitle(nativeTitle);
    }
}
