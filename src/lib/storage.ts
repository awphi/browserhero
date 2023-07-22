import Keyv from "keyv";
import { KeyvFile } from "keyv-file";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import type { ChorusAPISong } from "./chorus";

const archiveFileExtensions = [".zip", ".rar", ".7z"];
const basePath = "/tmp/browserhero";
const kvFilePath = path.resolve(basePath, "manifest.json");
const archiveExtensions = Object.values(archiveFileExtensions);

// super simple on-disk KV storage
export const songMetadataKv = new Keyv({
  store: new KeyvFile({
    filename: kvFilePath,
  }),
  namespace: "songs_meta",
});

export const songsObjectKv = new Keyv({
  store: new KeyvFile({
    filename: kvFilePath,
  }),
  namespace: "songs_objects",
});

// for now we just store archives on the disk of the server and serve them up straight from fs via streams
// - in the future we can migrate these to an S3 bucket
export function getSongArchiveStream(id: string):
  | {
      stream: ReadableStream;
      ext: string;
    }
  | false {
  for (const ext of archiveExtensions) {
    const filePath = path.join(basePath, `${id}.${ext}`);
    if (fs.existsSync(filePath)) {
      return {
        stream: Readable.toWeb(fs.createReadStream(filePath)) as ReadableStream,
        ext,
      };
    }
  }

  return false;
}

export async function saveSongArchiveToDisk(id: string): Promise<void> {
  const song = (await songMetadataKv.get(id.toString())) as ChorusAPISong;
  song.isProcessing = true;
  await songMetadataKv.set(song.id.toString(), song);

  // TODO download the song archive via the gdrive API, zip it up (if needed) and store it at ${basePath}/${id}.[zip|7z|rar]
  // then set the isProcessing flag to false :)
}
