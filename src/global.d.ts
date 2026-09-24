interface ImportMetaEnv {
  readonly VITE_PAYPAL_CLIENT_ID: string;
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
