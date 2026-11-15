import json, sys, csv
slugs=[r['slug'] for r in csv.DictReader(open('bronnen/lijsten.tsv'),delimiter='\t')]
ab={'hart-voor-hilversum':'HvH','pro':'PRO','d66':'D66','vvd':'VVD','cda':'CDA','lokaal-een':'L1','sp':'SP','christenunie':'CU','bvnl':'BVNL','scb':'SCB','gewoon-hilversum':'GH','dorp-voor-dorp':'DvD','stop-betaald-parkeren-vip':'VIP','opstand-nu':'OPS','pvdd':'PvdD','blanco-van-oostveen':'BL','lfd':'LFD','volt':'Volt','fvd':'FVD','bbb':'BBB'}
for t in sys.argv[1:]:
    d=json.load(open(f'werk/themas/{t}/kandidaten.json'))
    print(f'##### {t} ({len(d)})')
    for k in d:
        g={2:[],1:[],0:[],-1:[],-2:[]}; n=0
        for s in slugs:
            v=(k['posities'].get(s) or {}).get('s')
            if v is None: n+=1
            else: g[v].append(ab[s])
        print(f"\n[{k['id']}] ({k.get('onderwerp')}) {k['stelling']}")
        print('   ++ '+' '.join(g[2])+' | + '+' '.join(g[1])+' | 0 '+' '.join(g[0])+' | - '+' '.join(g[-1])+' | -- '+' '.join(g[-2])+f' | ?{n}')
        if k.get('twijfel'): print('   twijfel: '+str(k['twijfel'])[:220])
