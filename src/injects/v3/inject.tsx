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
  (window as any).rnpDispatchHook = (actionWrapper: any) => {
    if (actionWrapper?.type === "PUT") {
      const action = actionWrapper?.payload?.action;
      if (action?.type === "lyric/updateLyric" && action.payload) {
        if (typeof (window as any).onProcessLyrics === "function") {
          try {
            const rawLyrics = action.payload;
            const songId = rawLyrics.trackId || (window as any).lastSongID;
            let processed = (window as any).onProcessLyrics(
              rawLyrics,
              songId,
              true,
            );
            if (processed && typeof processed.then !== "function") {
              action.payload = processed;
            } else if (processed && typeof processed.then === "function") {
              processed
                .then((res: any) => {
                  if (res) {
                    action.payload = res;
                  }
                })
                .catch((e: any) => console.error("[RNP] ", e));
            }
          } catch (e) {
            console.error("[RNP] Error in rnpDispatchHook onProcessLyrics:", e);
          }
        }
      }
    }
  };
};
