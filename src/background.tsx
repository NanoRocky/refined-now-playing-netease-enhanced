import React from "react";
import "./background.scss";
import { getGradientFromPalette } from "./color-utils";
import { getPaletteSync } from "colorthief";

const useState = React.useState;
const useEffect = React.useEffect;
const useRef = React.useRef;

export function Background(props: {
  type?: string;
  image: HTMLImageElement | null;
  isFM?: boolean;
  imageChangedCallback?: (dom: HTMLElement | any) => void;
}) {
  const [type, setType] = useState<string>(props.type ?? "blur"); // blur, gradient, fluid , solid
  const [url, setUrl] = useState<string>("");
  const [staticFluid, setStaticFluid] = useState<boolean>(true);
  const image = props.image;

  if (!props.isFM) {
    useEffect(() => {
      const observer = new MutationObserver(() => {
        if (image!.src === url) return;
        if (image!.complete) {
          setUrl(image!.src);
        }
      });
      observer.observe(image!, { attributes: true, attributeFilter: ["src"] });
      const onload = () => {
        setUrl(image!.src);
      };
      image!.addEventListener("load", onload);
      return () => {
        observer.disconnect();
        image!.removeEventListener("load", onload);
      };
    }, [image]);
  } else {
    useEffect(() => {
      const imageContainer = image;
      if (imageContainer!.querySelector(".cvr.j-curr img")) {
        setUrl(
          (
            imageContainer!.querySelector(
              ".cvr.j-curr img",
            )! as HTMLImageElement
          ).src,
        );
        props.imageChangedCallback!(
          imageContainer!.querySelector(".cvr.j-curr img"),
        );
      }
      const observer = new MutationObserver(() => {
        if (imageContainer!.querySelector(".cvr.j-curr img")) {
          setUrl(
            (
              imageContainer!.querySelector(
                ".cvr.j-curr img",
              )! as HTMLImageElement
            ).src,
          );
          props.imageChangedCallback!(
            imageContainer!.querySelector(".cvr.j-curr img"),
          );
        }
      });
      observer.observe(imageContainer!, { childList: true, subtree: true });
      return () => {
        observer.disconnect();
      };
    }, [image]);
  }

  useEffect(() => {
    document.addEventListener("rnp-background-type", (e: any) => {
      setType(e.detail.type ?? "blur");
    });
    document.addEventListener("rnp-static-fluid", (e: any) => {
      setStaticFluid(e.detail ?? false);
    });
  }, []);

  return (
    <>
      {type === "blur" && <BlurBackground url={url} />}
      {type === "gradient" && <GradientBackground url={url} />}
      {type === "fluid" && (
        <FluidBackground url={url} static={staticFluid} isFM={props.isFM} />
      )}
      {type === "solid" && <SolidBackground />}
      {type === "none" && (
        <>
          <div className="rnp-background-none"></div>
          <style>
            {`
							body.mq-playing .g-single {
								background: transparent !important;
							}
							body.mq-playing .g-sd,
							body.mq-playing .g-mn {
								opacity: 0;
							}
						`}
          </style>
        </>
      )}
    </>
  );
}
function BlurBackground(props: { url: string }) {
  // @ts-ignore
  const ref = useRef<HTMLDivElement>();
  useEffect(() => {
    if (!props.url) return;
    ref.current.style.backgroundImage = `url(${props.url})`;
    ref.current.style.transition = "background-image 1.5s ease";
  }, [props.url]);

  return <div ref={ref} className="rnp-background-blur" />;
}

function GradientBackground(props: { url: string }) {
  const [gradient, setGradient] = useState<string>(
    "linear-gradient(-45deg, #666, #fff)",
  );
  useEffect(() => {
    const image = new Image();
    image.crossOrigin = "Anonymous";
    console.log("loading image");
    image.onload = () => {
      console.log("image loaded");
      const paletteObjs = getPaletteSync(image);
      const palette = paletteObjs!.map((c) => [
        c.rgb().r,
        c.rgb().g,
        c.rgb().b,
      ]);
      // @ts-ignore
      setGradient(getGradientFromPalette(palette));
    };
    image.src = props.url;
  }, [props.url]);

  return (
    <div
      className="rnp-background-gradient"
      style={{ backgroundImage: gradient }}
    />
  );
}

function FluidBackground(props: {
  isFM?: boolean;
  static: boolean;
  url: string;
}) {
  // @ts-ignore
  const [canvas1, canvas2, canvas3, canvas4] = [
    useRef<HTMLCanvasElement>(null),
    useRef<HTMLCanvasElement>(null),
    useRef<HTMLCanvasElement>(null),
    useRef<HTMLCanvasElement>(null),
  ];
  // @ts-ignore
  const [feTurbulence, feDisplacementMap] = [
    useRef<SVGFETurbulenceElement>(null),
    useRef<SVGFEDisplacementMapElement>(null),
  ];
  // @ts-ignore
  const fluidContainer = useRef<HTMLDivElement | null>(null);
  // @ts-ignore
  const staticFluidStyleRef = useRef<HTMLStyleElement>(null);
  const [songId, setSongId] = useState<string>("0");

  const playState = useRef<boolean>(
    document!
      .querySelector("#main-player .btnp")!
      .classList.contains("btnp-pause"),
  );

  const onPlayStateChange = (id: string, state: any) => {
    //playState.current = (state.split('|')[1] == 'resume');
    if (!props.isFM) {
      playState.current = document!
        .querySelector("#main-player .btnp")!
        .classList.contains("btnp-pause");
    } else {
      // @ts-ignore
      playState.current = document!
        .querySelector(".m-player-fm .btnp")
        .classList.contains("btnp-pause");
    }
    setSongId(id);
    fluidContainer.current!.classList.toggle("paused", !playState.current);
    //console.log(id, playState.current, state.split('|')[1], document.querySelector("#main-player .btnp").classList.contains("btnp-pause"));
  };

  useEffect(() => {
    fluidContainer.current!.classList.toggle("paused", !playState.current);
  }, [songId]);

  useEffect(() => {
    legacyNativeCmder.appendRegisterCall(
      "PlayState",
      "audioplayer",
      onPlayStateChange,
    );
    return () => {
      legacyNativeCmder.removeRegisterCall(
        "PlayState",
        "audioplayer",
        onPlayStateChange,
      );
    };
  }, []);

  useEffect(() => {
    canvas1.current!.getContext("2d")!.filter = "blur(5px)";
    canvas2.current!.getContext("2d")!.filter = "blur(5px)";
    canvas3.current!.getContext("2d")!.filter = "blur(5px)";
    canvas4.current!.getContext("2d")!.filter = "blur(5px)";
  }, []);

  useEffect(() => {
    const image = new Image();
    image.crossOrigin = "Anonymous";
    image.onload = () => {
      const { width, height } = image;
      canvas1
        .current!.getContext("2d")!
        .drawImage(image, 0, 0, width / 2, height / 2, 0, 0, 100, 100);
      canvas2
        .current!.getContext("2d")!
        .drawImage(image, width / 2, 0, width / 2, height / 2, 0, 0, 100, 100);
      canvas3
        .current!.getContext("2d")!
        .drawImage(image, 0, height / 2, width / 2, height / 2, 0, 0, 100, 100);
      canvas4
        .current!.getContext("2d")!
        .drawImage(
          image,
          width / 2,
          height / 2,
          width / 2,
          height / 2,
          0,
          0,
          100,
          100,
        );
    };
    image.src = props.url;
    // @ts-ignore
    feTurbulence.current.setAttribute("seed", parseInt(Math.random() * 1000));
    staticFluidStyleRef.current!.innerHTML = `
			body.static-fluid .rnp-background-fluid-rect {
				animation-play-state: paused !important;
				// @ts-ignore
				animation-delay: -${Math.floor(Math.random() * 150)}s !important;
			}
			body.static-fluid .rnp-background-fluid-rect canvas {
				animation-play-state: paused !important;
				// @ts-ignore
				animation-delay: -${Math.floor(Math.random() * 60)}s !important;
			}
		`;
  }, [props.url]);

  const onResize = () => {
    const { width, height } = document.body.getBoundingClientRect();
    const viewSize = Math.max(width, height);
    const canvasSize = viewSize * 0.707;

    const canvasList = [canvas1, canvas2, canvas3, canvas4];
    for (let x = 0; x <= 1; x++) {
      for (let y = 0; y <= 1; y++) {
        const canvas = canvasList[y * 2 + x];
        canvas.current!.style.width = `${canvasSize}px`;
        canvas.current!.style.height = `${canvasSize}px`;
        const signX = x === 0 ? -1 : 1,
          signY = y === 0 ? -1 : 1;
        canvas.current!.style.left = `${width / 2 + signX * canvasSize * 0.35 - canvasSize / 2}px`;
        canvas.current!.style.top = `${height / 2 + signY * canvasSize * 0.35 - canvasSize / 2}px`;
      }
    }
  };

  useEffect(() => {
    window.addEventListener("resize", onResize);
    onResize();
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const setDisplacementScale = React.useCallback((value: string) => {
    if (!feDisplacementMap.current) return;
    feDisplacementMap.current.setAttribute("scale", value);
  }, []);

  // Audio-responsive background (For LibVolumeLevelProvider)
  if (loadedPlugins.LibFrontendPlay) {
    /*const processor = useRef<any>({});
		useEffect(() => {
			processor.current.audioContext = new AudioContext();
			processor.current.audioSource = null;
			processor.current.analyser = processor.current.audioContext.createAnalyser();
			//processor.current.analyser.connect(processor.current.audioContext.destination);
			processor.current.analyser.fftSize = 512;
			processor.current.filter = processor.current.audioContext.createBiquadFilter();
			processor.current.filter.type = 'lowpass';
			processor.current.bufferLength = processor.current.analyser.frequencyBinCount;
			processor.current.dataArray = new Float32Array(processor.current.bufferLength);
		}, []);

		const onAudioSourceChange = (e) => {
			processor.current.audio = e.detail;
			console.log('audio source changed', processor.current.audio);
			if (!processor.current.audio) return;
			if (processor.current.audioSource) processor.current.audioSource.disconnect();
			processor.current.audioSource = processor.current.audioContext.createMediaElementSource(processor.current.audio);
			processor.current.audioSource.connect(processor.current.filter).connect(processor.current.analyser);
			processor.current.audioSource.connect(processor.current.audioContext.destination);
		};

		useEffect(() => {
			loadedPlugins.LibFrontendPlay.addEventListener(
				"updateCurrentAudioPlayer",
				onAudioSourceChange
			);
			return () => {
				loadedPlugins.LibFrontendPlay.removeEventListener(
					"updateCurrentAudioPlayer",
					onAudioSourceChange
				);
			}
		}, []);*/

    const processor = useRef<{
      bufferLength?: number;
      dataArray?: Float32Array;
    }>({});
    useEffect(() => {
      //processor.current.bufferLength = loadedPlugins.LibFrontendPlay.currentAudioAnalyser.frequencyBinCount;
      processor.current.bufferLength = 1024;
      processor.current.dataArray = new Float32Array(
        processor.current.bufferLength,
      );
    }, []);

    const request = useRef(0);
    useEffect(() => {
      const animate = () => {
        request.current = requestAnimationFrame(animate);
        if (!playState.current) return;
        //processor.current.analyser.getFloatFrequencyData(processor.current.dataArray);
        //const max = Math.max(...processor.current.dataArray);
        loadedPlugins.LibFrontendPlay.currentAudioAnalyser.getFloatFrequencyData(
          processor.current.dataArray,
        );
        const max = Math.max(...processor.current.dataArray!);
        //const percentage = (max - processor.current.analyser.minDecibels) / (processor.current.analyser.maxDecibels - processor.current.analyser.minDecibels);
        const percentage = Math.pow(1.3, max / 20) * 2 - 1;
        //console.log(max, percentage, processor.current.audio.volume);
        setDisplacementScale(
          String(Math.min(600, Math.max(200, 800 - percentage * 800))),
        );
      };
      request.current = requestAnimationFrame(animate);
      return () => {
        cancelAnimationFrame(request.current);
      };
    }, []);
  }
  // Audio-responsive background (For LibVolumeLevelProvider)
  else if (typeof registerAudioLevelCallback == "function") {
    let audioLevels: Record<number, number> = {},
      audioLevelSum = 0,
      now = 0;
    // @ts-ignore
    let maxq: number[] = [],
      minq: number[] = [];
    let percentage: number;
    const onAudioLevelChange = (value: any) => {
      if (!playState.current) return;
      now += 1;
      if (now <= 100) {
        audioLevels[now] = value;
        audioLevelSum += value;
        // @ts-ignore
        while (maxq.length && audioLevels[maxq[maxq.length - 1]] <= value)
          maxq.pop();
        maxq.push(now);
        // @ts-ignore
        while (minq.length && audioLevels[minq[minq.length - 1]] >= value)
          minq.pop();
        minq.push(now);
        setDisplacementScale(String(400 - value * 200));
        return;
      }
      // @ts-ignore
      audioLevelSum -= audioLevels[now - 100];
      delete audioLevels[now - 100];
      // @ts-ignore
      audioLevels[now] = value;
      audioLevelSum += value;
      // @ts-ignore
      while (maxq.length && audioLevels[maxq[maxq.length - 1]] <= value)
        maxq.pop();
      maxq.push(now);
      while (maxq[0] <= now - 100) maxq.shift();
      // @ts-ignore
      while (minq.length && audioLevels[minq[minq.length - 1]] >= value)
        minq.pop();
      minq.push(now);
      while (minq[0] <= now - 100) minq.shift();
      //console.log(audioLevels[maxq[0]], audioLevels[minq[0]], audioLevels[maxq[0]] - audioLevels[minq[0]]);
      //console.log(value, audioLevelSum / 100, value - audioLevelSum / 100);
      // @ts-ignore
      percentage =
        (value - audioLevels[minq[0]]) /
        (audioLevels[maxq[0]] - audioLevels[minq[0]]);
      if (percentage != percentage) percentage = 1 / 3; // NaN
      // @ts-ignore
      function easeInOutQuint(x: number) {
        return x < 0.5
          ? 16 * x * x * x * x * x
          : 1 - Math.pow(-2 * x + 2, 5) / 2;
      }
      //console.log('percentage', percentage, easeInOutQuint(percentage));
      percentage = easeInOutQuint(percentage);
      const scale = 500 - percentage * 300;
      //feDisplacementMap.current.setAttribute('scale', scale);
      if (!feDisplacementMap.current) return;
      const oldScale = parseFloat(
        feDisplacementMap.current.getAttribute("scale")!,
      );
      setDisplacementScale(String(oldScale + (scale - oldScale) * 0.1));
    };
    useEffect(() => {
      registerAudioLevelCallback(onAudioLevelChange);
      return () => {
        unregisterAudioLevelCallback(onAudioLevelChange);
        setDisplacementScale(String(400));
      };
    }, []);
    useEffect(() => {
      audioLevels = [];
      audioLevelSum = 0;
    }, [songId]);
  }

  return (
    <>
      <style ref={staticFluidStyleRef} type="text/css">
        {`
					body.static-fluid .rnp-background-fluid-rect {
						animation-play-state: paused !important;
						animation-delay: 0s !important;
					}
					body.static-fluid .rnp-background-fluid-rect canvas {
						animation-play-state: paused !important;
						animation-delay: 0s !important;
					}
				`}
      </style>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter
          id="fluid-filter"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          filterUnits="objectBoundingBox"
          primitiveUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feTurbulence
            ref={feTurbulence}
            type="fractalNoise"
            baseFrequency="0.005"
            numOctaves="1"
            seed="0"
          ></feTurbulence>
          {props.static ? (
            <feDisplacementMap
              key={1}
              in="SourceGraphic"
              scale="400"
            ></feDisplacementMap>
          ) : (
            <feDisplacementMap
              key={2}
              ref={feDisplacementMap}
              in="SourceGraphic"
              scale="400"
            ></feDisplacementMap>
          )}
          {/*<feGaussianBlur stdDeviation="80 60" x="0%" y="0%" width="100%" height="100%" in="" edgeMode="duplicate" result="blur"></feGaussianBlur>*/}
        </filter>
      </svg>
      <div
        className="rnp-background-fluid"
        style={{ backgroundImage: `url(${props.url})` }}
      >
        <div className="rnp-background-fluid-rect" ref={fluidContainer}>
          // @ts-ignore
          <canvas
            ref={canvas1}
            className="rnp-background-fluid-canvas"
            data-canvas-id="1"
            width="100"
            height="100"
          />
          // @ts-ignore
          <canvas
            ref={canvas2}
            className="rnp-background-fluid-canvas"
            data-canvas-id="2"
            width="100"
            height="100"
          />
          // @ts-ignore
          <canvas
            ref={canvas3}
            className="rnp-background-fluid-canvas"
            data-canvas-id="3"
            width="100"
            height="100"
          />
          // @ts-ignore
          <canvas
            ref={canvas4}
            className="rnp-background-fluid-canvas"
            data-canvas-id="4"
            width="100"
            height="100"
          />
        </div>
      </div>
    </>
  );
}

function SolidBackground() {
  return <div className="rnp-background-solid"></div>;
}
