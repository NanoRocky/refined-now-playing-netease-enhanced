// code from material you theme

import "./refined-control-bar.scss";
import { waitForElement, getSetting, setSetting } from "../utils/utils";

const injectHTML = (
  type: any,
  html: any,
  parent: any,
  fun = (dom: HTMLElement | any) => {},
) => {
  const dom = document.createElement(type);
  dom.innerHTML = html;
  fun.call(this, dom);

  parent.appendChild(dom);
  return dom;
};
const addPrefixZero = (num: any, len: any) => {
  num = num.toString();
  while (num.length < len) {
    num = "0" + num;
  }
  return num;
};
const timeToSeconds = (time: any) => {
  let seconds = 0;
  const parts = time.split(":");
  for (let i = 0; i < parts.length; i++) {
    seconds += parseInt(parts[i]) * Math.pow(60, parts.length - i - 1);
  }
  return seconds;
};
const secondsToTime = (seconds: any) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${addPrefixZero(s, 2)}`;
};
const updateTimeIndicator = () => {
  const passed = document.querySelector("#rnp-time-passed");
  const rest = document.querySelector("#rnp-time-rest");

  const passedTime = timeToSeconds(
    (document!.querySelector("time.now") as any).innerText,
  );
  const totalTime = timeToSeconds!(
    (document!.querySelector("time.all") as any).innerText,
  );
  const remainTime = totalTime - passedTime;

  (passed as any).innerText = secondsToTime!(passedTime);
  (rest as any).innerText =
    window.rnpTimeIndicator == "remain"
      ? "-" + secondsToTime(remainTime)
      : secondsToTime(totalTime);
};
const updateTimeIndicatorPosition = () => {
  const selectorList = [".brt", ".speed", ".audioEffect", ".spk"];
  let leftestButton: any;
  for (const selector of selectorList) {
    leftestButton = document.querySelector(".m-player " + selector);
    if (!leftestButton) {
      continue;
    }
    if (leftestButton.childElementCount != 0) {
      break;
    }
  }
  const right =
    parseInt(window.getComputedStyle(leftestButton).right) +
    leftestButton.clientWidth +
    15;
  (document as any).querySelector("#rnp-time-indicator").style.right =
    right + "px";
};

const init = () => {
  if (
    document.body.classList.contains("material-you-theme") ||
    ~~loadedPlugins.MaterialYouTheme ||
    ~~loadedPlugins["ark-theme"]
  ) {
    return;
  }

  window.timeIndicator = getSetting("time-indicator", "remain");
  waitForElement("#main-player", (dom: HTMLElement | any) => {
    injectHTML(
      "div",
      `
			<span id="rnp-time-passed">0:00</span>
			/
			<span id="rnp-time-rest">0:00</span>
		`,
      dom,
      (dom: HTMLElement | any) => {
        dom.id = "rnp-time-indicator";
        dom.style = "opacity: 0; pointer-events: none;";
      },
    );
    (document as any)
      .querySelector("#rnp-time-rest")
      .addEventListener("click", () => {
        if ((window.rnpTimeIndicator ?? "remain") == "remain") {
          window.rnpTimeIndicator = "total";
        } else {
          window.rnpTimeIndicator = "remain";
        }
        setSetting("time-indicator", window.rnpTimeIndicator);
        updateTimeIndicator();
        updateTimeIndicatorPosition();
      });

    new MutationObserver(() => {
      updateTimeIndicator();
      // @ts-ignore
    }).observe(document.querySelector("time.now"), { childList: true });
    new MutationObserver(() => {
      updateTimeIndicatorPosition();
      // @ts-ignore
    }).observe(document.querySelector("#main-player .brt"), {
      childList: true,
    });

    new MutationObserver(() => {
      updateTimeIndicatorPosition();
      // @ts-ignore
    }).observe(document.querySelector("#main-player .speed"), {
      childList: true,
    });
  });
};

init();
