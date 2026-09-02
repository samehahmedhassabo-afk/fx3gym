export {};

declare global {
  interface Window {
    fx3System?: {
      isElectron: true;
      getTime: () => Promise<string>;
      setTime: (isoString: string) => Promise<string>;
    };
  }
}
