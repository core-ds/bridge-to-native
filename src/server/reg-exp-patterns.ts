export const iosAppIdPattern = /^com\.([a-z]+)\.app$/;

// Android приписывает после версии тип билда, например `feature`. Нам эта инфа не нужна.
export const versionPattern = /^(\d+\.\d+\.\d+)(\s.+)?$/;

export const webviewUaIOSPattern = new RegExp(
    ['WebView', '(iPhone|iPod|iPad)(?!.*Safari)'].join('|'),
    'ig',
);
