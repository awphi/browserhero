import { ensureSongs } from "$lib/chorus";
import { songMetadataKv } from "$lib/storage";
import { json } from "@sveltejs/kit";
import isFinite from "lodash/isFinite";

// GET /api/searchs-songs?query=""&from=0
export async function GET(event) {
  const params = event.url.searchParams;
  const fromIn = Number.parseInt(params.get("from")!);
  const query = params.get("query") ?? "";
  const from = isFinite(fromIn) && fromIn > 0 ? fromIn : 0;

  let resource = "random";
  if (query.length > 0) {
    const params = new URLSearchParams({
      query,
      from: from.toString(),
    });
    resource = `search?${params}`;
  }

  const result = await fetch(`https://chorus.fightthe.pw/api/${resource}`);
  const text = await result.text();
  const songs = JSON.parse(text).songs;
  const validatedSongs = ensureSongs(songs);

  for (const song of validatedSongs) {
    songMetadataKv.set(song.id.toString(), song);
  }

  return json({ songs: validatedSongs, originalLength: songs.length });
}
