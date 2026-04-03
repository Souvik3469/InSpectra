/// <reference types="vite/client" />

declare module '*?inline' {
  const content: string
  export default content
}

/** Injected by Vite define — true in watch/dev mode, false in production build */
declare const __DEV__: boolean
