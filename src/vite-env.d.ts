/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TAVILY_API_KEY: string | undefined;

  // Feature flags (set in Vercel)
  readonly VITE_FEATURE_JOB_SEARCH_ENABLED: string | undefined;
  readonly VITE_FEATURE_WEB_RESEARCH_ENABLED: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
