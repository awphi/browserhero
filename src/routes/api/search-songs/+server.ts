import { ensureSongs } from "$lib/chorus";
import { json } from "@sveltejs/kit";
import isFinite from "lodash/isFinite";

// /api/searchs-songs
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

  // TODO add validatedSongs to the KV store
  /*   for (const validatedSong of validatedSongs) {
    const songRef = chorusRef.child(validatedSong.id.toString());
    songRef.get().then((v) => {
      if (!v.exists()) {
        songRef.set(validatedSong);
      }
    });
  } */

  return json({ songs: validatedSongs, originalLength: songs.length });
}
