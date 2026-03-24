import { LyricLine, parseLyric } from "./liblyric/index";
import { cyrb53, getSetting } from "./utils";
import { fetchAMLL, parseAMLLTTML } from "./amll-provider";

const processLyrics = (
  lyrics: (LyricLine & { isInterlude?: boolean; unsynced?: boolean })[],
) => {
  for (const line of lyrics) {
    if (line.originalLyric == "") {
      line.isInterlude = true;
    }
  }
  return lyrics;
};

let currentRawLRC: null | string = null;

const _onProcessLyrics = window.onProcessLyrics ?? ((x: any) => x);
window.onProcessLyrics = (_rawLyrics: any, songID: any) => {
  if (!_rawLyrics || _rawLyrics?.data === -400)
    return _onProcessLyrics(_rawLyrics, songID);

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

  if ((rawLyrics?.lrc?.lyric ?? "") != currentRawLRC) {
    console.log("Update Raw Lyrics", rawLyrics);
    currentRawLRC = rawLyrics?.lrc?.lyric ?? "";
    setTimeout(async () => {
      let processedLyricsToUse: (LyricLine & { unsynced?: boolean })[] | null =
        null;

      const enableAMLL = getSetting("enable-amll", true);
      const amllFastSource = getSetting("amll-fast-source", false);
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

      // 1. 网易云音乐内置逐字 yrc
      if (dynamic) {
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

      const processedLyrics = processLyrics(processedLyricsToUse);
      const lyrics = {
        lyrics: processedLyrics,
        contributors: {} as Refine.MayContributors,
        unsynced: undefined as undefined | boolean,
        hash: undefined as undefined | string,
      };

      if (processedLyrics[0]?.unsynced) {
        lyrics.unsynced = true;
      }

      if (rawLyrics?.lyricUser) {
        lyrics.contributors.original = {
          name: rawLyrics.lyricUser.nickname,
          userid: rawLyrics.lyricUser.userid,
        };
      }
      if (rawLyrics?.transUser) {
        lyrics.contributors.translation = {
          name: rawLyrics.transUser.nickname,
          userid: rawLyrics.transUser.userid,
        };
      }
      lyrics.contributors.roles = rawLyrics?.roles ?? [];
      lyrics.contributors.roles = lyrics.contributors.roles.filter((role) => {
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
      for (let i = 0; i < lyrics.contributors.roles.length; i++) {
        const metaList = JSON.stringify(
          lyrics.contributors.roles[i].artistMetaList,
        );
        for (let j = i + 1; j < lyrics.contributors.roles.length; j++) {
          if (
            JSON.stringify(lyrics.contributors.roles[j].artistMetaList) ===
            metaList
          ) {
            lyrics.contributors.roles[i].roleName +=
              `、${lyrics.contributors.roles[j].roleName}`;
            lyrics.contributors.roles.splice(j, 1);
            j--;
          }
        }
      }

      if (rawLyrics?.source) {
        lyrics.contributors.lyricSource = rawLyrics.source;
      }
      lyrics.hash = `${betterncm.ncm.getPlaying().id}-${cyrb53(processedLyrics.map((x) => x.originalLyric).join("\\"))}`;
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
