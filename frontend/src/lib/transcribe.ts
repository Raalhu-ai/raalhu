let whisperPipeline: any = null;

const MODEL_URL = '/models/whisper-dv';

const log = (msg: string, ...args: any[]) => console.log(`[STT] ${msg}`, ...args);
const warn = (msg: string, ...args: any[]) => console.warn(`[STT] ${msg}`, ...args);
const err = (msg: string, ...args: any[]) => console.error(`[STT] ${msg}`, ...args);

async function getDevice(): Promise<'webgpu' | 'wasm'> {
	log('Checking WebGPU availability...');
	try {
		const gpu = navigator.gpu;
		if (!gpu) {
			log('navigator.gpu not available');
			return 'wasm';
		}
		const adapter = await gpu.requestAdapter();
		if (adapter) {
			log('WebGPU adapter found:', adapter.info ?? adapter);
			return 'webgpu';
		}
		log('requestAdapter() returned null — no GPU adapter');
	} catch (e) {
		warn('WebGPU probe failed:', e);
	}
	log('Falling back to WASM backend');
	return 'wasm';
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
	const t0 = performance.now();
	log(`=== Transcription started (blob: ${audioBlob.type}, ${audioBlob.size} bytes) ===`);

	log('Importing @huggingface/transformers...');
	const tImport = performance.now();
	const { pipeline, env } = await import('@huggingface/transformers');
	env.allowLocalModels = true;
	env.useBrowserCache = true;
	env.allowRemoteModels = false;
	log(`Import done (${(performance.now() - tImport).toFixed(0)}ms)`);

	if (!whisperPipeline) {
		const device = await getDevice();
		log(`Loading Whisper pipeline (device: ${device}, model: ${MODEL_URL})...`);
		const tLoad = performance.now();
		whisperPipeline = await pipeline(
			'automatic-speech-recognition',
			MODEL_URL,
			{
				dtype: {
					encoder_model: 'q8',
					decoder_model_merged: 'q8',
				},
				device,
			}
		);
		// Patch tokenizer to bypass hardcoded language validation in transformers.js
		// Token 50322 = Sinhala (closest to Dhivehi), 50359 = transcribe task
		whisperPipeline.tokenizer._retrieve_init_tokens = () => [50322, 50359];
		log('Patched tokenizer for Dhivehi (bypassing language validation)');
		log(`Pipeline loaded (${(performance.now() - tLoad).toFixed(0)}ms)`);
	} else {
		log('Using cached pipeline');
	}

	log('Decoding audio to PCM float32 (16kHz)...');
	const tDecode = performance.now();
	const arrayBuffer = await audioBlob.arrayBuffer();
	const audioContext = new AudioContext({ sampleRate: 16000 });
	const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
	const float32Array = audioBuffer.getChannelData(0);
	const durationSec = float32Array.length / 16000;
	log(`Audio decoded: ${durationSec.toFixed(1)}s duration, ${float32Array.length} samples (${(performance.now() - tDecode).toFixed(0)}ms)`);

	log('Running Whisper inference (Dhivehi)...');
	const tInfer = performance.now();
	const result = await whisperPipeline(float32Array, {
		task: 'transcribe',
	});
	log(`Inference done (${(performance.now() - tInfer).toFixed(0)}ms)`);

	audioContext.close();

	const text = (result as any)?.text?.trim() || '';
	log(`Result: "${text}"`);
	log(`=== Transcription complete (total ${(performance.now() - t0).toFixed(0)}ms) ===`);
	return text;
}
