declare global {
    interface Window {
        Android?: {
            setPageSettings: (params: string) => void;
        };
    }
}

export {};
