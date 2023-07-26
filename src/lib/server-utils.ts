import { createClient } from "@vercel/kv";
import type { ChorusAPISong } from "./chorus";
import { google } from "googleapis";
import JSZip from "jszip";
import { env } from "$env/dynamic/private";
import { getExtFromMime } from "./util";

if (!env.GOOGLE_CREDENTIALS) {
  throw new Error("Missing GOOGLE_CREDENTIALS!");
}

import { KV_REST_API_TOKEN, KV_REST_API_URL } from "$env/static/private";
import { Readable } from "stream";

export const kv = createClient({
  url: KV_REST_API_URL,
  token: KV_REST_API_TOKEN,
});

const googleAuth = new google.auth.GoogleAuth({
  scopes: [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/devstorage.read_write",
  ],
  credentials: JSON.parse(env.GOOGLE_CREDENTIALS),
});

const driveApi = google.drive({
  auth: googleAuth,
  version: "v3",
});

const storageApi = google.storage({
  auth: googleAuth,
  version: "v1",
});

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

async function fetchAndZipGoogleDriveFolder(
  fileId: string
): Promise<ArrayBuffer> {
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
  return zip.generateAsync({ type: "arraybuffer" });
}

export async function setSongIsProcessing(id: number, state: boolean) {
  const song = await kv.get<ChorusAPISong>(id.toString());
  song!.isProcessing = state;
  return kv.set(song!.id.toString(), song);
}

export async function getSongArchiveUrl(
  id: number
): Promise<string | undefined> {
  const song = await kv.get<ChorusAPISong>(id.toString());
  return song!.archiveUrl;
}

async function fetchSongArchive(
  link: string
): Promise<{ buffer: ArrayBuffer; mimeType: string }> {
  const fileId = getGoogleDriveFileId(link);
  if (fileId) {
    const { data: meta } = await driveApi.files.get({
      fileId,
    });
    let zipBuf: ArrayBuffer;
    let mime = meta.mimeType;
    if (!mime) {
      throw new Error(`Missing mime type on song ${fileId}`);
    } else if (meta.mimeType === "application/vnd.google-apps.folder") {
      zipBuf = await fetchAndZipGoogleDriveFolder(fileId);
      mime = "application/x-zip-compressed";
    } else {
      console.log(`Saving archive from gdrive file - "${fileId}"`);
      zipBuf = await fetchGoogleDriveFile(fileId);
    }
    return {
      buffer: zipBuf,
      mimeType: mime,
    };
  } else {
    throw `Archive source not implemented - "${link}"`;
  }
}

export async function saveSongArchive(song: ChorusAPISong): Promise<string> {
  const { buffer, mimeType } = await fetchSongArchive(song.link);

  const result = await storageApi.objects.insert({
    bucket: "browserhero-song-bucket",
    name: `${song.id}.${getExtFromMime(mimeType)}`,
    media: {
      mimeType,
      body: Readable.from(Buffer.from(buffer)),
    },
  });
  console.log(
    `Inserted new song into storage - ${song.id} @ ${result.data.id}`
  );
  if (result.data.mediaLink) {
    const songId = song.id.toString();
    const songFromKv = await kv.get<ChorusAPISong>(songId);
    songFromKv!.archiveUrl = result.data.mediaLink;
    await kv.set(songId, songFromKv!);
    return result.data.mediaLink;
  } else {
    throw `Missing media link on result from GCP - ${JSON.stringify(result)}`;
  }
}
