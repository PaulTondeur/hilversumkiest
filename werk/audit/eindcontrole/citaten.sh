#!/usr/bin/env bash
# Eindcontrole: staat elk citaat op de site letterlijk in de bron? En hoeveel standpunten hebben geen citaat?
#   bash werk/audit/eindcontrole/citaten.sh      (heeft bronnen/<partij>/ lokaal nodig)
set -euo pipefail
cd "$(dirname "$0")/../../.."
T=$(mktemp -d)
node -e '
const fs=require("fs");const b=require("./data/stellingen.json");const P=require("./data/partijen.json");
for(const p of P){const l=b.map(s=>({id:s.id,...(s.posities[p.slug]||{})}));
 const bekend=l.filter(x=>typeof x.s==="number");
 console.log(p.slug.padEnd(28),"bekend",String(bekend.length).padStart(3),"zonder citaat",String(bekend.filter(x=>!x.citaat).length).padStart(3),"(soort zonder citaat:",[...new Set(bekend.filter(x=>!x.citaat).map(x=>x.soort))].join(",")+")");
 fs.writeFileSync(process.argv[1]+"/"+p.slug+".json",JSON.stringify(l.filter(x=>x.citaat)))}' "$T"
for s in $(node -e 'require("./data/partijen.json").forEach(p=>console.log(p.slug))'); do
  python3 -I werk/tools/check_citaten.py "$s" "$T/$s.json" | grep -E "NIET GEVONDEN|citaten," || true
done
rm -rf "$T"
