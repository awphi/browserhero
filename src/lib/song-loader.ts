import Parser, { type Chart } from "chart2json";
import { mid2Chart } from "./mid2chart";
import ini from "ini";
import { unarchive } from "./unarchive";

const imageExtensions = ["png", "jpg", "jpeg"];
const audioExtensions = ["ogg", "mp3"];

export type RawSongBundle = Record<string, ArrayBufferLike>;

export interface SongBundle {
  chart: Chart.Chart;
  /** original filenames -> blob URLs */
  audio: Record<string, string>;
  /** original filenames -> blob URLs */
  images: Record<string, string>;
  /* song.ini entries */
  ini: Record<string, string>;
}

function makeBlobMap(
  rawBundle: RawSongBundle,
  filterFn: (str: string) => boolean,
  mimeTypeFn: (str: string) => string
): Record<string, string> {
  return Object.fromEntries(
    Object.keys(rawBundle)
      .filter(filterFn)
      .map((key) => {
        const blob = new Blob([rawBundle[key]], {
          type: mimeTypeFn(key),
        });
        return [key, URL.createObjectURL(blob)];
      })
  );
}

function getFileExtension(str: string): string {
  return str.split(".").pop()!;
}

async function getMetadata(
  rawBundle: RawSongBundle
): Promise<Pick<SongBundle, "images" | "ini">> {
  const images = makeBlobMap(
    rawBundle,
    (key) => imageExtensions.some((ext) => key.endsWith(ext)),
    (key) => `image/${getFileExtension(key)}`
  );
  let songIni: SongBundle["ini"] | undefined = undefined;

  if ("song.ini" in rawBundle) {
    const enc = new TextDecoder("utf-8");
    const iniText = enc.decode(rawBundle["song.ini"]);
    const data = ini.parse(iniText);
    songIni = data.song || data.Song;
  }

  if (songIni === undefined) {
    throw new Error("Missing song.ini");
  }

  return {
    images,
    ini: songIni,
  };
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
    .replace(/\r/g, "")
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

function getChartData(rawBundle: RawSongBundle): string {
  const keys = Object.keys(rawBundle);
  const chartFile = keys.find((e) => e.endsWith(".chart"));
  const enc = new TextDecoder("utf-8");

  // If we can't find a chart file then try looking for a midi
  if (chartFile === undefined) {
    const midiFile = keys.find(
      (e) => e.endsWith(".mid") || e.endsWith(".midi")
    );
    if (midiFile === undefined) {
      throw new Error("Could not find .chart or .mid(i) file!");
    }

    return mid2Chart(rawBundle[midiFile]);
  }

  return enc.decode(rawBundle[chartFile]);
}

async function processRawBundle(rawBundle: RawSongBundle): Promise<SongBundle> {
  const audio = makeBlobMap(
    rawBundle,
    (key) => audioExtensions.some((ext) => key.endsWith(ext)),
    (key) => `audio/${getFileExtension(key)}`
  );

  if (Object.keys(audio).length > 0) {
    const rawChartData = getChartData(rawBundle);
    const chartData = preparse(rawChartData);
    const parsedChartData = Parser.parse(chartData);
    if (parsedChartData.ok === false) {
      throw new Error(parsedChartData.reason.reason);
    }

    const meta = await getMetadata(rawBundle);

    return {
      ...meta,
      audio,
      chart: parsedChartData.value,
    };
  } else {
    throw new Error("Could not find .ogg(s)!");
  }
}

export async function loadSongZipFromUrl(url: string): Promise<SongBundle> {
  const archive = await fetch(url);
  const buf = await archive.arrayBuffer();
  return loadSongArchive(buf, archive.headers.get("Content-Type")!);
}

export async function loadSongZipFromFile(file: File): Promise<SongBundle> {
  const buf = await file.arrayBuffer();
  return loadSongArchive(buf, file.type);
}

export async function loadSongArchive(
  buf: ArrayBuffer,
  ext: string
): Promise<SongBundle> {
  const unarchived = await unarchive(ext, buf);
  const files = Object.fromEntries(
    Object.entries(unarchived).map(([key, value]) => {
      return [key, value.buffer];
    })
  );

  return processRawBundle(files);
}

export async function loadSongFromUrls(
  links: Record<string, string>
): Promise<SongBundle> {
  const files: RawSongBundle = {};
  await Promise.all(
    Object.keys(links).map((key) => {
      let fileName = key;
      const link = links[key];

      if (key === "mid") {
        fileName = "chart.mid";
      } else if (key === "ini") {
        fileName = "song.ini";
      } else if (key === "chart") {
        fileName = "notes.chart";
      }

      return fetch(link)
        .then((r) => r.arrayBuffer())
        .then((buf) => {
          files[fileName] = buf;
        });
    })
  );

  return processRawBundle(files);
}
