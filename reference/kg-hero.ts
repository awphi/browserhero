import {
  createTimeline,
  Event,
  Index,
  TimelineData,
  TimeRange,
} from "kronograph";
import { TimelinePrivate } from "kronograph/types";
import Parser, { Chart, Meta } from "chart2json";
import * as zip from "@zip.js/zip.js";
import { Difficulty, GuitarLane } from "chart2json/lib/Chart";
import {
  byId,
  getInputElement,
  getSelectElement,
  getSpanElement,
} from "./demo-utils";
import ini from "ini";
import { multiplyColorAlpha } from "@kg/colors";
import { getTime } from "date-fns";

const rate = 1000 / 100;
const sustainAlphaMultiplier = 1.5;
const timeline = createTimeline("kg");
const timelinePrivate = (timeline as any).private as TimelinePrivate;
const filePicker = document.querySelector("#picker") as HTMLInputElement;
const diffSelect = getSelectElement("difficulty");
const scoreText = getSpanElement("score");
const volumeSlider = getInputElement("volume");
const autoStrumCheckbox = getInputElement("autostrum");

const noteWidth = 25;
const noteHitArea = 100;

let currentSustains: string[] = [];
let autoStrum = false;
let viewWidth = 10;
let paused = true;
let point = 0;
let audio: HTMLAudioElement[] = [];
let currentChart: Chart.Chart;
let sync: string[] = [];
let interval: number;
const played = new Set<string>();
let score = 0;
let totalNotes = 0;

const keyMap: Index<string> = {
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  " ": "strum",
  x: "pause",
  z: "restart",
};

const controllerMap: { [idx: number]: string } = {
  1: "1",
  2: "2",
  0: "3",
  3: "4",
  5: "5",
};

const keyState: Index<boolean> = {
  "1": false,
  "2": false,
  "3": false,
  "4": false,
  "5": false,
};

const colorMap: Index<string> = {
  "1": "green",
  "2": "red",
  "3": "yellow",
  "4": "blue",
  "5": "orange",
  "1-sustain": "rgba(0,128, 0, 0.5)",
  "2-sustain": "rgba(255,0, 0, 0.5)",
  "3-sustain": "rgba(255,255, 0, 0.5)",
  "4-sustain": "rgba(0,0, 255, 0.5)",
  "5-sustain": "rgba(255,165, 0, 0.5)",
};

const entities = Object.fromEntries(
  [1, 2, 3, 4, 5].map((v) => [
    "n" + v,
    {
      label: "",
      color: colorMap[v.toString()],
    },
  ])
);

function resolveSpeed(
  bpm: number,
  resolution: number,
  updateRate: number
): number {
  return ((bpm / 60) * resolution) / (1000 / updateRate);
}

let controllerStrumState = Number.MAX_SAFE_INTEGER;

function updateGamepads(): void {
  const gpad = window.navigator.getGamepads()[0];
  if (gpad !== null && gpad.connected) {
    gpad.buttons
      .filter((_, i) => i in controllerMap)
      .forEach((v, i) => {
        keyState[controllerMap[i]] = v.pressed;
      });
    if (gpad.axes[9]) {
      // If we've strummed up or down and were previously neutral perform a strum
      if (gpad.axes[9] < 3 && controllerStrumState > 3) {
        strum();
      }
      controllerStrumState = gpad.axes[9];
    }
  }
}

function update(): void {
  for (let i = 0; i < 5; i++) {
    const id = "n" + (i + 1);
    const e = byId(id)!;
    const keyDown = keyState[String(i + 1)];
    if (keyDown && e.classList.contains("hidden")) {
      e.classList.remove("hidden");
      if (autoStrum) {
        strum();
      }
    } else if (!keyDown) {
      e.classList.add("hidden");
    }
  }

  scoreText.innerText = getScoreText(score, totalNotes);

  // Update the current sustained notes - filter out finished ones and hide early-stopped ones
  currentSustains = currentSustains.filter((v) => {
    const time = timeline.getEvent(v)?.time as TimeRange;
    const isInRange = getTime(time.end) > getTime(timeline.range().start);
    if (!isInRange) {
      return false;
    }

    const lane = v.split("-")[1];
    if (keyState[lane] === false) {
      timeline.setProperties({
        events: {
          [v]: {
            color: "rgba(0,0,0,0)",
          },
        },
      });
    }

    return keyState[lane];
  });
}

function strum(): void {
  const notesInRange: [string, number][][] = Array.from(
    { length: 5 },
    () => []
  );
  Object.keys(timeline.getInRangeItems().events).forEach((a) => {
    if (a.endsWith("hitbox")) {
      const note = a.split("-")[1];
      const pos = timeline.getEventPosition(a);
      if (pos !== null && pos.x1 < noteHitArea) {
        notesInRange[Number.parseInt(note) - 1].push([a, pos.x1]);
      }
    }
  });

  // KG hero uses very simple scoring -> no penalty for mis-strumming and partial chords are allowed
  for (let i = 0; i < 5; i++) {
    const keyDown = keyState[String(i + 1)];
    if (keyDown) {
      if (notesInRange[i].length >= 1) {
        const [note] = notesInRange[i].sort((a, b) => a[1] - b[1])[0];
        if (!played.has(note)) {
          played.add(note);
          const noteId = note.split("-hitbox")[0];
          const props = {
            events: {
              [noteId]: {
                color: "rgba(0,0,0,0)",
              },
            },
          };
          const sustainId = noteId + "-sustain";
          const sustain = timeline.getEvent(sustainId);
          if (sustain) {
            props.events[sustainId] = {
              color: multiplyColorAlpha(sustain.color!, sustainAlphaMultiplier),
            };

            currentSustains.push(sustainId);
          }
          timeline.setProperties(props);
          score += 1;
        }
      }
    }
  }
}

function getScoreText(s: number, n: number): string {
  const perc = n === 0 ? 0 : (s / n) * 100;
  return `Score: ${s}/${n} (${perc.toFixed(2)}%)`;
}

function load(
  chart: Chart.Chart,
  audioSrcs?: string[],
  difficulty?: Meta.Difficulty
): void {
  if (audioSrcs) {
    audio = audioSrcs.map((v) => new Audio(v));
    updateVolume();
  }
  currentChart = chart;
  const { end, data, notesCount } = compileChart(chart, difficulty);
  console.log(notesCount);
  totalNotes = notesCount;
  let bpm = 0;

  viewWidth = chart.song.resolution * 6;
  timeline.set(data);
  timeline.range(point, point + viewWidth);
  sync = Object.keys(chart.syncTrack);

  clearInterval(interval);
  interval = setInterval(() => {
    update();

    if (!paused && point < end + 1) {
      if (sync.length > 0) {
        const nextSync = sync[0];
        const tick = Number.parseInt(nextSync);
        if (point >= tick) {
          const events = chart.syncTrack[tick];
          events.forEach((e) => {
            if (e.kind === 0) {
              console.log("BPM Update: ", e.bpm);
              bpm = e.bpm;
            }
          });
          sync = sync.slice(1);
        }
      }

      point += resolveSpeed(bpm, chart.song.resolution, rate);
      timeline.range(point, point + viewWidth);
    }
  }, rate) as unknown as number;
}

function compileChart(
  chart: Chart.Chart,
  difficulty?: Meta.Difficulty,
  outroLength = viewWidth * 2
): { end: number; data: TimelineData; notesCount: number } {
  const events: Index<Event> = Object.create(null);
  let notesCount = 0;
  const diff =
    difficulty && difficulty in chart.difficulties
      ? difficulty
      : (Object.keys(chart.difficulties)[0] as Difficulty);
  const track = chart.difficulties[diff]!.Single!;

  getSelectElement("difficulty").selectedIndex = Object.keys(
    Meta.Difficulty
  ).indexOf(diff.toUpperCase());
  console.log("Compiling chart: " + chart.song.name + ", diff: " + diff);
  console.log("Chart: ", chart);

  let end = 0;
  Object.keys(track).forEach((t) => {
    const tick = Number.parseInt(t);
    end = Math.max(tick, end);
    track[tick].forEach((v) => {
      // If lanes isn't present then it's a special event so we ignore it
      if ("lanes" in v) {
        v.lanes.forEach(({ lane, sustain }) => {
          // Skip opens for now
          if (lane === GuitarLane.OPEN) {
            return;
          }
          const note = lane.toString();
          const noteTime = tick;
          if (sustain > 0) {
            events["note-" + lane + "-" + t + "-sustain"] = {
              entityIds: ["n" + note],
              time: {
                start: noteTime,
                end: noteTime + sustain,
              },
              color: colorMap[note + "-sustain"],
            };
          }

          // Visual blob
          events["note-" + lane + "-" + t] = {
            entityIds: ["n" + note],
            color: colorMap[note],
            time: noteTime,
          };
          // Hitbox note - a rect that spans the width of the blob for more accurate hit detection
          events["note-" + lane + "-" + t + "-hitbox"] = {
            entityIds: ["n" + note],
            color: "rgba(0,0,0,0)",
            time: {
              start: noteTime - noteWidth,
              end: noteTime + noteWidth,
            },
          };
          notesCount += 1;
        });
      }
    });
  });
  for (let i = 0; i < end; i += chart.song.resolution) {
    events["block" + i] = {
      time: i,
      entityIds: Object.keys(entities),
      color: "rgba(0,0,0,0)",
    };
  }

  return {
    data: { entities, events, ordering: "keyorder" },
    end: end + outroLength,
    notesCount,
  };
}

function loadMetadata(entries: zip.Entry[]): void {
  const image = entries.find(
    (e) =>
      e.filename.endsWith(".png") ||
      e.filename.endsWith(".jpg") ||
      e.filename.endsWith(".jpeg")
  );

  const img = document.querySelector("#info > img") as HTMLImageElement;
  if (image !== undefined) {
    image.getData!(new zip.BlobWriter()).then((blob) => {
      img.src = URL.createObjectURL(blob);
    });
  } else {
    img.src = "";
  }

  const songIni = entries.find((e) => e.filename.endsWith("song.ini"));
  if (songIni !== undefined) {
    songIni.getData!(new zip.TextWriter()).then((text) => {
      byId("info")?.classList.remove("hidden");
      const data = ini.parse(text);
      const song = data.song || data.Song;
      console.log("song.ini:", song);

      getSpanElement("title").innerText = song.name;
      getSpanElement("artist").innerText = song.artist;
      getSpanElement("album").innerText = song.album;
      getSpanElement("year").innerText = song.year;
    });
  }
}

function getSectionContent(
  section: string,
  chartParts: string[],
  trim = true
): string[] {
  const result: string[] = [];
  const idx = chartParts.indexOf(section);
  if (idx === -1) {
    return result;
  }
  let line = idx + 2;
  let content = trim ? chartParts[line].trim() : chartParts[line];
  while (content !== "}") {
    result.push(content);
    content = trim ? chartParts[line].trim() : chartParts[line];
    line++;
  }
  return result;
}

// Pre-parse the data before giving it to chart2json:
//  1. Remove phrases, lyrics or events wrapped in square brackets as chart2json doesn't like them
//  2. Append a 4/4 time signature to the sync track if none is present as per http://midi.teragonaudio.com/tech/midifile/time.htm
function preparse(chartData: string): string {
  const parts = chartData
    .split("\n")
    .filter(
      (a) =>
        !(
          a.includes("phrase_") ||
          a.includes("lyric") ||
          /\d+ = E \[.+\]/.test(a)
        )
    )
    .map((v) => (v.includes("Name =") ? `    Name = "Unknown Title"` : v));

  const syncTrack = getSectionContent("[SyncTrack]", parts);
  if (syncTrack.find((a) => /^\d+ = TS \d( \d)?$/.test(a)) === undefined) {
    const idx = parts.indexOf("[SyncTrack]");
    parts.splice(idx + 2, 0, "\t0 = TS 4");
  }

  return parts.join("\n");
}

async function loadZip(url: string | ArrayBuffer): Promise<void> {
  reset();
  byId("info")?.classList.add("hidden");
  const srcReader =
    typeof url === "string"
      ? new zip.HttpReader(url)
      : new zip.Uint8ArrayReader(new Uint8Array(url, 0, url.byteLength));
  const reader = new zip.ZipReader(srcReader);
  const entries = await reader.getEntries();
  const songFiles = entries.filter((e) => e.filename.endsWith(".ogg"));
  if (songFiles.length > 0) {
    const chartFile = entries.find((e) => e.filename.endsWith(".chart"));
    let chartData;
    if (chartFile === undefined) {
      const midiFile = entries.find(
        (e) => e.filename.endsWith(".mid") || e.filename.endsWith(".midi")
      );
      if (midiFile === undefined) {
        throw new Error("Could not find .chart or .mid(i) file!");
      }
      const midiData = await midiFile.getData!(new zip.BlobWriter("audio/mid"));
      const buf = await midiData.arrayBuffer();
      chartData = mid2Chart(buf);
    } else {
      chartData = await chartFile.getData!(new zip.TextWriter());
    }
    const songDatas = await Promise.all(
      songFiles.map((v) => v.getData!(new zip.BlobWriter("audio/ogg")))
    );

    chartData = preparse(chartData);
    console.log(chartData);
    const parsed = Parser.parse(chartData);
    if (!parsed.ok) {
      throw new Error(parsed.reason.reason);
    }

    try {
      loadMetadata(entries);
    } catch (_) {}
    load(parsed.value, songDatas.map(URL.createObjectURL));
  } else {
    throw new Error("Could not find .ogg(s)!");
  }
}

function setPaused(state: boolean): void {
  if (paused !== state) {
    paused = state;
    if (paused) {
      audio.forEach((v) => v.pause());
    } else {
      audio.forEach((v) => v.play());
    }
  }
}

function reset(): void {
  point = 0;
  played.clear();
  score = 0;
  setPaused(true);
  timeline.range(point, point + viewWidth);
  if (currentChart) {
    sync = Object.keys(currentChart.syncTrack);
  }
  if (audio) {
    audio.forEach((v) => (v.currentTime = 0));
  }
}

function updateVolume(): void {
  audio.forEach((v) => {
    v.volume = Number.parseFloat(volumeSlider.value);
  });
}

async function main(): Promise<void> {
  timeline.options({
    backgroundColor: "rgba(0,0,0,0)",
    events: {
      showEventFolds: false,
      heatmapThreshold: 10000,
    },
    entities: {
      showCircles: true,
      standardRowHeight: noteWidth * 2,
    },
  });

  timelinePrivate.options({
    fixedLabelAreaWidth: true,
    labelAreaWidth: 50,
    allowEventAggregation: false,
    eventBlobMaximumRadius: noteWidth * 2,
  });

  setInterval(updateGamepads, 20);

  window.addEventListener("keydown", ({ key }) => {
    const k = keyMap[key];
    if (k !== undefined) {
      switch (k) {
        case "pause":
          setPaused(!paused);
          return;
        case "restart":
          reset();
          load(currentChart);
          return;
        case "strum":
          strum();
          return;
      }
      keyState[k] = true;
    }
  });

  window.addEventListener("keyup", ({ key }) => {
    const k = keyMap[key];
    if (k !== undefined && Number.parseInt(k) !== NaN) {
      keyState[k] = false;
    }
  });

  diffSelect.addEventListener("change", () => {
    load(
      currentChart,
      undefined,
      diffSelect.children[diffSelect.selectedIndex].innerHTML as Difficulty
    );
    diffSelect.blur();
    reset();
  });

  autoStrumCheckbox.addEventListener("change", () => {
    autoStrum = autoStrumCheckbox.checked;
  });

  filePicker.addEventListener("change", async () => {
    if (filePicker.files !== null && filePicker.files.length > 0) {
      const buffer = await filePicker.files[0].arrayBuffer();
      loadZip(buffer);
      filePicker.blur();
    }
  });

  volumeSlider.addEventListener("change", updateVolume);
  //loadZip('./assets/songs/girlsjustwannahavefun.zip');
  //loadZip('./assets/songs/Oliver Tree - Cowboys Dont Cry.zip');
  //loadZip('./assets/songs/imstillstanding.zip');
  (window as any).loadZip = loadZip;
  (window as any).timeline = timeline;
}

main();
