import json, os, shutil, subprocess
from pathlib import Path
import imageio_ffmpeg

ROOT = Path(r'D:\project\cet-prep')
ORIG = ROOT / '_orig_audio'
AUDIO = ROOT / 'site' / 'audio'
DATA = ROOT / 'site' / 'data' / 'listening.json'
SRC_DATA = ROOT / '_orig-listening.json'
LIMIT = 24 * 1024 * 1024
exe = imageio_ffmpeg.get_ffmpeg_exe()

data = json.loads(SRC_DATA.read_text(encoding='utf-8'))
refs = []
for s in data['sets']:
    for sec in s.get('sections', []):
        a = sec.get('audio')
        if a and a not in refs:
            refs.append(a)

for f in AUDIO.iterdir():
    if f.is_file():
        f.unlink()


def sniff(src):
    head = src.read_bytes()[:12]
    if head[4:8] == b'ftyp':
        return '.m4a'
    if head[:3] == b'ID3' or head[:2] in (b'\xff\xfb', b'\xff\xf3', b'\xff\xf2'):
        return '.mp3'
    if head[:4] == b'RIFF':
        return '.wav'
    return src.suffix.lower()


mapping = {}
for ref in refs:
    src = ORIG / os.path.basename(ref)
    size = src.stat().st_size
    ext = sniff(src)
    base = os.path.splitext(os.path.basename(ref))[0]
    out_name = base + ext
    if size <= LIMIT:
        shutil.copy2(src, AUDIO / out_name)
        mapping[ref] = ['audio/' + out_name]
        print('keep', out_name, round(size / 1048576, 1), 'MB', flush=True)
        continue
    part_time = 1200
    parts = []
    for attempt in range(3):
        for old in AUDIO.glob(base + '-part*' + ext):
            old.unlink()
        pattern = str(AUDIO / f'{base}-part%03d{ext}')
        cmd = [exe, '-y', '-loglevel', 'error', '-i', str(src), '-c', 'copy',
               '-f', 'segment', '-segment_time', str(part_time), '-reset_timestamps', '1']
        if ext == '.m4a':
            cmd += ['-segment_format', 'mp4']
        cmd.append(pattern)
        r = subprocess.run(cmd, capture_output=True)
        parts = sorted(AUDIO.glob(base + '-part*' + ext))
        if r.returncode == 0 and parts and all(p.stat().st_size < LIMIT for p in parts):
            break
        if r.returncode != 0:
            print('ffmpeg warn', out_name, r.stderr.decode('utf-8', 'replace')[-200:], flush=True)
        part_time = 600
    mapping[ref] = ['audio/' + p.name for p in parts]
    print('split', out_name, round(size / 1048576, 1), 'MB ->',
          [f'{p.name} {p.stat().st_size/1048576:.1f}MB' for p in parts], flush=True)

for s in data['sets']:
    for sec in s.get('sections', []):
        a = sec.get('audio')
        parts = mapping.get(a)
        if not parts:
            print('MISSING MAPPING', a)
            continue
        sec['audio'] = parts[0]
        if len(parts) > 1:
            sec['audioParts'] = parts
        else:
            sec.pop('audioParts', None)

DATA.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('data written', DATA.stat().st_size)
