declare module "*.html?raw" {
  const content: string;
  export default content;
}
declare module "*.scss" {
  const content: any;
  export default content;
}

declare let dom: any;
declare let legacyNativeGm: any;
declare let getPlugin: (name: string) => any;
declare let betterncm: any;
declare let loadedPlugins: any;
declare let setSetting: (key: string, value: any) => void;
declare let getSetting: (key: string) => any;
declare let plugin: any;
declare let getMenu: any;

interface Window {
  [key: string]: any;
}

declare let registerAudioLevelCallback: any;
declare let unregisterAudioLevelCallback: any;
declare let betterncm_native: any;
declare let channel: any;
declare module "react-dom/client";

declare let legacyNativeCmder: any;
declare let ReactDOM: any;
