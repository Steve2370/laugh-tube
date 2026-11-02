"""Reproducible 124-second LaughTube music-video edit. Original media are read-only."""
from pathlib import Path
import argparse
import json
import math
import subprocess
import concurrent.futures
from PIL import Image, ImageDraw, ImageFont
import numpy as np

ROOT = Path(__file__).resolve().parent
WORK = ROOT / 'work'
ASSETS = ROOT / 'assets'
ANIM = Path('/Users/leonbeltran/Downloads/LT.mp4')
SITE = Path('/Users/leonbeltran/Desktop/Enregistrement d’écran, le 2026-10-10 à 22.22.27.mov')
SONG = Path('/Users/leonbeltran/Downloads/On vient pour rire.mp3')
LOGO = ROOT.parents[1] / 'frontend/public/logo.png'
W, H, FPS = 2910, 1572, 30
FONT = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
HEAVY = '/System/Library/Fonts/Supplemental/Arial Black.ttf'
COND = '/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf'
REGULAR = '/System/Library/Fonts/Supplemental/Arial.ttf'

# Cut positions follow the sung phrasing, measured from the supplied MP3.
# Source time is independent where performance inserts support the narration.
SHOTS = [
    dict(end=4.40, kind='intro'),
    dict(end=8.60, kind='site', src=0.15, caption='Bienvenue sur LaughTube.'),
    dict(end=11.30, kind='trio', src=[10.15,31.1,106.0]),
    dict(end=14.05, kind='art', image='creation', caption='Une caméra dans la main.', zoom=1),
    dict(end=16.25, kind='art', image='defis', caption='Viens montrer ton talent.', zoom=-1),
    dict(end=18.40, kind='site', src=9.0, caption='À chacun son humour.'),
    dict(end=20.95, kind='hero', src=24.5, words=['LE SOURIRE', 'EST CONTAGIEUX.'], size=158),
    dict(end=22.95, kind='type', words=['MONTE', 'LE SON.'], size=270),
    dict(end=25.45, kind='site', src=13.2, caption='Une nouvelle vidéo. Un nouveau sourire.'),
    dict(end=30.60, kind='art', image='ensemble', caption='On crée ensemble.', zoom=-1),
    dict(end=33.90, kind='trio', src=[30.6,15.0,41.0], badge='ON VIENT POUR RIRE'),
    dict(end=36.10, kind='site', src=50.0, caption='Des vidéos. Des lives. Des moments à partager.'),
    dict(end=38.45, kind='trio', src=[37.0,110.6,81.0]),
    dict(end=41.80, kind='hero', src=41.0, words=['TA VOIX.', 'TON HUMOUR.', 'TON MONDE.'], size=192),
    dict(end=45.60, kind='site', src=4.7, caption='On se retrouve sur LaughTube.'),
    dict(end=51.55, kind='trio', src=[45.6,80.5,111.0], badge='LE RIRE SE PARTAGE'),
    dict(end=54.00, kind='art', image='defis', caption='Des créateurs en action.', zoom=1),
    dict(end=56.30, kind='art', image='defis', caption='Des éclats de rire.', zoom=-1, detail=True),
    dict(end=60.85, kind='site', src=16.4, caption='Un abonnement. Un commentaire. Une réaction.', reactions=True),
    dict(end=62.90, kind='type', words=['MONTE', 'LE SON.'], size=270, red=True),
    dict(end=65.65, kind='art', image='ensemble', caption='La communauté est là.', zoom=1),
    dict(end=67.75, kind='site', src=40.15, caption='Pas besoin d’être une star pour briller.'),
    dict(end=70.60, kind='art', image='creation', caption='Oser. Créer. Partager.', zoom=-1, detail=True),
    dict(end=73.80, kind='trio', src=[70.7,110.6,32.3], badge='ON VIENT POUR RIRE'),
    dict(end=76.05, kind='site', src=50.15, caption='Des vidéos. Des lives. Du partage.'),
    dict(end=78.40, kind='trio', src=[76.1,16.1,41.0]),
    dict(end=81.75, kind='hero', src=81.0, words=['TA VOIX.', 'TON HUMOUR.', 'TON MONDE.'], size=192),
    dict(end=86.85, kind='trio', src=[81.9,32.0,102.0]),
    dict(end=89.45, kind='art', image='ensemble', caption='Un rire ici. Un rire là.', zoom=1, detail=True),
    dict(end=91.70, kind='art', image='ensemble', caption='Tout le monde se rassemble.', zoom=-1),
    dict(end=93.90, kind='pause', src=107.0),
    dict(end=96.90, kind='art', image='ensemble', caption='LaughTube nous rapproche.', zoom=1),
    dict(end=100.15, kind='trio', src=[97.0,15.0,41.0], badge='ON VIENT POUR RIRE'),
    dict(end=102.40, kind='art', image='creation', caption='Des rêves en vidéo.', zoom=1),
    dict(end=104.40, kind='site', src=0.05, caption='Viens nous rejoindre.'),
    dict(end=107.60, kind='hero', src=105.5, words=['À TOI', 'DE JOUER.'], size=250),
    dict(end=110.35, kind='trio', src=[107.6,17.0,112.0]),
    dict(end=113.75, kind='slogan'),
    dict(end=116.80, kind='trio', src=[113.9,32.0,80.5]),
    dict(end=120.00, kind='trio', src=[116.6,41.0,103.9], badge='ON SE RETROUVE SUR LAUGHTUBE'),
    dict(end=124.00, kind='outro'),
]
last = 0
for i,s in enumerate(SHOTS):
    s['index'] = i
    s['start_frame'] = last
    s['end_frame'] = round(s['end']*FPS)
    s['frames'] = s['end_frame']-last
    s['duration'] = s['frames']/FPS
    s['start'] = last/FPS
    last = s['end_frame']

def font(size, name=FONT):
    return ImageFont.truetype(name, int(size))

def run(args, log=None):
    p = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if log:
        Path(log).write_bytes(p.stderr)
    if p.returncode:
        raise RuntimeError(p.stderr.decode(errors='replace')[-8000:])
    return p.stdout

def center_text(d, text, y, size, fill, name=HEAVY):
    f = font(size,name)
    d.text((W/2,y),text,font=f,fill=fill,anchor='mt')

def make_assets():
    WORK.mkdir(exist_ok=True)
    (WORK/'plates').mkdir(exist_ok=True)
    (WORK/'shots').mkdir(exist_ok=True)
    (WORK/'previews').mkdir(exist_ok=True)
    # Abstract light fields are drawn graphics; source logos and site capture are unaltered.
    for label,accent in [('blue',(32,56,164)),('red',(146,27,38))]:
        yy,xx = np.mgrid[0:H,0:W]
        glow = np.exp(-(((xx-W*.74)/(W*.4))**2+((yy-H*.32)/(H*.64))**2)*2)
        lower = np.exp(-(((xx-W*.18)/(W*.5))**2+((yy-H)/(H*.48))**2)*2)
        rgb = np.zeros((H,W,3),np.uint8)
        for k in range(3):
            rgb[:,:,k] = np.clip(9+glow*accent[k]*.62+lower*[30,7,22][k],0,255)
        im = Image.fromarray(rgb)
        d=ImageDraw.Draw(im)
        d.line((120,H-110,W-120,H-110),fill=(55,59,80),width=2)
        d.arc((W-1200,-650,W+950,1500),0,360,fill=(44,49,72),width=3)
        d.arc((W-1270,-720,W+1020,1570),0,360,fill=(37,41,60),width=2)
        im.save(WORK/'plates'/f'bg-{label}.png')
    for s in SHOTS:
        p=WORK/'plates'/f"{s['index']:02d}"
        kind=s['kind']
        if kind in ('intro','outro','slogan'):
            im=Image.new('RGB',(W,H),(255,255,255))
            d=ImageDraw.Draw(im)
            # Controlled edge flourishes, clear white around the actual official logo.
            d.ellipse((-420,-500,650,570),outline=(193,29,39),width=32)
            d.ellipse((W-570,H-520,W+600,H+650),outline=(36,75,215),width=30)
            d.ellipse((W-630,H-580,W+660,H+710),outline=(224,230,248),width=4)
            d.line((145,H-145,W-145,H-145),fill=(223,225,232),width=2)
            d.text((145,H-108),'LAUGHTUBE  /  ON VIENT POUR RIRE',font=font(29),fill=(85,89,100))
            d.text((W-145,H-108),'02:04',font=font(29),fill=(85,89,100),anchor='ra')
            im.save(str(p)+'-base.png')
            overlay=Image.new('RGBA',(W,H))
            if kind in ('intro','outro'):
                logo=Image.open(LOGO).convert('RGB')
                lw=2100
                logo=logo.resize((lw,round(logo.height*lw/logo.width)),Image.Resampling.LANCZOS)
                overlay.paste(logo,((W-lw)//2,320))
                d=ImageDraw.Draw(overlay)
                if kind=='intro':
                    center_text(d,'ON VIENT POUR RIRE',980,115,(20,22,30),HEAVY)
                    center_text(d,'LE CLIP',1180,38,(160,28,38),FONT)
                else:
                    center_text(d,'ON SE RETROUVE SUR',937,60,(24,29,43),FONT)
                    center_text(d,'laughtube.ca',1060,146,(189,27,37),HEAVY)
                overlay.save(str(p)+'-overlay.png')
            else:
                for j,txt in enumerate(['ON RIT.','ON CRÉE.','ON PARTAGE.']):
                    ov=Image.new('RGBA',(W,H)); d=ImageDraw.Draw(ov)
                    center_text(d,txt,360+j*235,185,(20,23,31) if j!=1 else (186,27,38),HEAVY)
                    ov.save(str(p)+f'-word{j}.png')
        if kind in ('hero','type'):
            ov=Image.new('RGBA',(W,H));d=ImageDraw.Draw(ov)
            lg=Image.open(LOGO).convert('RGB'); lg.thumbnail((480,120),Image.Resampling.LANCZOS)
            # The official white wordmark plaque is deliberately designed into the frame.
            d.rounded_rectangle((156,118,672,272),radius=20,fill='white')
            ov.paste(lg,(174,134))
            for j,txt in enumerate(s['words']):
                color=(245,247,255) if j!=len(s['words'])-1 else (255,87,95)
                d.text((160,480+j*(s['size']*1.12)),txt,font=font(s['size'],COND),fill=color)
            d.text((162,H-185),'ON VIENT POUR RIRE',font=font(34),fill=(172,180,211))
            ov.save(str(p)+'-overlay.png')
        if s.get('caption'):
            ov=Image.new('RGBA',(W,H));d=ImageDraw.Draw(ov)
            if kind=='site':
                d.text((148,1460),s['caption'],font=font(48),fill=(242,244,255))
                d.text((W-140,1470),'LAUGHTUBE.CA',font=font(27),fill=(148,157,183),anchor='ra')
            else:
                a=np.zeros((440,W,4),np.uint8)
                a[:,:,3]=np.linspace(0,180,440).astype(np.uint8)[:,None]
                ov.paste(Image.fromarray(a),(0,H-440))
                d=ImageDraw.Draw(ov)
                d.line((150,H-236,244,H-236),fill=(247,61,80),width=7)
                d.text((150,H-186),s['caption'],font=font(67),fill=(255,255,255))
            ov.save(str(p)+'-caption.png')
        if s.get('badge'):
            ov=Image.new('RGBA',(W,H));d=ImageDraw.Draw(ov)
            f=font(49); tw=d.textlength(s['badge'],font=f)
            left=(W-tw-104)/2
            d.rounded_rectangle((left,H-205,W-left,H-92),radius=28,fill=(10,12,21,230),outline=(255,255,255,65),width=2)
            d.text((W/2,H-172),s['badge'],font=f,fill=(255,255,255),anchor='mt')
            ov.save(str(p)+'-caption.png')
        if kind=='pause':
            ov=Image.new('RGBA',(W,H));d=ImageDraw.Draw(ov)
            cx,cy=880,660
            d.rounded_rectangle((cx-190,cy-190,cx+190,cy+190),radius=190,fill=(8,12,20,160),outline=(255,255,255,100),width=3)
            d.rounded_rectangle((cx-81,cy-90,cx-27,cy+90),radius=8,fill='white')
            d.rounded_rectangle((cx+27,cy-90,cx+81,cy+90),radius=8,fill='white')
            d.text((cx,980),'ON APPUIE SUR PAUSE.',font=font(66),fill='white',anchor='mt')
            ov.save(str(p)+'-overlay.png')
    (ROOT/'montage.json').write_text(json.dumps(SHOTS,ensure_ascii=False,indent=2))

class Graph:
    def __init__(self):
        self.inputs=[]; self.filters=[];self.n=0
    def input(self,path,seek=None,still=False):
        idx=self.n;self.n+=1
        if still: self.inputs+=['-loop','1','-framerate',str(FPS)]
        if seek is not None:self.inputs+=['-ss',str(seek)]
        self.inputs+=['-i',str(path)]
        return f'{idx}:v'
    def add(self,f):self.filters.append(f)

def graph_for(s):
    g=Graph();kind=s['kind'];p=WORK/'plates'/f"{s['index']:02d}"; n=s['frames']; dur=s['duration']
    prev='base'
    if kind in ('intro','outro','slogan'):
        src=g.input(str(p)+'-base.png',still=True)
        g.add(f'[{src}]format=yuv420p,setsar=1[base]')
        if kind!='slogan':
            src=g.input(str(p)+'-overlay.png',still=True)
            g.add(f'[{src}]format=rgba,fade=t=in:st=0:d=0.4:alpha=1[title]')
            g.add("[base][title]overlay=x=0:y='32*exp(-6*t)':shortest=1[withtitle]")
            prev='withtitle'
        else:
            for j in range(3):
                src=g.input(str(p)+f'-word{j}.png',still=True)
                start=[0.65,1.15,2.05][j]
                g.add(f'[{src}]format=rgba,fade=t=in:st={start}:d=0.18:alpha=1[word{j}]')
                g.add(f'[{prev}][word{j}]overlay=x=0:y=0:shortest=1[slogan{j}]')
                prev=f'slogan{j}'
    elif kind=='art':
        src=g.input(ASSETS/f"{s['image']}.png",still=True)
        start=1.13 if s.get('detail') else 1.015
        end=start+.085
        zoom=f'{start}+({end-start})*on/{n}' if s['zoom']>0 else f'{end}-({end-start})*on/{n}'
        g.add(f"[{src}]scale=3500:-1,zoompan=z='{zoom}':x='iw/2-iw/zoom/2+12*sin(on/{n}*PI)':y='ih/2-ih/zoom/2':d={n}:s={W}x{H}:fps={FPS},setsar=1,format=yuv420p[base]")
    elif kind=='trio':
        for j,t in enumerate(s['src']):
            src=g.input(ANIM,seek=t)
            # Three equally weighted full-height panels preserve the vertical character.
            g.add(f'[{src}]fps={FPS},scale=964:1714,crop=964:{H}:0:71,setsar=1,format=yuv420p[v{j}]')
        g.add(f'color=c=0x090b13:s=10x{H}:r={FPS}[gap0]')
        g.add(f'color=c=0x090b13:s=8x{H}:r={FPS}[gap1]')
        g.add('[v0][gap0][v1][gap1][v2]hstack=inputs=5:shortest=1[base]')
    elif kind in ('site','hero','type'):
        src=g.input(WORK/'plates'/('bg-red.png' if s.get('red') else 'bg-blue.png'),still=True)
        g.add(f'[{src}]format=yuv420p,setsar=1[bg]')
        if kind=='site':
            src=g.input(SITE,seek=s['src'])
            # Real site only, downscaled proportionally. Bottom recording UI is never used.
            g.add(f'[{src}]fps={FPS},scale=2480:1340,setsar=1,format=yuv420p[screen]')
            g.add('[bg][screen]overlay=x=215:y=74:shortest=1[base]')
        elif kind=='hero':
            src=g.input(ANIM,seek=s['src'])
            g.add(f'[{src}]fps={FPS},scale=884:{H},setsar=1,format=yuv420p[actor]')
            g.add('[bg][actor]overlay=x=1870:y=0:shortest=1[base]')
        else:
            g.add('[bg]null[base]')
        if kind in ('type','hero'):
            src=g.input(str(p)+'-overlay.png',still=True)
            g.add(f'[{src}]format=rgba,fade=t=in:st=0:d=0.16:alpha=1[titles]')
            g.add("[base][titles]overlay=x='-65*exp(-9*t)':y=0:shortest=1[withtitle]")
            prev='withtitle'
        if kind=='type':
            audioidx=g.n;g.n+=1
            g.inputs+=['-ss',str(s['start']),'-i',str(SONG)]
            g.add(f'[{audioidx}:a:0]aformat=channel_layouts=mono,showwaves=s=1120x290:mode=cline:rate={FPS}:colors=0xff5b6d:scale=sqrt,format=rgba[wave]')
            g.add(f'[{prev}][wave]overlay=x=1630:y=642:shortest=1[withwave]')
            prev='withwave'
    elif kind=='pause':
        src=g.input(WORK/'plates'/'bg-blue.png',still=True)
        g.add(f'[{src}]format=yuv420p,setsar=1[bg]')
        src=g.input(ANIM,seek=s['src'])
        g.add(f'[{src}]fps={FPS},scale=884:{H},setpts=1.6*PTS,setsar=1,format=yuv420p[actor]')
        g.add('[bg][actor]overlay=x=1870:y=0:shortest=1[base]')
        src=g.input(str(p)+'-overlay.png',still=True)
        g.add(f'[base][{src}]overlay=0:0:shortest=1[withtitle]');prev='withtitle'
    else:raise ValueError(kind)
    if s.get('caption') or s.get('badge'):
        src=g.input(str(p)+'-caption.png',still=True)
        g.add(f'[{src}]format=rgba,fade=t=in:st=0.05:d=0.22:alpha=1[caption]')
        g.add(f'[{prev}][caption]overlay=x=0:y=0:shortest=1[withcaption]')
        prev='withcaption'
    if kind=='outro':
        g.add(f'[{prev}]fade=t=out:st={dur-.5}:d=0.5[out]')
    elif kind=='intro':
        g.add(f'[{prev}]fade=t=in:st=0:d=0.2:color=white[out]')
    else:g.add(f'[{prev}]null[out]')
    return g

def render(s, preview=False, software=False, force=False):
    out=WORK/('previews' if preview else 'shots')/(f"{s['index']:02d}"+('.jpg' if preview else '.mp4'))
    if out.exists() and out.stat().st_size>2000 and not force:return out
    g=graph_for(s)
    cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-filter_complex_threads','2']+g.inputs
    cmd+=['-filter_complex',';'.join(g.filters),'-map','[out]','-an','-map_metadata','-1']
    if preview:
        cmd+=['-ss',str(min(1.5,s['duration']/2)),'-frames:v','1','-q:v','2',str(out)]
    else:
        cmd+=['-frames:v',str(s['frames']),'-r',str(FPS),'-fps_mode','cfr']
        cmd+=['-c:v','libx264','-preset','fast','-crf','18','-threads','4'] if software else ['-c:v','h264_videotoolbox','-b:v','18M','-maxrate','26M','-bufsize','40M','-profile:v','high']
        cmd+=['-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-video_track_timescale','30000','-movflags','+faststart',str(out)]
    (WORK/'shots'/f"{s['index']:02d}-command.json").write_text(json.dumps(cmd,ensure_ascii=False))
    run(cmd,WORK/'shots'/f"{s['index']:02d}.log")
    print(('PREVIEW' if preview else 'RENDERED'),s['index'],s['kind'],s['start'],s['end'],flush=True)
    return out

def contact_sheet():
    cw,ch=485,262; pad=12; labelh=36;cols=4
    sheet=Image.new('RGB',(cols*(cw+pad)+pad,math.ceil(len(SHOTS)/cols)*(ch+labelh+pad)+pad),(14,17,25))
    d=ImageDraw.Draw(sheet)
    for i,s in enumerate(SHOTS):
        p=WORK/'previews'/f'{i:02d}.jpg'
        if not p.exists():continue
        im=Image.open(p).convert('RGB').resize((cw,ch),Image.Resampling.LANCZOS)
        x=pad+(i%cols)*(cw+pad);y=pad+(i//cols)*(ch+labelh+pad)
        sheet.paste(im,(x,y))
        d.text((x,y+ch+6),f"{i:02d}  {s['start']:05.2f}–{s['end']:05.2f}  {s['kind']}",font=font(21),fill=(230,233,245))
    sheet.save(WORK/'storyboard.jpg',quality=90)

def assemble():
    lines=[]
    for s in SHOTS:
        f=WORK/'shots'/f"{s['index']:02d}.mp4"
        if not f.exists():raise RuntimeError(f'Missing {f}')
        lines.append("file '"+str(f)+"'")
    concat=WORK/'edit.ffconcat';concat.write_text('\n'.join(lines)+'\n')
    out=ROOT/'LaughTube_On_vient_pour_rire_2910x1572.mp4'
    # Original MP3 throughout. No duplicated Kaiber soundtrack. Modest static gain only.
    run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(concat),'-i',str(SONG),'-map','0:v:0','-map','1:a:0','-c:v','copy','-af','volume=1.15','-c:a','aac','-b:a','320k','-ar','48000','-t','124','-map_metadata','-1','-metadata','title=LaughTube — On vient pour rire','-metadata','comment=Montage original — 2910 × 1572 — chanson intégrale','-movflags','+faststart',str(out)])
    print('FINAL',out,flush=True)

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('action',choices=['prepare','preview','render','assemble']);ap.add_argument('--shot',type=int);ap.add_argument('--jobs',type=int,default=2);ap.add_argument('--software',action='store_true');ap.add_argument('--force',action='store_true');args=ap.parse_args()
    if args.action=='prepare':make_assets()
    elif args.action in ('preview','render'):
        selected=SHOTS if args.shot is None else [SHOTS[args.shot]]
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.jobs) as pool:
            futures=[pool.submit(render,s,args.action=='preview',args.software,args.force) for s in selected]
            for f in concurrent.futures.as_completed(futures):f.result()
        if args.action=='preview':contact_sheet()
    elif args.action=='assemble':assemble()
