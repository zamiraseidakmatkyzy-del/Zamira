/**
 * Utility to compress images using Canvas API before sending them to the backend or storing in localStorage.
 * This is crucial to prevent QuotaExceededError in localStorage, which has a strict 5MB limit.
 */
export function compressImage(fileOrDataUrl: File | string, maxDimension = 1024, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions to fit maxDimension while keeping aspect ratio
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // Fallback to original
        resolve(typeof fileOrDataUrl === "string" ? fileOrDataUrl : "");
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(compressedDataUrl);
    };

    img.onerror = (err) => {
      reject(err);
    };

    if (typeof fileOrDataUrl === "string") {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}
