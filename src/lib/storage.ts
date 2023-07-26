import Keyv from "keyv";
import { KeyvFile } from "keyv-file";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { Readable } from "stream";
import type { ChorusAPISong } from "./chorus";
import { google } from "googleapis";
import JSZip from "jszip";
import { archiveExtensions, getFileExt } from "./util";
import { env } from "$env/dynamic/private";

const basePath = "/tmp/browserhero";
const kvFilePath = path.resolve(basePath, "manifest.json");

if (import.meta.env.DEV && !fs.existsSync(basePath)) {
  console.log(`Creating ${basePath}.`);
  fs.mkdirSync(basePath, { recursive: true });
}

if (!env.GOOGLE_CREDENTIALS) {
  throw new Error("Missing GOOGLE_CREDENTIALS!");
}

const driveApi = google.drive({
  auth: new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    credentials: JSON.parse(env.GOOGLE_CREDENTIALS),
  }),
  version: "v3",
});

// super simple on-disk KV storage - in the future we can migrate these to a cloud KV like vercel KV or redis
// TODO migrate to use @vercel/kv
export const songMetadataKv = new Keyv({
  store: new KeyvFile({
    filename: kvFilePath,
  }),
  namespace: "songs_meta",
});

// for now we just store archives on the disk of the server and stream them up straight from fs
// - in the future we can migrate these to an S3 bucket or similar
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

function getGoogleDriveFileId(url: string): string | undefined {
  const [, fileId] =
    url.match(/https:\/\/drive.google.com\/file\/d\/([^&]+)\/view/) ||
    url.match(/https:\/\/drive.google.com\/drive\/folders\/([^?]+)/) ||
    [];
  url.match(/id=([^&]+)&?/) || url.match(/folders\/([^?]+)/) || [];
  return fileId;
}

async function fetchGoogleDriveFile(fileId: string): Promise<ArrayBuffer> {
  const res = await driveApi.files.get(
    {
      fileId: fileId,
      alt: "media",
    },
    { responseType: "arraybuffer" }
  );
  return res.data as ArrayBuffer;
}

async function fetchAndZipGoogleDriveFolder(fileId: string): Promise<Buffer> {
  console.log(`Loading song archive from gdrive folder: - "${fileId}".`);
  const query = `\'${fileId}\' in parents`;
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

  const files: [string, ArrayBuffer][] = await Promise.all(
    folderContent.files.map(async (file) => {
      const arrayBuffer = await fetchGoogleDriveFile(file.id!);
      return [file.name!, arrayBuffer];
    })
  );

  console.log(`Zipping gdrive folder contents - "${fileId}".`);

  const zip = new JSZip();
  const folder = zip.folder(fileId)!;
  for (const [name, dat] of files) {
    folder.file(name, dat);
  }
  return zip.generateAsync({ type: "nodebuffer" });
}

export async function setSongIsProcessing(
  id: number,
  state: boolean
): Promise<boolean> {
  const song = (await songMetadataKv.get(id.toString())) as ChorusAPISong;
  song.isProcessing = state;
  return songMetadataKv.set(song.id.toString(), song);
}

export async function saveSongArchiveToDisk(
  id: number,
  link: string
): Promise<void> {
  const fileId = getGoogleDriveFileId(link);
  if (fileId) {
    const { data: meta } = await driveApi.files.get({
      fileId,
    });
    let zipBuf: Buffer;
    let ext: string = "zip";
    if (meta.mimeType === "application/vnd.google-apps.folder") {
      zipBuf = await fetchAndZipGoogleDriveFolder(fileId);
    } else {
      console.log(`Saving archive from gdrive file - "${fileId}"`);
      const arrayBuffer = await fetchGoogleDriveFile(fileId);
      zipBuf = Buffer.from(arrayBuffer);
      ext = getFileExt(meta.name!);
    }
    const filename = `${id}.${ext}`;
    console.log(`Saving archive from gdrive - "${fileId}" @ ${filename}`);
    return fsPromises.writeFile(path.resolve(basePath, filename), zipBuf);
  } else {
    throw `Archive source not implemented - "${link}"`;
  }
}
