import { parseLyric } from './liblyric/index'
import { cyrb53, getSetting } from './utils'
import { fetchAMLL } from './amll-provider'

const preProcessLyrics = (lyrics: any) => {
	if (!lyrics) return null;
	if (!lyrics.lrc) lyrics.lrc = {};

	const original = (lyrics?.lrc?.lyric ?? '').replace(/\u3000/g, ' ');
	const translation = lyrics?.ytlrc?.lyric ?? lyrics?.ttlrc?.lyric ?? lyrics?.tlyric?.lyric ?? '';
	const roma = lyrics?.yromalrc?.lyric ?? lyrics?.romalrc?.lyric ?? '';
	const dynamic = lyrics?.yrc?.lyric ?? '';
	const approxLines = original.match(/\[(.*?)\]/g)?.length ?? 0;

	const parsed = parseLyric(
		original,
		translation,
		roma,
		dynamic
	);
	// 某些特殊情况（逐字歌词残缺不全）
	if (approxLines - parsed.length > approxLines * 0.7) { 
		return parseLyric(
			original,
			translation,
			roma
		);
	}
	return parsed;
}


const processLyrics = (lyrics: any) => {
	for (const line of lyrics) {
		if (line.originalLyric == '') {
			line.isInterlude = true;
		}
	}
	return lyrics;
}

let currentRawLRC: any = null;

const _onProcessLyrics = window.onProcessLyrics ?? ((x: any) => x);
window.onProcessLyrics = (_rawLyrics: any, songID: any) => {
	if (!_rawLyrics || _rawLyrics?.data === -400) return _onProcessLyrics(_rawLyrics, songID);

	let rawLyrics = _rawLyrics;
	// 本地歌词处理
	if (typeof(_rawLyrics) === 'string') { 
		rawLyrics = {
			lrc: {
				lyric: _rawLyrics,
			},
			source: {
				name: '本地',
			}
		}
	}

	if ((rawLyrics?.lrc?.lyric ?? '') != currentRawLRC) {
		console.log('Update Raw Lyrics', rawLyrics);
		currentRawLRC = (rawLyrics?.lrc?.lyric ?? '') ;
		const preprocessedLyrics = preProcessLyrics(rawLyrics);
		setTimeout(async () => {
			let processedLyricsToUse = preprocessedLyrics;
			const enableAMLL = getSetting('enable-amll', false);
			if (enableAMLL) {
				const playingId = betterncm.ncm.getPlaying().id;
				const amll = await fetchAMLL(playingId);
				if (amll && amll.length > 0) {
					processedLyricsToUse = amll;
					console.log('Using AMLL Lyrics');
				}
			}

			const processedLyrics = await processLyrics(processedLyricsToUse);
			const lyrics = {
				lyrics: processedLyrics,
				contributors: {}
			}

			if (processedLyrics[0]?.unsynced) {
				(lyrics as any).unsynced = true;
			}

			if (rawLyrics?.lyricUser) {
				(lyrics as any).contributors.original = {
					name: rawLyrics.lyricUser.nickname,
					userid: rawLyrics.lyricUser.userid,
				}
			}
			if (rawLyrics?.transUser) {
				(lyrics as any).contributors.translation = {
					name: rawLyrics.transUser.nickname,
					userid: rawLyrics.transUser.userid,
				}
			}
			(lyrics.contributors as any).roles = rawLyrics?.roles ?? [];
			(lyrics.contributors as any).roles = (lyrics as any).contributors.roles.filter((role: any) => {
				if (role.artistMetaList.length == 1 && role.artistMetaList[0].artistName == '无' && role.artistMetaList[0].artistId == 0) {
					return false;
				}
				return true;
			});
			// 合并相同的贡献者角色
			for (let i = 0; i < (lyrics as any).contributors.roles.length; i++) {
				const metaList = ((JSON as any) as any).stringify((lyrics.contributors as any).roles[i].artistMetaList);
				for (let j = i + 1; j < (lyrics as any).contributors.roles.length; j++) {
					if (JSON.stringify((lyrics.contributors as any).roles[j].artistMetaList) === metaList) {
						(lyrics.contributors as any).roles[i].roleName += `、${((lyrics as any).contributors.roles[j] as any).roleName}`;
						(lyrics as any).contributors.roles.splice(j, 1);
						j--;
					}
				}
			}
			

			if (rawLyrics?.source) {
				((lyrics as any).contributors as any).lyricSource = rawLyrics.source;
			}
			(lyrics as any).hash = `${betterncm.ncm.getPlaying().id}-${cyrb53(processedLyrics.map((x: any) => x.originalLyric).join('\\'))}`;
			window.currentLyrics = lyrics;
			console.group('Update Processed Lyrics');
			console.log('lyrics', window.currentLyrics.lyrics);
			console.log('contributors', window.currentLyrics.contributors);
			console.log('hash', window.currentLyrics.hash);
			console.groupEnd();
			document.dispatchEvent(new CustomEvent('lyrics-updated', {detail: window.currentLyrics}));
		}, 0);
	}
	return _onProcessLyrics(_rawLyrics, songID);
}
