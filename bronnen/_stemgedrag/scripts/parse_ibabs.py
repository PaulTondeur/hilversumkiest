"""Parse iBabs meeting pages (Hilversum) into a JSON list of votes.
Usage: python3 -I parse_ibabs.py <dir with html> <out.json>
"""
import sys, os, re, json, html

d, out = sys.argv[1], sys.argv[2]
res = []
for fn in sorted(os.listdir(d)):
    if not fn.endswith('.html'):
        continue
    mid = fn[:-5]
    t = open(os.path.join(d, fn), encoding='utf-8').read()
    m = re.search(r'<title>([^<]*)</title>', t)
    title = html.unescape(m.group(1)) if m else ''
    dm = re.search(r'(\d{1,2}) (januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december) (\d{4})', title)
    months = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
    date = f"{dm.group(3)}-{months.index(dm.group(2))+1:02d}-{int(dm.group(1)):02d}" if dm else ''
    parts = re.split(r'<div class="panel panel-default agenda-item" id="', t)
    for p in parts[1:]:
        iid = p.split('"', 1)[0]
        pid = re.search(r'<div class="panel-id">([^<]*)</div>', p)
        lab = re.search(r'<span class="panel-title-label"[^>]*>\s*(.*?)\s*</span>', p, re.S)
        if 'Stemuitslag' not in p:
            continue
        v = p[p.find('Stemuitslag'):]
        def grab(kind):
            # summary text with counts
            m = re.search(r'vote-summary-legend-' + kind + r' d-flex.*?<div class="text">\s*(.*?)\s*</div>', v, re.S)
            if not m:
                return []
            txt = html.unescape(m.group(1)).strip()
            # detail list
            after = v[m.end():]
            dm2 = re.search(r'vote-summary-legend-details[^>]*>\s*<ul>(.*?)</ul>\s*</div>', after, re.S)
            details = {}
            if dm2:
                for li in re.finditer(r'<li>\s*([^<]*?)\s*<ul>\s*<li>(.*?)</li>', dm2.group(1), re.S):
                    details[html.unescape(li.group(1)).strip()] = html.unescape(li.group(2)).strip()
            items = []
            for fm in re.finditer(r'(.+?) \((\d+)\)(?:, |$)', txt):
                key = f"{fm.group(1).strip()} ({fm.group(2)})"
                items.append({'fractie': fm.group(1).strip(), 'n': int(fm.group(2)), 'leden': details.get(key, '')})
            return items
        voor = grab('in-favour')
        tegen = grab('against')
        pct = re.search(r'(\d+)% Voor', v)
        res.append({'meeting_id': mid, 'datum': date, 'meeting_title': title, 'item_id': iid,
                    'panel_id': pid.group(1).strip() if pid else '',
                    'titel': html.unescape(re.sub(r'\s+', ' ', lab.group(1))).strip() if lab else '',
                    'voor': voor, 'tegen': tegen,
                    'n_voor': sum(x['n'] for x in voor), 'n_tegen': sum(x['n'] for x in tegen),
                    'url': f'https://hilversum.bestuurlijkeinformatie.nl/Agenda/Index/{mid}#{iid}'})
json.dump(res, open(out, 'w'), ensure_ascii=False, indent=1)
print(len(res))
