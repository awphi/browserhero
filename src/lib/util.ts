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
