import type { ChorusAPISong } from "$lib/chorus";
import {
  getSongArchiveStream,
  saveSongArchiveToDisk,
  setSongIsProcessing,
  songMetadataKv,
} from "$lib/storage";
import { getMimeFromExt } from "$lib/util.js";
import { error, json } from "@sveltejs/kit";

// GET /api/get-song-archive/[id]
export async function GET(event) {
  const { id } = event.params;
  const song: ChorusAPISong | undefined = await songMetadataKv.get(id);

  if (!song) {
    throw error(400, `Could not find song with specified ID.`);
  }

  if (song.isProcessing) {
    return json("Archive is being processed.", { status: 202 });
  }

  try {
    const maybeStream = getSongArchiveStream(id);
    if (maybeStream) {
      const { stream, ext } = maybeStream;
      return new Response(stream, {
        headers: {
          "Content-Type": getMimeFromExt(ext)!,
        },
        status: 200,
      });
    }
  } catch (e: any) {
    throw error(500, e.message);
  }

  try {
    await setSongIsProcessing(song.id, true);
    await saveSongArchiveToDisk(song.id, song.link);
  } catch (e: any) {
    throw error(500, e.message);
  } finally {
    await setSongIsProcessing(song.id, false);
  }

  return json("Archive is being processed.", { status: 202 });
}
