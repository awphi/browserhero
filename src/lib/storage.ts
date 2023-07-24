import Keyv from "keyv";
import { KeyvFile } from "keyv-file";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { Readable } from "stream";
import type { ChorusAPISong } from "./chorus";
import { google } from "googleapis";
import JSZip from "jszip";
import { getExtension } from "./util";

const archiveFileExtensions = [".zip", ".rar", ".7z"];
const basePath = "/tmp/browserhero";
const kvFilePath = path.resolve(basePath, "manifest.json");
const archiveExtensions = Object.values(archiveFileExtensions);
const textEncoder = new TextEncoder();

const driveApi = google.drive({
  auth: new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    keyFile: "googlecloud_credentials.json",
  }),
  version: "v3",
});

// super simple on-disk KV storage - in the future we can migrate these to a cloud KV like vercel KV or redis
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

/*
const res = await driveApi.files.get({
  fileId: "1HLzX84-JKtG-C5itGJPh_3N2l_hALMlz",
});
 */

function getGoogleDriveFileId(url: string): string | undefined {
  const [, fileId] =
    url.match(/https:\/\/drive.google.com\/file\/d\/([^&]+)\/view/) ||
    url.match(/https:\/\/drive.google.com\/drive\/folders\/([^?]+)/) ||
    [];
  url.match(/id=([^&]+)&?/) || url.match(/folders\/([^?]+)/) || [];
  return fileId;
}

async function fetchGoogleDriveFile(fileId: string): Promise<ArrayBuffer> {
  const res = await driveApi.files.get({
    fileId: fileId,
    alt: "media",
  });
  return await new Blob([res.data as string], {
    type: "application/octet-stream",
  }).arrayBuffer();
}

async function fetchAndZipGoogleDriveFolder(
  fileId: string
): Promise<ArrayBuffer> {
  const query = `\'${fileId}\' in parents`;
  // TODO download folder + zip
  const { data: folderContent } = await driveApi.files.list({
    q: query,
  });
  if (folderContent.incompleteSearch || !folderContent.files) {
    throw new Error(
      `Invalid search for file ID: ${fileId} - ${JSON.stringify(
        folderContent
      )}.`
    );
  }

  const zip = new JSZip();
  const files: [string, ArrayBuffer][] = await Promise.all(
    folderContent.files.map(async (file) => [
      file.name as string,
      await fetchGoogleDriveFile(file.id!),
    ])
  );

  for (const [name, dat] of files) {
    console.log(name, typeof dat, dat);
    zip.file(name, dat);
  }
  return zip.generateAsync({ type: "arraybuffer" });
}

export async function saveSongArchiveToDisk(id: string): Promise<void> {
  const song = (await songMetadataKv.get(id.toString())) as ChorusAPISong;
  //song.isProcessing = true;
  //await songMetadataKv.set(song.id.toString(), song);
  const fileId = getGoogleDriveFileId(song.link);
  if (fileId) {
    console.log(song.link, fileId);

    try {
      const { data: meta } = await driveApi.files.get({
        fileId,
      });
      let zip: ArrayBuffer;
      let ext: string = "zip";
      if (meta.mimeType === "application/vnd.google-apps.folder") {
        zip = await fetchAndZipGoogleDriveFolder(fileId);
      } else {
        zip = await fetchGoogleDriveFile(fileId);
        ext = getExtension(meta.mimeType!)!;
      }
      console.log(zip, ext, fileId);
      return fsPromises.writeFile(`./${id}.${ext}`, Buffer.from(zip));
    } catch (e) {
      console.error(e);
    }
  } else {
    console.error(`Could not determine file ID from link: ${song.link}`);
  }

  // TODO download the song archive via the gdrive API, zip it up (if needed) and store it at ${basePath}/${id}.[zip|7z|rar]
  // then set the isProcessing flag to false :)
}
