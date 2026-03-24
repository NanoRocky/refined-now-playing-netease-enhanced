export const waitForElement = (
  selector_init: string | string[],
  fun: (element: Element | null) => void,
): void => {
  const selector: string[] =
    typeof selector_init === "string"
      ? selector_init.split(",")
      : selector_init;
  let done = true;
  for (const s of selector) {
    if (!document.querySelector(s)) {
      done = false;
    }
  }
  if (done) {
    for (const s of selector) {
      fun.call(this, document.querySelector(s));
    }
    return;
  }
  let interval = setInterval(() => {
    let done = true;
    for (const s of selector) {
      if (!document.querySelector(s)) {
        done = false;
      }
    }
    if (done) {
      clearInterval(interval);
      for (const s of selector) {
        fun.call(this, document.querySelector(s));
      }
    }
  }, 100);
};
export const waitForElementAsync = async (
  selector: string,
): Promise<Element | null> => {
  if (document.querySelector(selector)) {
    return document.querySelector(selector);
  }
  return await betterncm.utils.waitForElement(selector);
};
export const getSetting = (
  option: string,
  defaultValue: number | boolean | string = "",
): any | null => {
  if (option.endsWith("-fm")) {
    option = option.replace(/-fm$/, "");
  }
  option = "refined-now-playing-" + option;
  let value: any | null = localStorage.getItem(option);
  if (!value) {
    value = defaultValue;
  }
  if (value === "true") {
    value = true;
  } else if (value === ("false" as any)) {
    value = false;
  }
  return value;
};
export const setSetting = (option: string, value: any): void => {
  option = "refined-now-playing-" + option;
  localStorage.setItem(option, value);
};
export const chunk = <T,>(input: T[], size: number): T[][] => {
  return input.reduce((arr: T[][], item: T, idx: number) => {
    return idx % size === 0
      ? [...arr, [item]]
      : [...arr.slice(0, -1), [...arr.slice(-1)[0], item]];
  }, []);
};
export const copyTextToClipboard = (text: string): void => {
  const textarea = document.createElement("textarea");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy", true);
  document.body.removeChild(textarea);
};
export const cyrb53 = (str: string, seed: number = 0): number => {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch: any; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

export const getPlugin = (): any => {
  const name = "RefinedNowPlaying Enhanced";
  return (
    Object.values(loadedPlugins).find((x: any) => x.manifest.name === name) ||
    loadedPlugins.RefinedNowPlaying ||
    loadedPlugins["refined-now-playing-netease"]
  );
};
