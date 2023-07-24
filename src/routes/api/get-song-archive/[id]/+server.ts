import type { ChorusAPISong } from "$lib/chorus";
import {
  getSongArchiveStream,
  saveSongArchiveToDisk,
  songMetadataKv,
} from "$lib/storage";
import { getMimeType } from "$lib/util.js";
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
          "Content-Type": getMimeType(ext)!,
        },
        status: 200,
      });
    } else {
      saveSongArchiveToDisk(id);
      return json("Archive is being processed.", { status: 202 });
    }
  } catch (e: any) {
    throw error(500, e.message);
  }
}
