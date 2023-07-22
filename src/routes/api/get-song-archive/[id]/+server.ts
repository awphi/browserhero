import type { ChorusAPISong } from "$lib/chorus";
import { getSongArchiveStream, songMetadataKv } from "$lib/storage";
import { error, json } from "@sveltejs/kit";
import isEmpty from "lodash/isEmpty";
import mime from "mime-types";

// GET /api/get-song-archive/[id]
export async function GET(event) {
  const { id } = event.params;
  const song: ChorusAPISong | undefined = await songMetadataKv.get(id);

  if (!song) {
    throw error(400, `Could not find song with ID "${event.params.id}".`);
  }

  if (song.isProcessing) {
    return json("Currently processing the file...", { status: 202 });
  }

  if (isEmpty(song.storedObjectUrls)) {
    song.isProcessing = true;
    // TODO download the song archive via the gdrive API, zip it up and store it
    // all this functionality can probably go in storage.ts
  }

  try {
    const { stream, ext } = getSongArchiveStream(id);
    return new Response(stream, {
      headers: {
        "Content-Type": mime.lookup(ext) as string,
      },
    });
  } catch (e: any) {
    const msg = `Failed to load ${id} - ${e.message.toLowerCase()}`;
    throw error(500, msg);
  }
}
