/** 将图片文件读取并压缩为 dataURL，控制体积以适配 localStorage 配额 */
export async function fileToCompressedDataUrl(file: File, maxWidth = 1920, quality = 0.85): Promise<string> {
  const raw = await readAsDataUrl(file);
  return downscaleDataUrl(raw, maxWidth, quality);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

async function downscaleDataUrl(dataUrl: string, maxWidth: number, quality: number): Promise<string> {
  const image = await loadImage(dataUrl);
  const scale = Math.min(1, maxWidth / image.naturalWidth);
  // 体积可控且无需缩放时直接使用原图
  if (scale >= 1 && dataUrl.length < 2 * 1024 * 1024) return dataUrl;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) return dataUrl;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片解码失败，可能是不支持的格式'));
    image.src = src;
  });
}
