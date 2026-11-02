from pathlib import Path
import json
import subprocess
import numpy as np
from scipy.signal import correlate
from make_clip import SHOTS, ROOT, WORK, SONG, W, H, FPS

def probe(path):
    return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(path)]))

final = ROOT/'LaughTube_On_vient_pour_rire_2910x1572.mp4'
p = probe(final)
video = [s for s in p['streams'] if s['codec_type']=='video']
audio = [s for s in p['streams'] if s['codec_type']=='audio']
assert len(video)==1 and len(audio)==1
v,a=video[0],audio[0]
assert (v['width'],v['height'])==(W,H)
assert int(v['nb_frames'])==124*FPS
assert abs(float(p['format']['duration'])-124)<.08
assert abs(float(a['duration'])-124)<.08
for shot in SHOTS:
    sp=probe(WORK/'shots'/f"{shot['index']:02d}.mp4")
    sv=sp['streams'][0]
    assert int(sv['nb_frames'])==shot['frames'], (shot['index'],sv['nb_frames'],shot['frames'])

def pcm(file,channels=1,rate=8000):
    return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(file),'-map','0:a:0','-ac',str(channels),'-ar',str(rate),'-f','f32le','-']),np.float32)
src=pcm(SONG);dst=pcm(final)
n=min(len(src),len(dst))
lag=int(np.argmax(correlate(dst[:400000],src[:400000],method='fft',mode='full'))-399999)
cor=float(np.corrcoef(src[:n],dst[:n])[0,1])
assert abs(lag)<=8,lag
assert cor>.985,cor
stereo_peak=float(np.max(np.abs(pcm(final,2,48000))))
assert stereo_peak<1,stereo_peak
decode=subprocess.run(['ffmpeg','-v','error','-i',str(final),'-f','null','-'],capture_output=True)
assert decode.returncode==0,decode.stderr.decode()
assert not decode.stderr,decode.stderr.decode()
report={'dimensions':[W,H],'duration':p['format']['duration'],'frames':v['nb_frames'],'fps':v['avg_frame_rate'],'video_codec':v['codec_name'],'audio_codec':a['codec_name'],'audio_streams':len(audio),'source_audio_duration':len(src)/8000,'export_audio_duration':len(dst)/8000,'audio_offset_seconds':lag/8000,'audio_correlation':cor,'stereo_peak':stereo_peak,'decode_errors':0,'shots_verified':len(SHOTS),'size_bytes':p['format']['size']}
(ROOT/'verification.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
