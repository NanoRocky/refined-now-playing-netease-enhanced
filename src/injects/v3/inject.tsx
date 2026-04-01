import { Background } from "../../components/background";
import { CoverShadow } from "../../components/cover-shadow";
import { Lyrics } from "../../components/lyrics";
import { MiniSongInfo } from "../../components/mini-song-info";
import { showContextMenu } from "../../components/context-menu";
import { whatsNew } from "../../components/whats-new";
import {
  waitForElement,
  waitForElementAsync,
  copyTextToClipboard,
  getSetting,
} from "../../utils/utils";

export const injectV3 = (
  updateCDImage: () => void,
  addSettingsMenu: (isFM?: boolean) => Promise<void>,
  addFullScreenButton: (dom: HTMLElement) => void,
  calcAccentColor: (dom: HTMLElement | any, isFM?: boolean) => void,
) => {
  // TODO: Implement v3 inject logic
  console.log("Loading v3 inject logic...");
};
