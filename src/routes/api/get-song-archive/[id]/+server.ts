import type { ChorusAPISong } from "$lib/chorus";
import {
  getSongArchiveUrl,
  saveSongArchive,
  setSongIsProcessing,
} from "$lib/server-utils";
import { error, json, type RequestEvent } from "@sveltejs/kit";
import { kv } from "@vercel/kv";

// GET /api/get-song-archive/[id]
export async function GET(event: RequestEvent) {
  const { id } = event.params;
  const song = await kv.get<ChorusAPISong>(id!);

  if (!song) {
    throw error(400, `Could not find song with specified ID.`);
  }

  if (song.isProcessing) {
    return json("Archive is being processed.", { status: 202 });
  }

  const url = getSongArchiveUrl(song.id);
  if (url) {
    return json(url, { status: 200 });
  }

  let newSongUrl: string | null = null;
  let newSongError: any = null;
  try {
    await setSongIsProcessing(song.id, true);
    newSongUrl = await saveSongArchive(song);
  } catch (e: any) {
    newSongError = e;
  } finally {
    await setSongIsProcessing(song.id, false);
  }

  if (newSongUrl && !error) {
    return json(newSongUrl, { status: 200 });
  } else {
    throw error(500, newSongError);
  }
}
