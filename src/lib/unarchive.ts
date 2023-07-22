import SevenZip from "7z-wasm";
import sevenZipWasmUrl from "7z-wasm/7zz.wasm?url";

const mimeTypeToFileExt = {
  "application/x-zip-compressed": ".zip",
  "application/rar": ".rar",
  "application/zip": ".zip",
  "application/x-7z-compressed": ".7z",
} as const;

type ArchiveMimeType = keyof typeof mimeTypeToFileExt;
type ArchiveFileExtension = (typeof mimeTypeToFileExt)[ArchiveMimeType];

function getFileExtensionFromMimeType(mimeType: string): ArchiveFileExtension {
  if (!(mimeType in mimeTypeToFileExt)) {
    throw new Error(`Cannot unarchive type "${mimeType}".`);
  }

  return mimeTypeToFileExt[mimeType as ArchiveMimeType];
}

export async function unarchive(
  mimeType: string,
  archiveData: ArrayBuffer
): Promise<Record<string, Uint8Array>> {
  const sevenZip = await SevenZip({
    locateFile: () => sevenZipWasmUrl,
    // suppress the console in production
    stdout: import.meta.env.PROD ? () => {} : undefined,
  });
  const archiveName = `archive${getFileExtensionFromMimeType(mimeType)}`;
  const arr = new Uint8Array(archiveData);

  // write an archive to the virtual file system
  const stream = sevenZip.FS.open(archiveName, "w+");
  sevenZip.FS.write(stream, arr, 0, arr.length);
  sevenZip.FS.close(stream);

  // tell 7zip to extract it
  sevenZip.callMain(["x", archiveName, "-oarchive-out"]);

  // read the files we extracted back out
  const extractedFolder = sevenZip.FS.readdir("archive-out").find(
    (a) => a !== "." && a !== ".."
  );

  const files: Record<string, Uint8Array> = {};

  sevenZip.FS.readdir(`archive-out/${extractedFolder}`).forEach((v) => {
    if (v !== "." && v !== "..") {
      files[v] = sevenZip.FS.readFile(`archive-out/${extractedFolder}/${v}`);
    }
  });

  return files;
}
