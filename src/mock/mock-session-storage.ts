export const mockSessionStorage = (key: string, value: unknown) => {
    const store = { [key]: value };

    const getItem = jest.fn(() => JSON.stringify(value));
    const setItem = jest.fn((setItemKey: string, setItemValue: string) => {
        store[setItemKey] = JSON.parse(setItemValue);
    });
    const removeItem = jest.fn((removeItemKey: string) => {
        delete store[removeItemKey];
    });

    const sessionStorageMock = {
        getItem,
        setItem,
        removeItem,
    };

    Object.defineProperty(window, 'sessionStorage', {
        value: sessionStorageMock,
    });

    return {
        getItem,
        setItem,
        removeItem,
    };
};
