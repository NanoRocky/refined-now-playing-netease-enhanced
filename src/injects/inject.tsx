import { Background } from "../components/background";
import { CoverShadow } from "../components/cover-shadow";
import { Lyrics } from "../components/lyrics";
import { MiniSongInfo } from "../components/mini-song-info";
import { showContextMenu } from "../components/context-menu";
import { whatsNew } from "../components/whats-new";
import {
  waitForElement,
  waitForElementAsync,
  copyTextToClipboard,
  getSetting,
} from "../utils/utils";

export const injectV2 = (
  updateCDImage: () => void,
  addSettingsMenu: (isFM?: boolean) => Promise<void>,
  addFullScreenButton: (dom: HTMLElement) => void,
  calcAccentColor: (dom: HTMLElement | any, isFM?: boolean) => void,
) => {
  new MutationObserver(async () => {
    // Now playing page
    if (document!.querySelector(".g-single:not(.patched)")) {
      // @ts-ignore
      document.querySelector(".g-single").classList.add("patched");
      waitForElement(".n-single .cdimg img", (dom: HTMLElement | any) => {
        dom.addEventListener("load", updateCDImage);
        new MutationObserver(updateCDImage).observe(dom, {
          attributes: true,
          attributeFilter: ["src"],
        });

        dom.addEventListener("contextmenu", (e: any) => {
          e.preventDefault();
          e.stopPropagation();
          const imageURL = dom.src
            .replace(/^orpheus:\/\/cache\/\?/, "")
            .replace(/\?.*$/, "");
          showContextMenu(e.clientX, e.clientY, [
            {
              label: "复制图片地址",
              callback: () => {
                copyTextToClipboard(imageURL);
              },
            },
            {
              label: "在浏览器中打开图片",
              callback: () => {
                // @ts-ignore
                betterncm.app.exec(`${imageURL}`);
              },
            },
          ]);
        });
      });

      waitForElement(
        ".g-single .g-singlec-ct .n-single .mn .head .inf",
        (dom: HTMLElement | any) => {
          const addCopySelectionToItems = (items: any, closetSelector: any) => {
            const selection = (window! as any).getSelection();
            if (
              selection.toString().trim() &&
              selection.baseNode.parentElement.closest(closetSelector)
            ) {
              const selectedText = selection.toString().trim();
              items.unshift({
                label: "复制",
                callback: () => {
                  copyTextToClipboard(selectedText);
                },
              });
            }
          };
          dom.addEventListener("contextmenu", (e: any) => {
            e.preventDefault();
            e.stopPropagation();

            if (e.target.closest(".title .name")) {
              const songName = dom.querySelector(".title .name").innerText;
              const items = [
                {
                  label: "复制歌曲名",
                  callback: () => {
                    copyTextToClipboard(songName);
                  },
                },
              ];
              addCopySelectionToItems(items, ".title .name");
              showContextMenu(e.clientX, e.clientY, items);
              return;
            }

            if (e.target.closest(".info .alias")) {
              const songAlias = dom.querySelector(".info .alias").innerText;
              const items = [
                {
                  label: "复制歌曲别名",
                  callback: () => {
                    copyTextToClipboard(songAlias);
                  },
                },
              ];
              addCopySelectionToItems(items, ".info .alias");
              showContextMenu(e.clientX, e.clientY, items);
              return;
            }
          });
        },
      );

      const background = document.createElement("div");
      background.classList.add("rnp-bg");
      ReactDOM.render(
        <Background
          type={getSetting("background-type", "fluid")}
          // @ts-ignore
          image={await waitForElementAsync!(".n-single .cdimg img" as any)}
        />,
        background,
      );
      // @ts-ignore
      document.querySelector(".g-single").appendChild(background);

      const coverShadowController = document.createElement("div");
      coverShadowController.classList.add("rnp-cover-shadow-controller");
      ReactDOM.render(
        <CoverShadow
          image={await waitForElementAsync(".n-single .cdimg img")}
        />,
        coverShadowController,
      );
      document.body.appendChild(coverShadowController);

      waitForElement(
        ".g-single-track .g-singlec-ct .n-single .mn .lyric",
        (oldLyrics: any) => {
          oldLyrics.remove();
        },
      );
      const lyrics = document.createElement("div");
      lyrics.classList.add("lyric");
      ReactDOM.render(<Lyrics />, lyrics);
      waitForElement(
        ".g-single-track .g-singlec-ct .n-single .wrap",
        (dom: HTMLElement | any) => {
          dom.appendChild(lyrics);
        },
      );

      const miniSongInfo = document.createElement("div");
      miniSongInfo.classList.add("rnp-mini-song-info");
      setTimeout(async () => {
        ReactDOM.render(
          <MiniSongInfo
            image={await waitForElementAsync(".n-single .cdimg img")}
            infContainer={await waitForElementAsync(
              ".g-single .g-singlec-ct .n-single .mn .head .inf" as any,
            )}
          />,
          miniSongInfo,
        );
        // @ts-ignore
        document.querySelector(".g-single").appendChild(miniSongInfo);
      }, 0);

      addSettingsMenu();
      // @ts-ignore
      addFullScreenButton(document.querySelector(".g-single"));

      whatsNew();
    }
  }).observe(document.body, { childList: true });

  // 私人 FM
  const patchFM = async () => {
    if (
      document!.querySelector("#page_pc_userfm_songplay:not(.patched)" as any)
    ) {
      // @ts-ignore
      document
        .querySelector("#page_pc_userfm_songplay")
        .classList.add("patched");
      FMObserver.disconnect();

      const lyrics = document!.createElement("div" as any);
      lyrics.classList.add("lyric");
      // @ts-ignore
      document.querySelector("#page_pc_userfm_songplay").appendChild(lyrics);
      ReactDOM.render(<Lyrics isFM={true} />, lyrics);
      for (let i = 0; i < 15; i++) {
        setTimeout(() => {
          window.dispatchEvent(new Event("resize"));
        }, 200 * i);
      }

      const background = document.createElement("div");
      background.classList.add("rnp-bg", "fm-bg");
      ReactDOM.render(
        <Background
          type={getSetting("background-type", "fluid")}
          image={await waitForElementAsync(
            "#page_pc_userfm_songplay .fmplay .covers",
          )}
          isFM={true}
          imageChangedCallback={(dom: HTMLElement | any) => {
            if (!dom) return;
            calcAccentColor(dom, true);
          }}
        />,
        background,
      );
      // @ts-ignore
      document
        .querySelector("#page_pc_userfm_songplay")
        .appendChild(background);
      addSettingsMenu(true);
    }
  };
  let FMObserver = new MutationObserver(patchFM);
  window.addEventListener("hashchange", async () => {
    if (!window.location.hash.startsWith("#/m/fm/")) {
      FMObserver.disconnect();
      return;
    }
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        window.dispatchEvent(new Event("recalc-lyrics"));
        window.dispatchEvent(new Event("recalc-title"));
      }, 50 * i);
    }
    FMObserver.observe(document.body, { childList: true });
    window.dispatchEvent(new Event("recalc-lyrics"));
  });
};
