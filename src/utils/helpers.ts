import { Photo } from '../types';
import { generateId } from '../data/propertyTemplates';
import { client } from '../api/client';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

/**
 * Upload a photo to cloud storage via presigned URL.
 * Returns the cloud path on success, null on failure.
 */
export async function uploadPhotoToCloud(
  inspectionId: string,
  photoId: string,
  dataUrl: string,
  contentType: string = 'image/jpeg'
): Promise<string | null> {
  try {
    // Get presigned upload URL from backend
    const res = await client.api.fetch('/api/upload/photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inspectionId, photoId, contentType }),
    });

    if (!res.ok) {
      console.warn('[PhotoUpload] Failed to get presigned URL:', res.status);
      return null;
    }

    const { uploadUrl, path } = await res.json();

    // Convert base64 data URL to blob
    const blob = dataUrlToBlob(dataUrl);
    if (!blob) {
      console.warn('[PhotoUpload] Failed to convert data URL to blob');
      return null;
    }

    // Upload to presigned URL
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': contentType },
    });

    if (!uploadRes.ok) {
      console.warn('[PhotoUpload] Failed to upload:', uploadRes.status);
      return null;
    }

    console.log('[PhotoUpload] Uploaded successfully:', path);
    return path;
  } catch (err) {
    console.warn('[PhotoUpload] Upload failed:', err);
    return null;
  }
}

/**
 * Get a presigned download URL for a photo from cloud storage.
 */
export async function getPhotoDownloadUrl(cloudPath: string): Promise<string | null> {
  try {
    const res = await client.api.fetch(`/api/download/photo?path=${encodeURIComponent(cloudPath)}`);
    if (!res.ok) return null;
    const { downloadUrl } = await res.json();
    return downloadUrl;
  } catch {
    return null;
  }
}

/**
 * Get a presigned download URL for a PDF report from cloud storage.
 */
export async function getPdfDownloadUrl(inspectionId: string): Promise<string | null> {
  try {
    const res = await client.api.fetch(`/api/download/pdf/${inspectionId}`);
    if (!res.ok) return null;
    const { downloadUrl } = await res.json();
    return downloadUrl;
  } catch {
    return null;
  }
}

/**
 * Convert a base64 data URL to a Blob.
 */
function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const parts = dataUrl.split(',');
    if (parts.length !== 2) return null;
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const binary = atob(parts[1]);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
  } catch {
    return null;
  }
}

export async function capturePhoto(): Promise<Photo | null> {
  // On native platforms (Android/iOS), use the Capacitor Camera + Geolocation plugins
  if (Capacitor.isNativePlatform()) {
    try {
      // IMPORTANT (iOS fix): iOS does NOT auto-prompt for camera permission on the
      // first getPhoto() call the way Android does. If permission was never
      // requested, the camera silently fails to open. So we explicitly check and
      // request camera permission first.
      try {
        const perm = await Camera.checkPermissions();
        if (perm.camera !== 'granted') {
          const requested = await Camera.requestPermissions({ permissions: ['camera'] });
          if (requested.camera === 'denied') {
            console.warn('[Camera] Camera permission denied by user');
            return null;
          }
        }
      } catch (permErr) {
        console.warn('[Camera] checkPermissions unavailable, continuing:', permErr);
      }

      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        // CAMERA ONLY: force the live camera. Do NOT use CameraSource.Prompt or
        // CameraSource.Photos — the inspection workflow requires freshly-captured,
        // timestamped/geotagged photos, so selecting from the gallery is disallowed.
        source: CameraSource.Camera,
        width: 1200,
        height: 1200,
        correctOrientation: true,
        saveToGallery: false,
      });

      if (!image || !image.dataUrl) return null;

      // Get GPS location via native plugin
      let lat: number | undefined;
      let lng: number | undefined;
      try {
        const permission = await Geolocation.checkPermissions();
        if (permission.location !== 'granted') {
          await Geolocation.requestPermissions();
        }
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 5000,
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        // Geolocation not available — proceed without GPS
      }

      // Compress the image
      const compressed = await compressDataUrl(image.dataUrl, 1200, 0.8);

      return {
        id: generateId(),
        url: compressed,
        timestamp: new Date().toISOString(),
        gpsLat: lat,
        gpsLng: lng,
      };
    } catch (err: any) {
      // Surface real errors so native camera failures are diagnosable instead of
      // silently returning null. A user cancelling the camera also lands here.
      const msg = String(err?.message || err || '');
      if (!/cancel/i.test(msg)) {
        console.warn('[Camera] getPhoto failed:', msg);
      }
      return null;
    }
  }

  // Web fallback: use HTML file input.
  // IMPORTANT: iOS Safari (and some in-app WebViews) can silently fail to open
  // the camera/photo picker when calling .click() on a file input that was
  // never attached to the DOM. Attaching it (hidden, off-screen) and cleaning
  // it up afterwards makes this reliable across iPhone browsers/PWA contexts.
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.style.position = 'fixed';
    input.style.top = '-9999px';
    input.style.left = '-9999px';
    input.style.opacity = '0';

    const cleanup = () => {
      if (input.parentNode) {
        input.parentNode.removeChild(input);
      }
    };

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        cleanup();
        resolve(null);
        return;
      }

      try {
        const compressed = await compressImage(file, 1200, 0.8);
        const dataUrl = await blobToDataUrl(compressed);

        let lat: number | undefined;
        let lng: number | undefined;

        if ('geolocation' in navigator) {
          try {
            const pos = await new Promise<GeolocationPosition>((res, rej) => {
              navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000, enableHighAccuracy: true });
            });
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
          } catch {
            // Geolocation not available
          }
        }

        cleanup();
        resolve({
          id: generateId(),
          url: dataUrl,
          timestamp: new Date().toISOString(),
          gpsLat: lat,
          gpsLng: lng,
        });
      } catch {
        cleanup();
        resolve(null);
      }
    };

    input.oncancel = () => {
      cleanup();
      resolve(null);
    };

    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Safely navigate "back" using browser/router history when available,
 * falling back to a known-good route otherwise.
 *
 * Why this is needed: some contexts (a freshly-launched native app/WKWebView,
 * a PWA opened via a deep link, or a page reload) have no previous history
 * entry. Calling `navigate(-1)` in those cases is a silent no-op, which makes
 * the in-app "back" button appear broken/missing — especially noticeable on
 * iPhone where there is no OS-level back gesture/button to fall back on.
 */
export function safeGoBack(navigate: (path: string, options?: { replace?: boolean }) => void, fallback: string = '/'): void {
  if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
    navigate(-1 as unknown as string);
  } else {
    navigate(fallback, { replace: true });
  }
}

function compressImage(file: File, maxWidth: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to compress'));
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Compress a data URL image to reduce size for storage/upload.
 */
function compressDataUrl(dataUrl: string, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function getLocation(): Promise<{ latitude: number; longitude: number; address?: string } | null> {
  // Use native Geolocation plugin on Android/iOS
  if (Capacitor.isNativePlatform()) {
    try {
      const permission = await Geolocation.checkPermissions();
      if (permission.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted') return null;
      }
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 5000,
      });
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
    } catch {
      return null;
    }
  }

  // Web fallback
  if (!('geolocation' in navigator)) return null;

  try {
    const pos = await new Promise<GeolocationPosition>((res, rej) => {
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000, enableHighAccuracy: true });
    });

    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
  } catch {
    return null;
  }
}

export async function getIPAddress(): Promise<string | undefined> {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    if (res.ok) {
      const data = await res.json();
      return data.ip;
    }
  } catch {
    // Fallback: try alternate API
    try {
      const res = await fetch('https://api.ip.sb/jsonip');
      if (res.ok) {
        const data = await res.json();
        return data.ip;
      }
    } catch {
      // Give up
    }
  }
  return undefined;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generate a SHA-256 hash of report data for tamper detection.
 * Returns a truncated hex string suitable for display.
 */
export async function generateReportHash(inspection: {
  id: string;
  createdAt: string;
  completedAt?: string;
  meta: {
    ipAddress?: string;
    location?: { latitude: number; longitude: number };
    inspectorName: string;
  };
  rooms: { items: { condition: string | null }[] }[];
  signatures: { signedAt: string; role: string }[];
}): Promise<string> {
  // Build a canonical string from key report fields
  const payload = [
    inspection.id,
    inspection.createdAt,
    inspection.completedAt || '',
    inspection.meta.inspectorName,
    inspection.meta.ipAddress || '',
    inspection.meta.location
      ? `${inspection.meta.location.latitude},${inspection.meta.location.longitude}`
      : '',
    inspection.rooms
      .flatMap((r) => r.items.map((i) => `${i.condition}`))
      .join('|'),
    inspection.signatures
      .map((s) => `${s.role}:${s.signedAt}`)
      .join('|'),
  ].join('::');

  // Encode and hash
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  // Return first 64 characters (full SHA-256 hex)
  return hashHex;
}
