/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TAVILY_API_KEY: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
