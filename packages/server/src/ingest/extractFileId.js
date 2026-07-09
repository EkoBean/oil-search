export function extractFileId(downloadUrl) {
  const id = new URL(downloadUrl).searchParams.get("id");
  if (!id) {
    throw new Error(`下載連結裡沒有 id 參數，無法判斷版本: ${downloadUrl}`);
  }
  return id;
}
