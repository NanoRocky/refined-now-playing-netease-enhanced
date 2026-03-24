declare namespace Refine {
  declare type LrcLine = {
    startTime: number | null;
    endTime: number | null;
    words: {
      startTime: number | null;
      endTime: number | null;
      word: string;
    }[];
    text: string;
    role: string | null;
    isDuet: boolean;
    translatedLyric: string;
    romanLyric: string;
    bgLyric: string;
    isBG: boolean;
  };
  declare type RnpLine = {
    time: number | null;
    duration: number;
    originalLyric: string;
    translatedLyric: string;
    romanLyric: string;
    bgLyric: string;
    rawLyric: string;
    dynamicLyricTime: number | null;
    dynamicLyric: {
      time: any;
      duration: number;
      flag: number;
      word: any;
      isCJK: boolean;
      endsWithSpace: any;
      trailing: boolean;
    }[];
    isDuet: boolean;
    isBG: boolean;
  };
  declare type LineTransform = {
    top: number;
    scale: number;
    delay: number;
    blur?: number | undefined;
    highlightForce?: boolean | undefined;
    left?: number | undefined;
    duration?: number | undefined;
    extraTop?: number | undefined;
    opacity?: number | undefined;
    rotate?: number | undefined;
    outOfRangeHidden?: boolean | undefined;
  };
  declare type MayContributors = {
    original: {
      name: any;
      userid: any;
    };
    translation: {
      name: any;
      userid: any;
    };
    roles: {
      artistMetaList: { artistId: number; artistName: string }[];
      roleName: string;
    }[];
    lyricSource: any;
  };
}
