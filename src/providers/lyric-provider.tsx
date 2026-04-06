import { parseLyric } from "../liblyric/index";
import { cyrb53, getSetting } from "../utils/utils";
import { fetchAMLL, parseAMLLTTML } from "./amll-provider";

const processLyrics = (lyrics: any) => {
  for (const line of lyrics) {
    if (line.originalLyric == "") {
      line.isInterlude = true;
    }
  }
  return lyrics;
};

let currentRawLRC: any = null;

const _onProcessLyrics = window.onProcessLyrics ?? ((x: any) => x);
window.onProcessLyrics = (
  _rawLyrics: any,
  songID: any,
  forceRefresh = false,
) => {
  if (!_rawLyrics || _rawLyrics?.data === -400)
    return _onProcessLyrics(_rawLyrics, songID);

  (window as any).lastRawLyrics = _rawLyrics;
  (window as any).lastSongID = songID;

  let rawLyrics = _rawLyrics;
  if (typeof _rawLyrics === "string") {
    rawLyrics = {
      lrc: {
        lyric: _rawLyrics,
      },
      source: {
        name: "本地",
      },
    };
  }

  if ((rawLyrics?.lrc?.lyric ?? "") != currentRawLRC || forceRefresh) {
    if (forceRefresh) console.log("[RNP] 强制刷新歌词");
    else console.log("[RNP] 更新原始歌词", rawLyrics);

    currentRawLRC = rawLyrics?.lrc?.lyric ?? "";
    setTimeout(async () => {
      const playingId = betterncm.ncm.getPlaying().id;

      const translation =
        rawLyrics?.ytlrc?.lyric ??
        rawLyrics?.ttlrc?.lyric ??
        rawLyrics?.tlyric?.lyric ??
        "";
      const roma =
        rawLyrics?.yromalrc?.lyric ?? rawLyrics?.romalrc?.lyric ?? "";
      const dynamic = rawLyrics?.yrc?.lyric ?? "";
      const originalLRCStr = (rawLyrics?.lrc?.lyric ?? "").replace(
        /\u3000/g,
        " ",
      );
      const approxLines = originalLRCStr.match(/\[(.*?)\]/g)?.length ?? 0;

      const updateLyrics = async (parsedLyrics: any, sourceName: string) => {
        if (betterncm.ncm.getPlaying().id !== playingId) {
          return;
        }
        if (!parsedLyrics || parsedLyrics.length === 0) return;

        const processedLyrics = await processLyrics(parsedLyrics);
        const lyrics = {
          lyrics: processedLyrics,
          contributors: {},
        };

        if (processedLyrics[0]?.unsynced) {
          (lyrics as any).unsynced = true;
        }

        if (rawLyrics?.lyricUser) {
          (lyrics as any).contributors.original = {
            name: rawLyrics.lyricUser.nickname,
            userid: rawLyrics.lyricUser.userid,
          };
        }
        if (rawLyrics?.transUser) {
          (lyrics as any).contributors.translation = {
            name: rawLyrics.transUser.nickname,
            userid: rawLyrics.transUser.userid,
          };
        }
        (lyrics.contributors as any).roles = rawLyrics?.roles ?? [];
        (lyrics.contributors as any).roles = (
          lyrics as any
        ).contributors.roles.filter((role: any) => {
          if (
            role.artistMetaList.length == 1 &&
            role.artistMetaList[0].artistName == "无" &&
            role.artistMetaList[0].artistId == 0
          ) {
            return false;
          }
          return true;
        });
        // 合并相同的贡献者角色
        for (let i = 0; i < (lyrics as any).contributors.roles.length; i++) {
          const metaList = (JSON as any as any).stringify(
            (lyrics.contributors as any).roles[i].artistMetaList,
          );
          for (
            let j = i + 1;
            j < (lyrics as any).contributors.roles.length;
            j++
          ) {
            if (
              JSON.stringify(
                (lyrics.contributors as any).roles[j].artistMetaList,
              ) === metaList
            ) {
              (lyrics.contributors as any).roles[i].roleName +=
                `、${((lyrics as any).contributors.roles[j] as any).roleName}`;
              (lyrics as any).contributors.roles.splice(j, 1);
              j--;
            }
          }
        }

        if (rawLyrics?.source) {
          ((lyrics as any).contributors as any).lyricSource = rawLyrics.source;
        }
        (lyrics as any).hash =
          `${betterncm.ncm.getPlaying().id}-${cyrb53(processedLyrics.map((x: any) => x.originalLyric).join("\\"))}`;
        window.currentLyrics = lyrics;
        console.group(`[RNP] 更新处理后的歌词 (${sourceName})`);
        console.log("[RNP] 歌词", window.currentLyrics.lyrics);
        console.log("[RNP] 贡献者", window.currentLyrics.contributors);
        console.log("[RNP] 哈希值", window.currentLyrics.hash);
        console.groupEnd();
        document.dispatchEvent(
          new CustomEvent("lyrics-updated", { detail: window.currentLyrics }),
        );
      };

      let hasInternalWordByWord = false;

      // 0.优先获取网易云音乐内部逐字 YRC，加载。
      if (dynamic) {
        const parsed = parseLyric(originalLRCStr, translation, roma, dynamic);
        if (approxLines - parsed.length <= approxLines * 0.7) {
          console.log("[RNP] 使用网易云内部 YRC 歌词");
          await updateLyrics(parsed, "Netease YRC");
          hasInternalWordByWord = true;
        }
      }

      // 1.优先获取网易云音乐内部逐行 LRC，如果没有内部 YRC ，则加载。
      if (!hasInternalWordByWord && originalLRCStr) {
        const parsed = parseLyric(originalLRCStr, translation, roma);
        if (parsed && parsed.length > 0) {
          console.log("[RNP] 使用网易云内部 LRC 歌词");
          await updateLyrics(parsed, "Netease LRC");
        } else {
          // Fallback
          const fallbackParsed = parseLyric(originalLRCStr, translation, roma);
          console.log("[RNP] 使用兜底歌词");
          await updateLyrics(fallbackParsed, "Fallback");
        }
      } else if (!hasInternalWordByWord && !originalLRCStr) {
        // Fallback
        const fallbackParsed = parseLyric(originalLRCStr, translation, roma);
        console.log("[RNP] 使用兜底歌词");
        await updateLyrics(fallbackParsed, "Fallback");
      }

      // --- 外部源工作 ---
      const enableAMLL = getSetting("enable-amll", true);
      const amllFastSource = getSetting("amll-fast-source", false);
      const enableCustomLyric = getSetting("use-custom-lyric", false);
      const customLyricUrl = getSetting(`use-custom-lyric-${playingId}`, "");

      let hasLoadedCustom = false;

      // 2.加载自定义歌词，只要有，无论内部歌词有没有，都替换。
      if (enableCustomLyric && customLyricUrl) {
        try {
          console.log("[RNP] 正在从以下地址获取自定义歌词", customLyricUrl);
          const customResponse = await fetch(customLyricUrl);
          const customText = await customResponse.text();
          let customParsed = null;
          if (customText.includes("<tt") || customText.includes("<?xml")) {
            customParsed = parseAMLLTTML(customText);
          } else if (
            customText.match(/\[\d+,\d+\]/) &&
            customText.match(/\(\d+,\d+(?:,\d+)?\)/)
          ) {
            customParsed = parseLyric(customText, "", "", customText);
          } else {
            customParsed = parseLyric(customText, "", "", "");
          }

          if (customParsed && customParsed.length > 0) {
            console.log("[RNP] 使用自定义歌词");
            (window as any).isCustomLyricLoaded = true;
            await updateLyrics(customParsed, "Custom");
            hasLoadedCustom = true;
          } else {
            (window as any).isCustomLyricLoaded = false;
          }
        } catch (e) {
          console.log("[RNP] 加载自定义歌词失败", e);
          (window as any).isCustomLyricLoaded = false;
        }
      } else {
        (window as any).isCustomLyricLoaded = false;
      }

      if (hasLoadedCustom) return; // 如果使用了自定义歌词，就不需要去拿 AMLL 了
      if (!enableAMLL) return;
      let amllYrcParsed = null;
      // 3.如果网易云音乐内部没有逐字，获取 amll-ttml-db 逐字 ttml 。如果没有设置自定义歌词，则加载。
      if (!hasInternalWordByWord) {
        try {
          const ttmlText = await fetchAMLL(
            playingId.toString(),
            "ttml",
            amllFastSource,
          );
          if (ttmlText) {
            const parsed = parseAMLLTTML(ttmlText);
            if (parsed && parsed.length > 0) {
              console.log("[RNP] 使用 AMLL TTML 歌词");
              await updateLyrics(parsed, "AMLL TTML");
              return;
            }
          }
        } catch (e) {
          console.log("[RNP] 获取 AMLL TTML 失败", e);
        }
      }

      // 4.如果网易云音乐内部没有逐字且 amll-ttml-db 没有 ttml ，则获取 amll-ttml-db 逐字 yrc 。如果没有设置自定义歌词，则加载。
      if (!hasInternalWordByWord) {
        try {
          const yrcText = await fetchAMLL(
            playingId.toString(),
            "yrc",
            amllFastSource,
          );
          if (yrcText) {
            amllYrcParsed = parseLyric(
              originalLRCStr,
              translation,
              roma,
              yrcText,
            );
            if (amllYrcParsed && amllYrcParsed.length > 0) {
              console.log("[RNP] 使用 AMLL YRC 歌词");
              await updateLyrics(amllYrcParsed, "AMLL YRC");
              return; // 拿到了 YRC 就结束
            }
          }
        } catch (e) {
          console.log("[RNP] 获取 AMLL YRC 失败", e);
        }
      }

      // 5.如果网易云音乐内部没有逐字且 amll-ttml-db 没有 ttml 和 YRC ，则获取 amll-ttml-db 逐行 LRC。如果没有设置自定义歌词，则加载。
      if (!hasInternalWordByWord && !originalLRCStr) {
        // 如果网易云连普通 LRC 都没有，我们可以去拉 AMLL LRC
        try {
          const lrcText = await fetchAMLL(
            playingId.toString(),
            "lrc",
            amllFastSource,
          );
          if (lrcText) {
            const parsed = parseLyric(lrcText, translation, roma);
            if (parsed && parsed.length > 0) {
              console.log("[RNP] 使用 AMLL LRC 歌词");
              await updateLyrics(parsed, "AMLL LRC");
            }
          }
        } catch (e) {
          console.log("[RNP] 获取 AMLL LRC 失败", e);
        }
      }
    }, 0);
  }
  return _onProcessLyrics(_rawLyrics, songID);
};
