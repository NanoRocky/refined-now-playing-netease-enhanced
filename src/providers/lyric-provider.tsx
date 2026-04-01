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
  // 本地歌词处理
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
    if (forceRefresh) console.log("Force refreshing lyrics");
    else console.log("Update Raw Lyrics", rawLyrics);

    currentRawLRC = rawLyrics?.lrc?.lyric ?? "";
    setTimeout(async () => {
      let processedLyricsToUse = null;

      const enableAMLL = getSetting("enable-amll", true);
      const amllFastSource = getSetting("amll-fast-source", false);
      const playingId = betterncm.ncm.getPlaying().id;

      const enableCustomLyric = getSetting("use-custom-lyric", false);
      const customLyricUrl = getSetting(`use-custom-lyric-${playingId}`, "");

      if (!processedLyricsToUse && enableCustomLyric && customLyricUrl) {
        try {
          console.log("Fetching custom lyric from", customLyricUrl);
          const customResponse = await fetch(customLyricUrl);
          const customText = await customResponse.text();
          const approxLines = customText.split("\n").length;
          if (customText.includes("<tt") || customText.includes("<?xml")) {
            processedLyricsToUse = parseAMLLTTML(customText);
          } else if (
            customText.match(/\[\d+,\d+\]/) &&
            customText.match(/\(\d+,\d+(?:,\d+)?\)/)
          ) {
            const parsed = parseLyric(customText, "", "", customText);
            if (parsed && parsed.length > 0) {
              processedLyricsToUse = parsed;
            }
          } else {
            const parsed = parseLyric(customText, "", "", "");
            if (parsed && parsed.length > 0) {
              processedLyricsToUse = parsed;
            }
          }
          if (processedLyricsToUse) {
            console.log("Using Custom Lyric");
            (window as any).isCustomLyricLoaded = true;
          }
        } catch (e) {
          console.log("Failed to load custom lyric", e);
          (window as any).isCustomLyricLoaded = false;
        }
      } else {
        (window as any).isCustomLyricLoaded = false;
      }

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

      // 1. 网易云音乐内置逐字 yrc
      if (!processedLyricsToUse && dynamic) {
        const parsed = parseLyric(originalLRCStr, translation, roma, dynamic);
        if (approxLines - parsed.length <= approxLines * 0.7) {
          processedLyricsToUse = parsed;
          console.log("Using Netease YRC Lyrics");
        }
      }

      // 2. amll-ttml-db 逐字 ttml
      if (!processedLyricsToUse && enableAMLL) {
        const ttmlText = await fetchAMLL(
          playingId.toString(),
          "ttml",
          amllFastSource,
        );
        if (ttmlText) {
          const parsed = parseAMLLTTML(ttmlText);
          if (parsed && parsed.length > 0) {
            processedLyricsToUse = parsed;
            console.log("Using AMLL TTML Lyrics");
          }
        }
      }

      // 3. amll-ttml-db 逐字 yrc
      if (!processedLyricsToUse && enableAMLL) {
        const yrcText = await fetchAMLL(
          playingId.toString(),
          "yrc",
          amllFastSource,
        );
        if (yrcText) {
          const parsed = parseLyric(originalLRCStr, translation, roma, yrcText);
          if (parsed && parsed.length > 0) {
            processedLyricsToUse = parsed;
            console.log("Using AMLL YRC Lyrics");
          }
        }
      }

      // 4. 网易云音乐内置逐行 lrc
      if (!processedLyricsToUse && originalLRCStr) {
        const parsed = parseLyric(originalLRCStr, translation, roma);
        if (parsed && parsed.length > 0) {
          processedLyricsToUse = parsed;
          console.log("Using Netease LRC Lyrics");
        }
      }

      // 5. amll-ttml-db 逐行 lrc
      if (!processedLyricsToUse && enableAMLL) {
        const lrcText = await fetchAMLL(
          playingId.toString(),
          "lrc",
          amllFastSource,
        );
        if (lrcText) {
          const parsed = parseLyric(lrcText, translation, roma);
          if (parsed && parsed.length > 0) {
            processedLyricsToUse = parsed;
            console.log("Using AMLL LRC Lyrics");
          }
        }
      }

      // Fallback
      if (!processedLyricsToUse) {
        processedLyricsToUse = parseLyric(originalLRCStr, translation, roma);
        console.log("Using Fallback Lyrics");
      }

      if (betterncm.ncm.getPlaying().id !== playingId) {
        return;
      }

      const processedLyrics = await processLyrics(processedLyricsToUse);
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
      console.group("Update Processed Lyrics");
      console.log("lyrics", window.currentLyrics.lyrics);
      console.log("contributors", window.currentLyrics.contributors);
      console.log("hash", window.currentLyrics.hash);
      console.groupEnd();
      document.dispatchEvent(
        new CustomEvent("lyrics-updated", { detail: window.currentLyrics }),
      );
    }, 0);
  }
  return _onProcessLyrics(_rawLyrics, songID);
};
