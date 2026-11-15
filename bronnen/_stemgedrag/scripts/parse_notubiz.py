"""Parse Notubiz meeting pages (Wijdemeren) into a JSON list of votes.
Usage: python3 -I parse_notubiz.py <dir with html> <out.json>
"""
import sys, os, re, json, html

d, out = sys.argv[1], sys.argv[2]
res = []

def clean(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()

for fn in sorted(os.listdir(d)):
    if not fn.endswith('.html'):
        continue
    mid = fn[:-5]
    t = open(os.path.join(d, fn), encoding='utf-8').read()
    m = re.search(r'<title>([^<]*)</title>', t)
    title = clean(m.group(1)) if m else ''
    dm = re.search(r'(\d{2})-(\d{2})-(\d{4})', title)
    date = f"{dm.group(3)}-{dm.group(2)}-{dm.group(1)}" if dm else ''
    for vm in re.finditer(r'<section id="voting_(\d+)" class="voting"(.*?)</section>', t, re.S):
        vid, body = vm.group(1), vm.group(2)
        vt = re.search(r'<p class="voting_title"[^>]*>(.*?)</p>', body, re.S)
        vtitle = clean(vt.group(1)).replace('Stemming ', '', 1) if vt else ''
        fig = re.search(r'aria-label="Stemming resultaat: ([^"]*)"', body)
        res_txt = html.unescape(fig.group(1)) if fig else ''
        lists = {}
        for lm in re.finditer(r'<div class="votes_list ([a-z_ ]+)">\s*<p class="votes_list_title">([^<]*)</p>(.*?)</ul>\s*</div>', body, re.S):
            kind = lm.group(2).strip()
            parties = []
            for pm in re.finditer(r'<li>([^<]+?)\s*<ul>(.*?)</ul>', lm.group(3), re.S):
                members = [clean(x) for x in re.findall(r'<li class="[a-z_ ]+">(.*?)</li>', pm.group(2), re.S)]
                parties.append({'fractie': clean(pm.group(1)), 'n': len(members), 'leden': ', '.join(members)})
            lists[kind] = parties
        # agenda item context: search backwards for nearest agenda item title
        before = t[:vm.start()]
        ai = list(re.finditer(r'<span class="agenda_item_title[^"]*"[^>]*>(.*?)</span>|<h3[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)</h3>', before, re.S))
        ctx = clean(ai[-1].group(1) or ai[-1].group(2)) if ai else ''
        res.append({'meeting_id': mid, 'datum': date, 'meeting_title': title, 'voting_id': vid,
                    'titel': vtitle, 'agendapunt': ctx, 'resultaat': res_txt,
                    'voor': lists.get('voor', []), 'tegen': lists.get('tegen', []),
                    'overig': {k: v for k, v in lists.items() if k not in ('voor', 'tegen')},
                    'n_voor': sum(x['n'] for x in lists.get('voor', [])),
                    'n_tegen': sum(x['n'] for x in lists.get('tegen', [])),
                    'url': f'https://wijdemeren.raadsinformatie.nl/vergadering/{mid}#voting_{vid}'})
json.dump(res, open(out, 'w'), ensure_ascii=False, indent=1)
print(len(res))
