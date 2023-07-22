import { json } from "@sveltejs/kit";

// /api/get-song
export async function GET(event) {
  // TODO lookup song id from [slug] in the KV store and start the downloading process to wasabi if it's not been done or started
  const options: ResponseInit = {
    status: 418,
    headers: {
      X: "Gon give it to ya",
    },
  };

  return json("cool response!", options);
}
