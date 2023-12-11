import { PREVIOUS_NATIVE_NAVIGATION_AND_TITLE_STATE_STORAGE_KEY } from './constants';
import { PreviousNativeNavigationAndTitleState } from './types';
import { extractAppNameRouteAndQuery } from './utils';
import { BridgeToNative } from '.';

type SyncPurpose = 'initialization' | 'navigation' | 'title-replacing';

export type HandleRedirect = (
    appName: string,
    path?: string,
    params?: Record<string, string>,
) => void;

/**
 * Класс, отвечающий за взаимодействие с нативными элементами в приложении – заголовком
 * и нативной кнопкой назад.
 */
export class NativeNavigationAndTitle {
    private nativeHistoryStack: string[] = [''];

    private numOfBackSteps = 1;

    // Тут сохраняются параметры, которые в последний раз были отправлены в приложение.
    // Просто, чтобы не слать одинаковые сигналы в приложение.
    private lastSetPageSettingsParams = '';

    private handleWindowRedirect: HandleRedirect;

    constructor(
        private b2n: BridgeToNative,
        pageId: number | null,
        initialNativeTitle = '',
        handleWindowRedirect: HandleRedirect,
    ) {
        this.handleBack = this.handleBack.bind(this);
        this.handleWindowRedirect = handleWindowRedirect;
        const previousState = !!sessionStorage.getItem(
            PREVIOUS_NATIVE_NAVIGATION_AND_TITLE_STATE_STORAGE_KEY,
        );

        if (pageId) {
            this.supportSharedSession(pageId, initialNativeTitle);
        } else if (previousState) {
            this.restorePreviousState();
        } else {
            this.setInitialView(initialNativeTitle);
        }
    }

    /**
     * Метод, вызывающий `history.back()` или закрывающий вебвью, если нет записей
     * в истории переходов.
     */
    public goBack() {
        this.goBackAFewSteps(-1, true);
    }

    /**
     * Метод, вызывающий history.go(-колл. шагов назад) и модифицирует внутреннее
     * состояние, чтобы в дальнейшем зарегистририровать этот переход в приложении.
     *
     * @param stepsNumber Количество шагов назад.
     *  Возможно передача как положительного, так и отрицательного числа.
     *  0 будет проигнорирован.
     * @param autocloseWebview Флаг – закрывать ли вебвью автоматически,
     *  если переданное кол-во шагов будет больше, чем записей в истории.
     */
    public goBackAFewSteps(stepsNumber: number, autocloseWebview = false) {
        if (!stepsNumber) {
            return;
        }

        const stepsToBack = Math.abs(stepsNumber);
        const maxStepsToBack = this.nativeHistoryStack.length - 1;

        if (stepsToBack > maxStepsToBack) {
            if (autocloseWebview) {
                this.b2n.closeWebview();

                return;
            }

            this.numOfBackSteps = maxStepsToBack;
        } else {
            this.numOfBackSteps = stepsToBack;
        }

        window.history.go(-this.numOfBackSteps);
    }

    /**
     * @param path Путь для перехода на функциональность внутри приложения.
     */
    handleRedirect(path: string): void;
    /**
     * В этом варианте аргументы 2,3,4 соответствуют аргументам 1,2,3 метода `src/shared/utils/handle-redirect`.
     *
     * @param pageTitle Заголовок, который нужно отрисовать в приложении.
     * @param appName См. первый параметр `src/handle-redirect.ts`.
     * @param path См. второй параметр `src/handle-redirect.ts`.
     * @param params См. третий параметр `src/handle-redirect.ts`.
     */
    handleRedirect(
        pageTitle: string,
        appName: string,
        path?: string,
        params?: Record<string, string>,
    ): void;
    /**
     * Метод вызывает `src/shared/utils/handle-redirect` из `newclick-host-ui`
     * и регистрирует этот переход в приложении, чтобы кнопка «Назад» в Нативе вызывала
     * переход назад в вебе.
     */
    public handleRedirect(
        pageTitleOrPath: string,
        appName?: string,
        path?: string,
        params?: Record<string, string>,
    ) {
        if (appName) {
            this.handleWindowRedirect(appName, path, params);
        } else {
            const {
                appName: extractedAppName,
                path: extractedPath,
                query: extractedQuery,
            } = extractAppNameRouteAndQuery(pageTitleOrPath);

            this.handleWindowRedirect(extractedAppName, extractedPath, extractedQuery);
        }

        const title = appName ? pageTitleOrPath : '';

        this.nativeHistoryStack.push(title);
        this.syncHistoryWithNative(title, 'navigation');
    }

    /**
     * Информирует натив, что веб находится на первом экране (сбрасывает историю переходов, не влияя на браузерную
     * историю), а значит следующее нажатие на кнопку "Назад" в нативне закроет вебвью.
     *
     * @param pageTitle Заголовок, который нужно отрисовать в нативе.
     */
    public setInitialView(pageTitle = '') {
        this.nativeHistoryStack = [pageTitle];
        this.syncHistoryWithNative(pageTitle, 'initialization');

        this.reassignPopstateListener();
    }

    /**
     * Метод для смены заголовка в нативе без влияния на историю переходов.
     *
     * @param pageTitle Заголовок, который нужно отрисовать в нативе.
     */
    public setTitle(pageTitle: string) {
        this.nativeHistoryStack[this.nativeHistoryStack.length - 1] = pageTitle;
        this.syncHistoryWithNative(pageTitle, 'title-replacing');
    }

    /**
     * Метод для открытия второго web приложения в рамках
     * одной вебвью сессии
     * сохраняет все текущее состояние текущего экземпляра bridgeToAm и AmNavigationAndTitle в sessionStorage, а
     * так же наполняет url необходимыми query параметрами. Работает только в Android окружении.
     * В IOS окружении будет открыто новое webview поверх текущего.
     * @param url адрес второго web приложения к которому перед переходом на него будут добавлены
     * все initial query параметры от натива и параметр nextPageId (Android)
     */
    public navigateInsideASharedSession(url: string) {
        if (this.b2n.environment === 'ios') {
            this.b2n.nativeFallbacks.visitExternalResource(url);

            return;
        }

        // В b2n этот метод отмечен модификатором доступа private, но тут его нужно вызвать
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.b2n.saveCurrentState();

        window.location.assign(this.prepareExternalLinkBeforeOpen(url));
    }

    /**
     * ПОКА НЕ ИСПОЛЬЗОВАТЬ В ПРОДЕ (МЕТОД НЕ РАБОТАЕТ КОРРЕКТНО НА ANDROID)
     * НА ANDROID ПРИ ПЕРЕЗАГРУЗКЕ СТРАНИЦЫ В ИСТРИЮ ЛОЖИТСЯ + ЕЩЕ ОДИН ЛИШНИЙ ЭЛЕМЕНТ
     * Данный метод будет дорабатываться отдельной задачей
     * Безопасный способ для перезагрузки страницы.
     * Производит предварительное сохранение текущего состояния
     * BridgeToNative и NativeNavigationAndTitle перед вызовом location.reload()
     */
    public reloadPage() {
        // В b2n этот метод отмечен модификатором доступа private, но тут его нужно вызвать
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.b2n.saveCurrentState();

        window.location.reload();
    }

    /**
     * Метод для сохранения текущего состояния NativeNavigationAndTitle в sessionStorage.
     */
    private saveCurrentState() {
        const currentState: PreviousNativeNavigationAndTitleState = {
            title: this.nativeHistoryStack[this.nativeHistoryStack.length - 1],
            nativeHistoryStack: this.nativeHistoryStack,
        };

        sessionStorage.setItem(
            PREVIOUS_NATIVE_NAVIGATION_AND_TITLE_STATE_STORAGE_KEY,
            JSON.stringify(currentState),
        );
    }

    /**
     * Метод, вычисляющий `pageId`, который нужно послать в приложение
     * для правильной синхронизации с нативной-кнопкой "Назад".
     *
     * @param purpose Цель взаимодействия с приложением.
     * @returns Правильный pageId.
     */
    private getNativePageId(purpose: SyncPurpose) {
        function assertUnreachable(val: never): never {
            throw new Error(`Unexpected value "${val}"`);
        }

        let pageId: number | null;

        switch (purpose) {
            case 'initialization':
                pageId = this.getNativePageIdForInitialization();
                break;

            case 'navigation':
                pageId = this.getNativePageIdForNavigation();
                break;

            case 'title-replacing':
                pageId = this.getNativePageIdForTitleReplacing();
                break;

            default:
                assertUnreachable(purpose);
        }

        return pageId;
    }

    /**
     * Вспомогательный метод для `getNativePageId` initialization кейса.
     *
     * @returns Правильный pageId.
     */
    private getNativePageIdForInitialization() {
        // * В iOS для "первой" страницы не нужно слать `pageId`.
        // * В Android важно, чтобы `pageId` "первой" страницы
        //  всегда был одинаковый.
        return this.b2n.environment === 'ios' ? null : 1;
    }

    /**
     * Вспомогательный метод для `getNativePageId` navigation кейса.
     *
     * @returns Правильный pageId.
     */
    private getNativePageIdForNavigation() {
        const stackSize = this.nativeHistoryStack.length;

        // Нажимая на кнопку назад, можно дойти до "первой" страницы,
        // в iOS для "первой" страницы не нужно слать `pageId`
        return this.b2n.environment === 'ios' && stackSize <= 1 ? null : stackSize;
    }

    /**
     * Вспомогательный метод для `getNativePageId` only-title кейса.
     *
     * @returns Правильный pageId.
     */
    private getNativePageIdForTitleReplacing() {
        const stackSize = this.nativeHistoryStack.length;

        if (this.b2n.environment === 'android') {
            // Для смены заголовка в Андроид просто повторяем текущий `pageId`.
            // В отличии от iOS, если не послать `pageId` первой страницы,
            // Вебвью не будет закрываться по клику на нативный «Назад».
            return stackSize <= 1 ? 1 : stackSize;
        }

        // Если в iOS не послать `pageId`, следующее нажатие на
        // нативную кнопку назад закроет webview.
        return stackSize <= 1 ? null : stackSize;
    }

    /**
     * Обработчик для `window.onpopstate` события. Который сработает
     * после нажатия на кнопку "Назад" в нативе, вызова `history.back()` и `history.go(-x)`.
     */
    private handleBack() {
        const previousState = !!sessionStorage.getItem(
            PREVIOUS_NATIVE_NAVIGATION_AND_TITLE_STATE_STORAGE_KEY,
        );

        if (previousState) {
            // В b2n этот метод отмечен модификатором доступа private дабы не торчал наружу, но тут его нужно вызвать
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.b2n.restorePreviousState();
        }

        this.nativeHistoryStack = this.nativeHistoryStack.slice(0, -this.numOfBackSteps);
        this.numOfBackSteps = 1;

        if (this.nativeHistoryStack.length < 1) {
            this.b2n.closeWebview();

            return;
        }

        const pageTitle = this.nativeHistoryStack[this.nativeHistoryStack.length - 1];

        this.syncHistoryWithNative(pageTitle, 'navigation');
    }

    /**
     * Синхронизирует состояние истории переходов и заголовок с приложением.
     *
     * @param pageTitle Заголовок, который нужно отрисовать в приложении.
     * @param purpose Цель взаимодействия с приложением.
     */
    private syncHistoryWithNative(pageTitle: string, purpose: SyncPurpose) {
        const pageId = this.getNativePageId(purpose);

        if (this.b2n.environment === 'android') {
            const pageSettingsObj: { pageTitle: string; pageId?: number } = { pageTitle };

            if (pageId) {
                pageSettingsObj.pageId = pageId;
            }

            const paramsToSend = JSON.stringify(pageSettingsObj);

            if (this.lastSetPageSettingsParams !== paramsToSend) {
                this.b2n.AndroidBridge?.setPageSettings(paramsToSend);
                this.lastSetPageSettingsParams = paramsToSend;
            }
        } else {
            const pageTitleStr = `?pageTitle=${encodeURIComponent(pageTitle)}`;
            const pageIdStr = pageId ? `&pageId=${pageId}` : '';

            const paramsToSend = `ios:setPageSettings/${pageTitleStr + pageIdStr}`;

            if (this.lastSetPageSettingsParams !== paramsToSend) {
                window.location.replace(paramsToSend);
                this.lastSetPageSettingsParams = paramsToSend;
            }
        }
    }

    /**
     * Метод для перехода в веб из другого веб приложения в рамках
     * одной вебвью сессии
     * @param pageId - Номер текущего page который нужно отправить в приложение
     * @param title - Title текущего page который нужно отправить в приложение
     */
    private supportSharedSession(pageId: number, title: string) {
        this.nativeHistoryStack = new Array(pageId).fill('');

        this.syncHistoryWithNative(title, 'title-replacing');
        this.reassignPopstateListener();
    }

    /**
     * Восстанавливает свое предыдущее состояние nativeHistoryStack и title из sessionStorage
     */
    private restorePreviousState() {
        const previousState: PreviousNativeNavigationAndTitleState = JSON.parse(
            sessionStorage.getItem(PREVIOUS_NATIVE_NAVIGATION_AND_TITLE_STATE_STORAGE_KEY) || '',
        );

        this.nativeHistoryStack = previousState.nativeHistoryStack;
        this.syncHistoryWithNative(previousState.title, 'title-replacing');
        this.reassignPopstateListener();

        sessionStorage.removeItem(PREVIOUS_NATIVE_NAVIGATION_AND_TITLE_STATE_STORAGE_KEY);
    }

    /**
     *  Вспомогательный метод для setInitialView, supportSharedSession
     *  переназначает обработчик @handleBack для `window.onpopstate` события
     */
    private reassignPopstateListener() {
        window.removeEventListener('popstate', this.handleBack);
        window.addEventListener('popstate', this.handleBack);
    }

    /**
     * Вспомогательный метод для navigateInsideASharedSession.
     * Подготавливает внешнюю ссылку в рамках контракта для совместной работы веб-приложений в
     * рамках одной вебвью сессии
     * @param url - url иного веб приложения
     * @return подготовленная согласно контракту ссылка на иное веб приложение с initial query
     * параметрами от нативе, а так же nextPageId
     */
    private prepareExternalLinkBeforeOpen(url: string) {
        const currentPageId = this.nativeHistoryStack.length;

        const divider = new URL(url).searchParams.toString() ? '&' : '?';

        const link = new URL(`${url}${divider}${this.b2n.originalWebviewParams}`);

        link.searchParams.set('nextPageId', (currentPageId + 1).toString());

        return link.toString();
    }
}
