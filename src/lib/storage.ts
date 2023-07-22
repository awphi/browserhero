import Keyv from "keyv";
import { KeyvFile } from "keyv-file";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

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

export function getSongArchiveStream(id: string): {
  stream: ReadableStream;
  ext: string;
} {
  for (const ext of archiveExtensions) {
    const filePath = path.join(basePath, `${id}.${ext}`);
    if (fs.existsSync(filePath)) {
      return {
        stream: Readable.toWeb(fs.createReadStream(filePath)) as ReadableStream,
        ext,
      };
    }
  }

  throw new Error("File does not exist.");
}
