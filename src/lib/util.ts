import { invert } from "lodash";

const mimeTypeToExtensions: Record<string, string> = {
  "application/rar": "rar",
  "application/x-rar-compressed": "rar",
  "application/vnd.rar": "rar",
  "application/x-zip-compressed": "zip",
  "application/x-7z-compressed": "7z",
};
const extensionsToMimeTypes = invert(mimeTypeToExtensions);

export function getExtension(mime: string): string | undefined {
  return mimeTypeToExtensions[mime];
}

export function getMimeType(ext: string): string | undefined {
  return extensionsToMimeTypes[ext];
}

export function formatTimespan(secs: number) {
  let dat = new Date(1000 * secs).toISOString().substring(11, 19);

  // strip off leading zeroes (or colons) up to the first three zeroes
  let i: number;
  for (i = 0; i < 4; i++) {
    if (!(dat[i] === "0" || dat[i] === ":")) {
      break;
    }
  }

  return dat.slice(i);
}
