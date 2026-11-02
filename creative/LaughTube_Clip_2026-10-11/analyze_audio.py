from pathlib import Path
import json
import subprocess
import sys
import numpy as np

BASE = Path(__file__).resolve().parent
SONG = Path('/Users/leonbeltran/Downloads/On vient pour rire.mp3')
ANIM = Path('/Users/leonbeltran/Downloads/LT.mp4')

if sys.argv[-1] == 'download':
    from huggingface_hub import snapshot_download
    print(snapshot_download('Systran/faster-whisper-small', local_dir=str(BASE / 'work/whisper-small'), allow_patterns=['config.json', 'model.bin', 'tokenizer.json', 'vocabulary.txt', 'preprocessor_config.json']))
    raise SystemExit

def samples(path, rate=16000):
    return np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-vn', '-ac', '1', '-ar', str(rate), '-f', 'f32le', '-']), dtype=np.float32)

from faster_whisper import WhisperModel
model = WhisperModel(str(BASE / 'work/whisper-small'), device='cpu', compute_type='int8', cpu_threads=6)
segments, info = model.transcribe(samples(SONG), language='fr', beam_size=5, word_timestamps=True, vad_filter=False, initial_prompt='LaughTube. On vient pour rire. Des vidéos, des lives, des battles, des challenges. On rit, on crée, on partage.')
out = []
for s in segments:
    row = {'start': s.start, 'end': s.end, 'text': s.text, 'words': [{'start':w.start, 'end':w.end, 'word':w.word, 'probability':w.probability} for w in s.words]}
    print(json.dumps(row, ensure_ascii=False), flush=True)
    out.append(row)
(BASE / 'work/transcript.json').write_text(json.dumps(out, ensure_ascii=False, indent=2))

from scipy.signal import correlate, find_peaks
a = samples(SONG, 8000)
b = samples(ANIM, 8000)
lag = int(np.argmax(correlate(a[:480000], b[:400000], mode='full', method='fft')) - len(b[:400000]) + 1) / 8000
hop = 200
energy = np.sqrt(np.mean(a[:len(a)//hop*hop].reshape(-1,hop)**2,axis=1))
novelty = np.maximum(0,np.diff(energy, prepend=energy[0]))
peaks,_ = find_peaks(novelty, distance=10, prominence=.012)
(BASE/'work/audio_analysis.json').write_text(json.dumps({'duration':len(a)/8000, 'animation_offset':lag, 'energy_fps':40, 'energy':energy.tolist(), 'onset_times':(peaks/40).tolist()}))
print('AUDIO_OFFSET', lag, flush=True)
