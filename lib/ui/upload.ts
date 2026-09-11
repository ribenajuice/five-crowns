"use client";

/**
 * POST a JPEG to a presigned S3 POST, with progress, for `UploadProgress`'s
 * determinate bar.
 *
 * ⚠️ Security review: uploads are presigned **POST**, not PUT — S3 caps a
 * presigned POST's body size (photos under 8 MB) and can be told to require
 * the field values it hands back, neither of which a presigned PUT can do.
 * `fields` (from `POST /api/uploads`) go into the `FormData` first, in the
 * order S3 gave them, and the file goes in **last** as `file`. No
 * `Content-Type` header is set by hand — the browser adds the multipart
 * boundary itself. S3 replies `204` on success.
 */
export function postFormUpload(
  url: string,
  fields: Record<string, string>,
  blob: Blob,
  onProgress: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      formData.append(key, value);
    }
    formData.append("file", blob);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(1);
        resolve();
      } else {
        reject(new Error(`Upload failed (${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed."));
    xhr.send(formData);
  });
}
