import type { ChorusAPISong } from "$lib/chorus";
import {
  getSongArchiveUrl,
  kv,
  saveSongArchive,
  setSongIsProcessing,
} from "$lib/server-utils";
import { error, json, text, type RequestEvent } from "@sveltejs/kit";

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

  const url = await getSongArchiveUrl(song.id);
  if (url) {
    return text(url, { status: 200 });
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

  if (newSongUrl && !newSongError) {
    return text(newSongUrl, { status: 200 });
  } else {
    throw error(500, newSongError);
  }
}
