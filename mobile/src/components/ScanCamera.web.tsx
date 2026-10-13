import { createElement, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { GUIDE } from '../lib/scan/guide';
import type { ScanCameraHandle } from './ScanCamera';

export type { ScanCameraHandle } from './ScanCamera';

/** Largeur de l'image envoyée à l'OCR : les numéros de carte font quelques pixels sans agrandissement. */
const OCR_WIDTH = 1400;

/**
 * Caméra du navigateur. On ouvre le flux nous-mêmes pour demander une haute résolution
 * (sinon Safari donne souvent du 640×480, illisible pour un numéro de carte), puis on
 * ne garde que le bas de la carte, agrandi et en niveaux de gris.
 */
export const ScanCamera = forwardRef<ScanCameraHandle, { active: boolean }>(function ScanCamera({ active }, ref) {
  const video = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        const v = video.current;
        if (v) {
          v.srcObject = s;
          v.play().catch(() => {});
        }
      })
      .catch((e) => console.warn('Caméra indisponible', e));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active]);

  useImperativeHandle(ref, () => ({
    async capture() {
      const v = video.current;
      if (!v || !v.videoWidth) return null;
      // Le flux est affiché en « cover » : on convertit le cadre de visée (en px écran) en px vidéo.
      const W = v.clientWidth;
      const H = v.clientHeight;
      const scale = Math.max(W / v.videoWidth, H / v.videoHeight);
      const offX = (v.videoWidth * scale - W) / 2;
      const offY = (v.videoHeight * scale - H) / 2;
      const cardW = W * GUIDE.width;
      const cardH = cardW / GUIDE.aspect;
      const cardX = (W - cardW) / 2;
      const cardY = H * GUIDE.top;
      // Bande du bas, avec une marge pour une carte un peu décalée.
      const margin = cardW * 0.06;
      const sx = (cardX - margin + offX) / scale;
      const sy = (cardY + cardH * GUIDE.codeBandFrom + offY) / scale;
      const sw = (cardW + 2 * margin) / scale;
      const sh = (cardH * (1.04 - GUIDE.codeBandFrom)) / scale;

      const canvas = document.createElement('canvas');
      canvas.width = OCR_WIDTH;
      canvas.height = Math.round((OCR_WIDTH * sh) / sw);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(v, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      // Niveaux de gris + étirement du contraste : nettement plus lisible pour Tesseract.
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = img.data;
      let min = 255;
      let max = 0;
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        d[i] = g;
        if (g < min) min = g;
        if (g > max) max = g;
      }
      const k = 255 / Math.max(1, max - min);
      for (let i = 0; i < d.length; i += 4) {
        const g = (d[i] - min) * k;
        d[i] = d[i + 1] = d[i + 2] = g;
      }
      ctx.putImageData(img, 0, 0);
      return canvas.toDataURL('image/png');
    },
  }));

  return createElement('video', {
    ref: video,
    playsInline: true,
    muted: true,
    autoPlay: true,
    style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', background: '#000' },
  });
});
