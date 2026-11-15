"""Fetch motion/amendment/proposal documents for selected votes and extract the decisive text.
Usage: python3 -I fetch_docs.py all.json hv_votes.json wd_votes.json selection.txt base_dir out.json
selection.txt: one index (into all.json) per line, '#' comments allowed.
Downloads go to base_dir/ibabs/{reports,docs} and base_dir/notubiz/docs.
"""
import sys, os, re, json, html, time, subprocess, urllib.request

allv = json.load(open(sys.argv[1]))
hv = json.load(open(sys.argv[2]))
wd = json.load(open(sys.argv[3]))
sel = [int(l.split('#')[0]) for l in open(sys.argv[4]) if l.split('#')[0].strip()]
base = sys.argv[5]
outp = sys.argv[6]
out = json.load(open(outp)) if os.path.exists(outp) else {}
UA = {'User-Agent': 'Mozilla/5.0'}
HB = 'https://hilversum.bestuurlijkeinformatie.nl'

def get(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return open(path, 'rb').read()
    req = urllib.request.Request(url, headers=UA)
    data = urllib.request.urlopen(req, timeout=60).read()
    open(path, 'wb').write(data)
    time.sleep(1)
    return data

def pdftext(path):
    r = subprocess.run(['pdftotext', path, '-'], capture_output=True, text=True)
    return r.stdout

def clean(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()

def dictum(txt):
    t = re.sub(r'\s+', ' ', txt)
    m = re.search(r'(verzoekt|draagt|besluit|spreekt uit|roept)\b.*', t, re.I)
    seg = m.group(0) if m else t
    e = re.search(r'en gaat over tot de orde|en gaan over tot de orde|gaat over tot de orde', seg, re.I)
    if e:
        seg = seg[:e.start()]
    return seg[:900]

for idx in sel:
    key = str(idx)
    if key in out:
        continue
    x = allv[idx]
    rec = {'raad': x['raad'], 'datum': x['datum'], 'titel': x['titel']}
    try:
        if x['raad'] == 'Hilversum':
            iid = x['url'].split('#')[1]
            page = open(os.path.join(base, 'ibabs/raad', x['meeting_id'] + '.html'), encoding='utf-8').read()
            p = page.split(f'<div class="panel panel-default agenda-item" id="{iid}"')[1].split('<div class="panel panel-default agenda-item"')[0]
            vb = re.search(r'<h4>Voorgesteld besluit</h4>\s*</div>\s*<div class="col-12 text">(.*?)</div>', p, re.S)
            if vb:
                rec['voorgesteld_besluit'] = clean(vb.group(1))[:900]
            reps = re.findall(r'data-url="/Reports/Item/([0-9a-f-]+)"[^>]*>\s*<td[^>]*>([^<]*)</td>', p)
            code = re.match(r'([AM]\d\d[-/]\d+[a-zA-Z]?)', x['titel'])
            pick = None
            for rid, rt in reps:
                if code and rt.strip().startswith(code.group(1)[:3]) and code.group(1).split('-')[-1].split('/')[-1] in rt:
                    pick = rid; break
            if not pick and reps and code:
                pick = reps[0][0]
            if pick:
                rp = get(f'{HB}/Reports/Item/{pick}', os.path.join(base, 'ibabs/reports', pick + '.html')).decode('utf-8', 'replace')
                body = clean(re.sub(r'<script.*?</script>', '', rp, flags=re.S))
                ind = re.search(r'Raadsleden (.*?) Portefeuillehouder', body)
                st = re.search(r'Status (\S+)', body)
                rec['indieners'] = ind.group(1).strip() if ind else ''
                rec['status'] = st.group(1) if st else ''
                did = re.search(r'documentId=([0-9a-f-]+)', rp)
                if did:
                    pdfp = os.path.join(base, 'ibabs/docs', did.group(1) + '.pdf')
                    get(f'{HB}/Document/View/{did.group(1)}', pdfp)
                    rec['doc_url'] = f'{HB}/Reports/Item/{pick}'
                    rec['dictum'] = dictum(pdftext(pdfp))
                    rec['kop'] = re.sub(r'\s+', ' ', pdftext(pdfp))[:400]
            if 'dictum' not in rec:
                bl = re.findall(r'href="/Agenda/Document/[^"]*documentId=([0-9a-f-]+)[^"]*"[^>]*>(.*?)</a>', p, re.S)
                cand = [(d, clean(t)) for d, t in bl]
                if code:
                    cand = [c for c in cand if code.group(1)[:3] in c[1]] or cand
                if cand and (code or not vb):
                    did = cand[0][0]
                    pdfp = os.path.join(base, 'ibabs/docs', did + '.pdf')
                    get(f'{HB}/Document/View/{did}', pdfp)
                    rec['doc_url'] = x['url']
                    rec['doc_title'] = cand[0][1]
                    txt = pdftext(pdfp)
                    rec['dictum'] = dictum(txt)
                    rec['kop'] = re.sub(r'\s+', ' ', txt)[:400]
        else:
            vid = x['url'].split('voting_')[1]
            page = open(os.path.join(base, 'notubiz/raad', x['meeting_id'] + '.html'), encoding='utf-8').read()
            pos = page.find(f'<section id="voting_{vid}"')
            before = page[:pos]
            docs = list(re.finditer(r'<li id="document_(\d+)">\s*<a\s+class="new_window "\s+href="([^"]+)"[^>]*>.*?<span class="document_title">\s*(.*?)\s*</span>.*?<span title="([^"]*)" class="document_type"', before[-60000:], re.S))
            # choose last document before the voting whose title shares the code (e.g. M-V-1) or first word
            code = re.search(r'([AM]-[\dV]+-\d+[a-zA-Z]?)', x['titel'])
            pick = None
            for d in reversed(docs):
                if code and code.group(1).lower() in clean(d.group(3)).lower():
                    pick = d; break
            if not pick and docs:
                pick = docs[-1]
            if pick:
                url = html.unescape(pick.group(2))
                rec['doc_url'] = url.split('?')[0]
                rec['doc_title'] = clean(pick.group(3)); rec['doc_type'] = pick.group(4)
                pdfp = os.path.join(base, 'notubiz/docs', pick.group(1) + '.pdf')
                get(url, pdfp)
                rec['dictum'] = dictum(pdftext(pdfp))
    except Exception as e:
        rec['error'] = repr(e)
    out[key] = rec
    json.dump(out, open(outp, 'w'), ensure_ascii=False, indent=1)
    print(idx, rec.get('status', ''), rec.get('indieners', ''), rec.get('error', ''), flush=True)
