import {test,expect,type Page} from '@playwright/test';
import {manuelGameEntries} from '../../lib/manuel-game-seeds';
import {audioSampleRate,encodeAudioWave,validateAudioWave} from '../../lib/audio-format';
async function mockSession(page:Page){
 await page.route('**/api/auth/get-session**',route=>route.fulfill({json:{session:{id:'browser-session',userId:'browser-user',expiresAt:'2099-01-01T00:00:00Z',token:'browser-test-only'},user:{id:'browser-user',name:'Browser QA',email:'qa@sprachwelten.invalid',emailVerified:false,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z'}}}));
 await page.route('**/api/admin/access',route=>route.fulfill({json:{isAdmin:false}}));
 await page.route('**/api/audio',route=>route.fulfill({json:{available:false}}));
 await page.route('**/api/entries/duplicates?*',route=>route.fulfill({json:{duplicate:null}}));
}
test('half the game cards, expandable explanations, language and mobile login',async({page})=>{
 await page.route('**/api/auth/get-session**',route=>route.fulfill({json:null}));
 const ready=page.waitForResponse(response=>response.url().includes('/api/auth/get-session'));await page.goto('/');await ready;await expect(page.getByRole('button',{name:'Anmelden',exact:true})).toBeVisible();
 await expect(page.locator('.mode-card')).toHaveCount(4);await page.locator('.show-more-modes').click();await expect(page.locator('.mode-card')).toHaveCount(8);
 await page.getByRole('button',{name:'EN',exact:true}).click();await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Start game',exact:true})).toBeVisible();
});
test('guests can publish without a login and optional account benefits are explained in DE and EN',async({page})=>{
 await page.route('**/api/auth/get-session**',route=>route.fulfill({json:null}));
 await page.route('**/api/audio',route=>route.fulfill({json:{available:false}}));
 await page.route('**/api/translations',route=>route.fulfill({json:{available:true}}));
 await page.route('**/api/entries/duplicates?*',route=>route.fulfill({json:{duplicate:null}}));
 let submitted:Record<string,unknown>|undefined;
 await page.route('**/api/entries',route=>{submitted=route.request().postDataJSON() as Record<string,unknown>;return route.fulfill({status:201,json:{entry:{id:'guest-test'}}});});
 const ready=page.waitForResponse(response=>response.url().includes('/api/auth/get-session'));await page.goto('/');await ready;await page.locator('.header').getByRole('button',{name:'Beitragen',exact:true}).click();
 const dialog=page.getByRole('dialog');await expect(dialog.getByRole('heading',{name:'Ein Stück Sprache teilen.',exact:true})).toBeVisible();await expect(dialog.getByText(/Du kannst ohne Konto beitragen\./)).toBeVisible();
 await dialog.getByRole('combobox').first().click();await page.getByRole('option',{name:'Wort',exact:true}).click();
 await dialog.locator('[name="phrase"]').fill('Gastwort');await dialog.locator('[name="literal"]').fill('Eine Testübersetzung');
 await expect(dialog.getByRole('button',{name:'Übersetzung vorschlagen',exact:true})).toBeDisabled();
 await dialog.getByRole('button',{name:'Beitrag veröffentlichen',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Dein Beitrag wurde veröffentlicht.');expect(submitted?.phrase).toBe('Gastwort');expect(submitted?.creditName).toBe('');
 await page.getByRole('button',{name:'EN',exact:true}).click();await page.locator('.header').getByRole('button',{name:'Contribute',exact:true}).click();await expect(page.getByRole('dialog').getByText(/You can contribute without an account\./)).toBeVisible();
 await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('dialog').getByText(/An account lets you manage your contributions across devices/)).toBeVisible();
});
test('region failure retains defaults, retry restores registry and selection closes',async({page})=>{
 await mockSession(page);let attempts=0;await page.route('**/api/regions',route=>{attempts++;return route.fulfill(attempts===1?{status:503,json:{error:'Unavailable'}}:{json:{regions:{'custom-test':{de:'Testregion',en:'Test region'}}}});});
 await page.goto('/');await expect(page.getByRole('link',{name:'Meine Beiträge',exact:true})).toBeVisible();await page.locator('.header').getByRole('button',{name:'Beitragen',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.getByRole('combobox').first().click();await page.getByRole('option',{name:'Dialekt',exact:true}).click();
 await expect(dialog.getByText('Die Regionen konnten nicht geladen werden. Die Standardregionen bleiben verfügbar.')).toBeVisible();
 await dialog.getByRole('combobox',{name:'Region',exact:true}).click();await page.getByRole('option',{name:'Österreich',exact:true}).click();await expect(page.getByRole('listbox')).toHaveCount(0);
 await dialog.getByRole('button',{name:'Erneut versuchen',exact:true}).click();await expect(dialog.getByText('Die Regionen konnten nicht geladen werden. Die Standardregionen bleiben verfügbar.')).toHaveCount(0);
 await dialog.getByRole('combobox',{name:'Region',exact:true}).click();await page.getByRole('option',{name:'Testregion',exact:true}).click();await expect(page.getByRole('listbox')).toHaveCount(0);
 await dialog.locator('[name="phrase"]').fill('Ein Testwort');await dialog.getByRole('button',{name:'Beitrag veröffentlichen',exact:true}).click();await expect(dialog.locator('[name="literal"]')).toBeFocused();
});
test('special game contributions avoid duplicate solution fields in both languages',async({page})=>{
 await mockSession(page);await page.goto('/');await expect(page.getByRole('link',{name:'Meine Beiträge',exact:true})).toBeVisible();await page.locator('.header').getByRole('button',{name:'Beitragen',exact:true}).click();
 const dialog=page.getByRole('dialog'),kind=dialog.getByRole('combobox').first();await kind.click();await page.getByRole('option',{name:'Zungenknoten',exact:true}).click();
 await expect(dialog.getByText('Optionale Zusatzinformationen',{exact:true})).toBeVisible();await expect(dialog.locator('[name="literal"]:visible')).toHaveCount(0);await expect(dialog.locator('[name="sense"]:visible')).toHaveCount(0);await expect(dialog.locator('[name="region"]:visible')).toHaveCount(0);await expect(dialog.getByText('Für einen Zungenknoten genügt der Satz oder die Aufnahme. Eine Bedeutung ist nicht erforderlich.')).toBeHidden();
 await dialog.getByText('Optionale Zusatzinformationen',{exact:true}).click();await expect(dialog.getByText('Für einen Zungenknoten genügt der Satz oder die Aufnahme. Eine Bedeutung ist nicht erforderlich.')).toBeVisible();
 await kind.click();await page.getByRole('option',{name:'Akademisch & alltäglich',exact:true}).click();await expect(dialog.getByText('Eine richtige Antwort und drei falsche Antworten. Im Spiel werden alle vier zufällig gemischt.')).toBeVisible();await expect(dialog.locator('input[type="radio"]')).toHaveCount(0);await expect(dialog.getByLabel('Richtige Antwort · DE',{exact:true})).toBeVisible();await expect(dialog.getByLabel('Falsche Antwort 3 · DE',{exact:true})).toBeVisible();await expect(dialog.locator('[name="literal"]:visible')).toHaveCount(0);await expect(dialog.getByText('Die richtige Antwort ist bereits die Lösung. Ergänze hier nur Hintergrundwissen, wenn es wirklich hilft.')).toBeVisible();
 await dialog.getByRole('button',{name:'Schließen',exact:true}).click();await page.getByRole('button',{name:'EN',exact:true}).click();await page.locator('.header').getByRole('button',{name:'Contribute',exact:true}).click();
 const englishDialog=page.getByRole('dialog'),englishKind=englishDialog.getByRole('combobox').first();await englishKind.click();await page.getByRole('option',{name:'Academic & everyday language',exact:true}).click();await englishDialog.getByText('Optional additional information',{exact:true}).click();
 await expect(englishDialog.getByText('How would you like to share the expression?')).toBeVisible();await expect(englishDialog.getByText('The correct answer already provides the solution. Add background only when it is genuinely useful.')).toBeVisible();
});
test('editing a legacy card shows its non-first correct answer in the dedicated solution field',async({page})=>{
 await mockSession(page);const source=manuelGameEntries[0];if(source.challenge?.type!=='relay')throw Error();
 const choices=[source.challenge.choices[1],source.challenge.choices[2],source.challenge.choices[0],source.challenge.choices[3]],entry={...source,challenge:{...source.challenge,choices,correctIndex:2}};
 await page.route('**/api/me/entries?*',route=>route.fulfill({json:{entries:[entry],more:false}}));await page.goto('/me');await page.getByRole('button',{name:'Bearbeiten',exact:true}).click();
 const dialog=page.getByRole('dialog');await expect(dialog.getByLabel('Richtige Antwort · DE',{exact:true})).toHaveValue(choices[2].de);await expect(dialog.getByLabel('Falsche Antwort 1 · DE',{exact:true})).toHaveValue(choices[0].de);await expect(dialog.locator('input[type="radio"]')).toHaveCount(0);
});
test('the start menu merges meanings and exposes word connections and borrowed-word categories',async({page})=>{
 await page.route('**/api/auth/get-session**',route=>route.fulfill({json:null}));const ready=page.waitForResponse(response=>response.url().includes('/api/auth/get-session'));await page.goto('/');await ready;await expect(page.getByRole('button',{name:'Anmelden',exact:true})).toBeVisible();await page.locator('.quick-start').getByRole('button',{name:'Raum erstellen',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.getByRole('combobox',{name:'Kategorie',exact:true}).click();await expect(page.getByRole('option',{name:'Ping! Verstanden?',exact:true})).toBeVisible();await page.getByRole('option',{name:'Generationenchat',exact:true}).click();
 await dialog.getByRole('combobox',{name:'Spielmodus',exact:true}).click();await expect(page.getByRole('option',{name:'Sag’s verständlich',exact:true})).toHaveCount(0);await page.getByRole('option',{name:'Wortverbindungen',exact:true}).click();await dialog.getByRole('combobox',{name:'Kategorie',exact:true}).click();await page.getByRole('option',{name:'Wortketten',exact:true}).click();await expect(dialog.getByText('1–10 Personen · Eigene Wörter · 45 Sekunden pro Zug')).toBeVisible();await expect(dialog.getByRole('combobox',{name:'Sprache des gemeinsamen Satzes',exact:true})).toBeVisible();
 await dialog.getByRole('combobox',{name:'Spielmodus',exact:true}).click();await page.getByRole('option',{name:'Spurensuche',exact:true}).click();await dialog.getByRole('combobox',{name:'Kategorie',exact:true}).click();await page.getByRole('option',{name:'Lehnwortreise',exact:true}).click();await expect(dialog.getByText('1–10 Personen · 4 Herkunftssprachen')).toBeVisible();
});
test('own suggestion statuses show feedback without exposing internal notes',async({page})=>{
 await mockSession(page);await page.route('**/api/me/entries?*',route=>route.fulfill({json:{entries:[],more:false}}));
 await page.route('**/api/me/suggestions?*',route=>route.fulfill({json:{suggestions:[{id:'1',entryId:'entry',phrase:'Ein Ausdruck',status:'accepted',createdAt:'2026-10-17T12:00:00Z',reviewedAt:'2026-10-17T13:00:00Z',feedback:'Danke für die Korrektur.'}],more:false}}));
 await page.goto('/me');await page.getByRole('button',{name:'Verbesserungsvorschläge',exact:true}).click();await expect(page.getByText('Übernommen',{exact:true})).toBeVisible();await expect(page.getByText('Danke für die Korrektur.')).toBeVisible();
 await page.getByRole('button',{name:'EN',exact:true}).click();await expect(page.getByText('Accepted',{exact:true})).toBeVisible();
});
test('own contribution search reaches the server and resets pagination',async({page})=>{
 await mockSession(page);const entry=manuelGameEntries[0],requests:{q:string;offset:string|null}[]=[];
 await page.route('**/api/me/entries?*',route=>{const params=new URL(route.request().url()).searchParams,q=params.get('q')??'';requests.push({q,offset:params.get('offset')});return route.fulfill({json:{entries:q==='nichts'?[]:[entry],more:!q}});});
 await page.goto('/me');await expect(page.getByRole('heading',{name:entry.phrase,exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Weiter',exact:true}).click();await expect.poll(()=>requests.at(-1)?.offset).toBe('30');
 await page.getByRole('searchbox',{name:'Eigene Beiträge durchsuchen'}).fill('nichts');await expect(page.getByText('Keine eigenen Beiträge zu dieser Suche gefunden.')).toBeVisible();expect(requests.at(-1)).toEqual({q:'nichts',offset:'0'});
 await page.getByRole('searchbox',{name:'Eigene Beiträge durchsuchen'}).fill('');await expect(page.getByRole('heading',{name:entry.phrase,exact:true})).toBeVisible();
});
test('audio is cropped before upload and an uploaded clip can be trimmed again',async({page})=>{
 await mockSession(page);const durations:number[]=[],amplitudes:number[]=[];
 await page.route('**/api/audio',async route=>{if(route.request().method()==='POST'){const bytes=route.request().postDataBuffer()!,meta=validateAudioWave(bytes);durations.push(meta.durationMs);amplitudes.push(bytes.readInt16LE(44+audioSampleRate/10*2)/32767);return route.fulfill({json:{audio:{id:crypto.randomUUID(),durationMs:meta.durationMs}}});}return route.fulfill({json:{available:true}});});
 await page.route('**/api/audio/*',route=>route.fulfill({json:{removed:true}}));
 await page.goto('/');await expect(page.getByRole('link',{name:'Meine Beiträge',exact:true})).toBeVisible();await page.locator('.header').getByRole('button',{name:'Beitragen',exact:true}).click();const dialog=page.getByRole('dialog');
 await dialog.getByRole('checkbox',{name:'Audio',exact:true}).check();
 const samples=Float32Array.from({length:audioSampleRate*3},(_,index)=>index<audioSampleRate?0.1:0.4);
 await dialog.locator('input[type=file]').setInputFiles({name:'qa-trim.wav',mimeType:'audio/wav',buffer:Buffer.from(encodeAudioWave(samples))});
 await expect(dialog.getByRole('spinbutton',{name:'Anfang (Sekunden)',exact:true})).toBeVisible();expect(durations).toEqual([]);
 await dialog.getByRole('spinbutton',{name:'Anfang (Sekunden)',exact:true}).fill('1');await dialog.getByRole('spinbutton',{name:'Ende (Sekunden)',exact:true}).fill('2');
 await dialog.getByRole('button',{name:'Ausschnitt übernehmen',exact:true}).click();await expect(dialog.getByRole('button',{name:'Audio zuschneiden',exact:true})).toBeVisible();expect(durations).toEqual([1000]);expect(amplitudes[0]).toBeCloseTo(0.4,2);
 await dialog.getByRole('button',{name:'Audio zuschneiden',exact:true}).click();await expect(dialog.getByRole('spinbutton',{name:'Ende (Sekunden)',exact:true})).toHaveValue('1');
 await dialog.getByRole('spinbutton',{name:'Ende (Sekunden)',exact:true}).fill('0.5');await dialog.getByRole('button',{name:'Ausschnitt übernehmen',exact:true}).click();await expect.poll(()=>durations).toEqual([1000,500]);
});

test.beforeEach(async({page})=>{await page.route("**/api/admin/reports?*",route=>route.fulfill({json:{reports:[]}}));});
