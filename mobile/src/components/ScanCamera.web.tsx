import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { GUIDE } from '../lib/scan/guide';
import type { Capture, CameraAccess, ScanCameraHandle } from './ScanCamera';

export type { Capture, CameraAccess, ScanCameraHandle } from './ScanCamera';

/**
 * Flux caméra unique pour toute la session : rouvrir le scanner réutilise le même flux,
 * donc le navigateur ne redemande pas l'autorisation. Il est coupé après 3 minutes sans scan.
 */
let stream: MediaStream | null = null;
let pending: Promise<MediaStream> | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
const IDLE_STOP_MS = 3 * 60 * 1000;

const alive = (s: MediaStream | null) => !!s && s.getVideoTracks().some((t) => t.readyState === 'live');

function getStream(): Promise<MediaStream> {
  if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
  if (alive(stream)) {
    stream!.getVideoTracks().forEach((t) => { t.enabled = true; });
    return Promise.resolve(stream!);
  }
  pending ??= navigator.mediaDevices
    .getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } })
    .then((s) => { stream = s; return s; })
    .finally(() => { pending = null; });
  return pending;
}

function releaseLater() {
  if (stopTimer) clearTimeout(stopTimer);
  stream?.getVideoTracks().forEach((t) => { t.enabled = false; });
  stopTimer = setTimeout(() => {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
  }, IDLE_STOP_MS);
}

/** État d'accès à la caméra, sans seconde demande d'autorisation (contrairement au hook d'expo-camera sur le web). */
export function useCameraAccess(): CameraAccess {
  const [state, setState] = useState<CameraAccess['state']>(alive(stream) ? 'granted' : 'unknown');
  const request = () => {
    getStream().then(() => setState('granted'), () => setState('denied'));
  };
  useEffect(() => {
    if (state === 'unknown') request();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { state, request };
}

/** Carte entière dans un carré 224×224 sur fond gris, exactement comme les images de l'index visuel. */
const S = 224;

export const ScanCamera = forwardRef<ScanCameraHandle, { active: boolean }>(function ScanCamera({ active }, ref) {
  const video = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    getStream().then((s) => {
      const v = video.current;
      if (cancelled || !v) return;
      v.srcObject = s;
      v.play().catch(() => {});
    }, () => {});
    return () => {
      cancelled = true;
      releaseLater();
    };
  }, [active]);

  useImperativeHandle(ref, () => ({
    async capture(): Promise<Capture | null> {
      const v = video.current;
      if (!v || !v.videoWidth) return null;
      // Le flux est affiché en « cover » : on convertit le cadre de visée (px écran) en px vidéo.
      const W = v.clientWidth;
      const H = v.clientHeight;
      const scale = Math.max(W / v.videoWidth, H / v.videoHeight);
      const offX = (v.videoWidth * scale - W) / 2;
      const offY = (v.videoHeight * scale - H) / 2;
      const cardW = W * GUIDE.width;
      const cardH = cardW / GUIDE.aspect;
      const cx = ((W - cardW) / 2 + offX) / scale;
      const cy = (H * GUIDE.top + offY) / scale;
      const cw = cardW / scale;
      const ch = cardH / scale;

      const sq = document.createElement('canvas');
      sq.width = sq.height = S;
      const g = sq.getContext('2d');
      if (!g) return null;
      g.fillStyle = '#808080';
      g.fillRect(0, 0, S, S);
      const k = Math.min(S / cw, S / ch);
      g.drawImage(v, cx, cy, cw, ch, (S - cw * k) / 2, (S - ch * k) / 2, cw * k, ch * k);
      const card = sq.toDataURL('image/jpeg', 0.92);
      return { ocr: card, card };
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
