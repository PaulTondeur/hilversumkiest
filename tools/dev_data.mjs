// Tijdelijke testdata: MijnStem-antwoorden als stellingen, alleen om de site te kunnen proefdraaien.
import fs from 'node:fs';
const ant = JSON.parse(fs.readFileSync(new URL('../bronnen/_stemhulpen/antwoorden.json', import.meta.url)));
const themas = ['verkeer','economie','bestuur','wonen','asiel','economie','zorg','wonen','klimaat','financien','veiligheid','verkeer','wonen','klimaat','veiligheid','wonen','veiligheid','verkeer','natuur','zorg','klimaat','verkeer','economie','natuur','bestuur'];
const st = ant.filter((s) => s.bron === 'mijnstem').map((s, i) => ({
  id: 'dev-' + i, thema: themas[i], onderwerp: 'dev-' + i, kop: 'Testdata', stelling: s.stelling.replace(/<[^>]+>/g, ''), uitleg: 'Tijdelijke testdata.', voor: '…', tegen: '…',
  posities: Object.fromEntries(s.antwoorden.map((a) => [a.slug, { s: Math.max(-2, Math.min(2, Math.round((a.waarde - 50) / 25))), kern: '', toelichting: a.toelichting, soort: 'mijnstem' }])),
}));
fs.writeFileSync(new URL('../data/stellingen.json', import.meta.url), JSON.stringify(st, null, 1));
console.log(st.length, 'teststellingen');
