// Camera stream & offscreen pixel sampling manager for MakeMeCubeMaster

export class CameraManager {
  constructor(videoElement) {
    this.video = videoElement;
    this.stream = null;
    this.facingMode = 'user'; // Defaults to front camera per prompt, easily togglable
    this.hasTorch = false;
    this.torchOn = false;
    this.isReady = false;

    // Off-screen canvas for pixel sampling
    this.offscreenCanvas = document.createElement('canvas');
    this.ctx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
  }

  async startCamera(preferredFacing = 'user') {
    this.facingMode = preferredFacing;
    this.stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('Camera API (getUserMedia) not supported in this browser.');
      this.isReady = false;
      return { success: false, error: 'Camera API not supported in this browser.' };
    }

    let stream = null;

    // Try with preferred constraints first
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: this.facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
    } catch (e1) {
      console.warn('Failed with ideal constraints, retrying with simple { video: true }...', e1);
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (e2) {
        console.warn('getUserMedia failed completely:', e2);
        this.isReady = false;
        return {
          success: false,
          error: e2.name === 'NotAllowedError'
            ? 'Camera permission denied. Please allow camera access in browser settings.'
            : e2.message || 'Could not connect to camera.'
        };
      }
    }

    try {
      this.stream = stream;
      this.video.srcObject = stream;

      // Safe wait with 2000ms timeout so it never hangs
      await Promise.race([
        new Promise((resolve) => {
          if (this.video.readyState >= 2) {
            resolve();
          } else {
            this.video.onloadedmetadata = () => {
              this.video.play().then(resolve).catch(resolve);
            };
          }
        }),
        new Promise((resolve) => setTimeout(resolve, 2000))
      ]);

      try {
        await this.video.play();
      } catch (e) {
        // Autoplay may need user gesture on some browsers
        console.warn('video.play() notice:', e);
      }

      this.isReady = true;

      // Check if torch/flashlight is supported
      try {
        const track = this.stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        this.hasTorch = Boolean(capabilities.torch);
      } catch (e) {
        this.hasTorch = false;
      }

      return { success: true };
    } catch (err) {
      console.warn('[Camera] Failed to setup camera stream:', err);
      this.isReady = false;
      return { success: false, error: err.message || 'Error playing camera stream.' };
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.isReady = false;
  }

  async flipCamera() {
    const nextMode = this.facingMode === 'user' ? 'environment' : 'user';
    return await this.startCamera(nextMode);
  }

  async toggleTorch() {
    if (!this.stream || !this.hasTorch) return false;
    const track = this.stream.getVideoTracks()[0];
    try {
      this.torchOn = !this.torchOn;
      await track.applyConstraints({
        advanced: [{ torch: this.torchOn }]
      });
      return this.torchOn;
    } catch (e) {
      console.warn('Torch constraint error:', e);
      return false;
    }
  }

  // Sample 9 probe points given in client viewport coordinates (e.g. from the viewfinder DOM rects)
  samplePoints(probeElements) {
    if (!this.isReady || !this.video.videoWidth || !this.video.videoHeight) {
      return null;
    }

    const vw = this.video.videoWidth;
    const vh = this.video.videoHeight;

    if (this.offscreenCanvas.width !== vw || this.offscreenCanvas.height !== vh) {
      this.offscreenCanvas.width = vw;
      this.offscreenCanvas.height = vh;
    }

    // Draw current video frame to offscreen canvas
    this.ctx.drawImage(this.video, 0, 0, vw, vh);

    const videoRect = this.video.getBoundingClientRect();
    if (videoRect.width === 0 || videoRect.height === 0) return null;

    // Because object-fit: cover is used on the video, compute exact crop scale
    const videoAspect = vw / vh;
    const screenAspect = videoRect.width / videoRect.height;
    let renderW, renderH, offsetX, offsetY;

    if (screenAspect > videoAspect) {
      renderW = videoRect.width;
      renderH = videoRect.width / videoAspect;
      offsetX = 0;
      offsetY = (videoRect.height - renderH) / 2;
    } else {
      renderH = videoRect.height;
      renderW = videoRect.height * videoAspect;
      offsetY = 0;
      offsetX = (videoRect.width - renderW) / 2;
    }

    const sampledColors = [];

    for (const el of probeElements) {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Map client coords to offscreen canvas pixels
      const normX = (centerX - videoRect.left - offsetX) / renderW;
      const normY = (centerY - videoRect.top - offsetY) / renderH;

      const px = Math.floor(normX * vw);
      const py = Math.floor(normY * vh);

      if (px < 0 || px >= vw || py < 0 || py >= vh) {
        sampledColors.push([128, 128, 128]);
        continue;
      }

      // Sample a 9x9 kernel around the center to smooth out noise
      const radius = 4;
      const startX = Math.max(0, px - radius);
      const startY = Math.max(0, py - radius);
      const endX = Math.min(vw - 1, px + radius);
      const endY = Math.min(vh - 1, py + radius);
      const sampleW = endX - startX + 1;
      const sampleH = endY - startY + 1;

      try {
        const imgData = this.ctx.getImageData(startX, startY, sampleW, sampleH).data;
        let sumR = 0, sumG = 0, sumB = 0, count = 0;

        for (let i = 0; i < imgData.length; i += 4) {
          sumR += imgData[i];
          sumG += imgData[i + 1];
          sumB += imgData[i + 2];
          count++;
        }

        if (count > 0) {
          sampledColors.push([
            Math.round(sumR / count),
            Math.round(sumG / count),
            Math.round(sumB / count)
          ]);
        } else {
          sampledColors.push([128, 128, 128]);
        }
      } catch (e) {
        sampledColors.push([128, 128, 128]);
      }
    }

    return sampledColors;
  }
}
