declare global {
  interface ImportMeta {
    readonly env: {
      readonly DEV: boolean;
    };
  }
}

// vp dev sets Vite's DEV flag. Preview and deploy leave it false.
// The flag must be read as import.meta.env.DEV. A copied import.meta is rejected.
export function readsDevCatalog(): boolean {
  return import.meta.env.DEV === true;
}
