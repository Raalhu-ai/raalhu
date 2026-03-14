export type VoiceState = 'idle' | 'recording' | 'transcribing';

export interface VoiceRecorder {
  start(): Promise<void>;
  stop(): Promise<Blob>;
  cancel(): void;
  destroy(): void;
  getFrequencyData(): Uint8Array | null;
}

function pickMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

export function createVoiceRecorder(): VoiceRecorder {
  let stream: MediaStream | null = null;
  let audioCtx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let recorder: MediaRecorder | null = null;
  let frequencyData: Uint8Array | null = null;

  async function start(): Promise<void> {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    audioCtx.createMediaStreamSource(stream).connect(analyser);
    frequencyData = new Uint8Array(analyser.frequencyBinCount);

    const mimeType = pickMimeType();
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorder.start();
  }

  function stop(): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
      if (!recorder || recorder.state === 'inactive') {
        reject(new Error('Not recording'));
        return;
      }

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const mimeType = recorder?.mimeType || 'audio/webm';
        resolve(new Blob(chunks, { type: mimeType }));
        cleanup();
      };
      recorder.stop();
    });
  }

  function cancel(): void {
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    cleanup();
  }

  function cleanup(): void {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }
    analyser = null;
    recorder = null;
    frequencyData = null;
  }

  function destroy(): void {
    cancel();
  }

  function getFrequencyData(): Uint8Array | null {
    if (!analyser || !frequencyData) return null;
    analyser.getByteFrequencyData(frequencyData);
    return frequencyData;
  }

  return { start, stop, cancel, destroy, getFrequencyData };
}
