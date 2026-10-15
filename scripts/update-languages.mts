import { writeFile } from 'node:fs/promises';
const source='https://ftp.iana.org/assignments/language-subtag-registry/language-subtag-registry';
const response=await fetch(source);if(!response.ok)throw new Error('IANA registry unavailable');
const registry=await response.text();const records:Record<string,string>={};
for(const block of registry.split('%%')){
  const fields:Record<string,string[]>={};let last='';
  for(const line of block.split(/\r?\n/)){
    if(/^\s/.test(line)&&last){fields[last][fields[last].length-1]+=' '+line.trim();continue;}
    const match=/^([^:]+): (.*)$/.exec(line);if(match){last=match[1];(fields[last]??=[]).push(match[2]);}
  }
  const code=fields.Subtag?.[0];
  if(fields.Type?.[0]==='language'&&code&&/^[a-z]{2,3}$/.test(code)&&!fields.Deprecated&&fields.Scope?.[0]!=='collection'&&!['und','mul','zxx','mis'].includes(code))records[code]=fields.Description.join(' / ');
}
const codes=Object.keys(records).sort();const date=/File-Date: (.+)/.exec(registry)?.[1];
const deNames=new Intl.DisplayNames(['de'],{type:'language',fallback:'none'});const enNames=new Intl.DisplayNames(['en'],{type:'language',fallback:'none'});
const entries=codes.map(code=>{const name=records[code];const de=deNames.of(code)??name;const en=enNames.of(code)??name;const search=(name+' '+de+' '+en).normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase();return [code,name,de,en,search];});
await writeFile(new URL('../lib/data/languages.json',import.meta.url),JSON.stringify({source,date,entries})+'\n');
await writeFile(new URL('../lib/language-codes.ts',import.meta.url),`// IANA Language Subtag Registry (${date}); regenerate with scripts/update-languages.mts.\nconst registered=new Set('${codes.join(' ')}'.split(' '));\nexport const isRegisteredLanguage=(code:string)=>registered.has(code);\n`);
console.log(`${codes.length} registered languages imported (${date}).`);
