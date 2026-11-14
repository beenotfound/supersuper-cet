import json, os, subprocess, urllib.request, urllib.error, time
from pathlib import Path

ROOT = Path(r'D:\project\cet-prep')
AUDIO = ROOT / 'site' / 'audio'
TAG = 'audio-v1'
REPO = 'beenotfound/supersuper-cet'

cred = subprocess.run(["git", "credential", "fill"], input="protocol=https\nhost=github.com\n\n",
                      capture_output=True, text=True).stdout
TOK = [l.split("=", 1)[1] for l in cred.splitlines() if l.startswith("password=")][0]
H = {"Authorization": "token " + TOK, "User-Agent": "cet-audio-migrate", "Accept": "application/vnd.github+json"}


def api(method, path, body=None, base="https://api.github.com"):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base + path, data=data, method=method, headers={**H, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read() or b'{}')


# release (reuse if already created)
try:
    rel = api("GET", f"/repos/{REPO}/releases/tags/{TAG}")
    print("release exists", rel["id"], flush=True)
except urllib.error.HTTPError as e:
    if e.code != 404:
        raise
    rel = api("POST", f"/repos/{REPO}/releases", {
        "tag_name": TAG, "name": "听力音频 audio-v1",
        "body": "50 套四六级听力原始立体声音频；长音频按 <=24 MiB 切段，供站点外链播放。",
    })
    print("release created", rel["id"], flush=True)

assets = {a["name"]: a for a in api("GET", f"/repos/{REPO}/releases/{rel['id']}/assets?per_page=100")}
files = sorted(p for p in AUDIO.iterdir() if p.is_file())
print("files", len(files), "existing assets", len(assets), flush=True)

for i, p in enumerate(files, 1):
    if p.name in assets:
        print(f"{i}/{len(files)} skip {p.name}", flush=True)
        continue
    data = p.read_bytes()
    req = urllib.request.Request(
        f"https://uploads.github.com/repos/{REPO}/releases/{rel['id']}/assets?name={urllib.parse.quote(p.name)}",
        data=data, method="POST",
        headers={**H, "Content-Type": "audio/mpeg", "Content-Length": str(len(data))},
    )
    with urllib.request.urlopen(req, timeout=600) as r:
        a = json.loads(r.read())
    print(f"{i}/{len(files)} uploaded {p.name} {len(data)/1048576:.1f}MB -> {a['browser_download_url']}", flush=True)

# rebuild listening.json with release URLs
data_path = ROOT / 'site' / 'data' / 'listening.json'
data = json.loads(data_path.read_text(encoding='utf-8'))
base = f"https://github.com/{REPO}/releases/download/{TAG}/"
for s in data["sets"]:
    for sec in s.get("sections", []):
        for key in ("audio", "audioParts"):
            if key not in sec:
                continue
            vals = sec[key] if isinstance(sec[key], list) else [sec[key]]
            out = [base + v.split("/")[-1] for v in vals]
            sec[key] = out if key == "audioParts" else out[0]
data_path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print("data rewritten", data_path.stat().st_size, flush=True)
