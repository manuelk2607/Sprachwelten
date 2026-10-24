import {test,expect,type Page} from '@playwright/test';
import {entryInput} from '../../lib/content';

async function setup(page:Page,signedIn=false){
 for(const [url,json] of [
  ['**/api/auth/get-session**',signedIn?{session:{id:'qa',userId:'qa'},user:{id:'qa',name:'QA',email:'qa@example.invalid'}}:null],
  ['**/api/admin/access',{isAdmin:false}],['**/api/audio',{available:false}],
  ['**/api/regions',{regions:{}}],['**/api/entries/duplicates?*',{duplicate:null}],
  ['**/api/translations',{available:signedIn}]
 ] as const) await page.route(url,r=>r.fulfill({json}));
 const ready=page.waitForResponse(r=>r.url().includes('/api/auth/get-session'));
 await page.goto('/');await ready;
 await page.locator('.header').getByRole('button',{name:'Beitragen',exact:true}).click();
 return page.getByRole('dialog');
}

test('searchable selectors announce the active option and allow Tab, Shift+Tab and Escape',async({page})=>{
 const d=await setup(page),trigger=d.getByRole('combobox').first();
 await trigger.click();
 const search=d.getByRole('combobox',{name:'Auswahl durchsuchen',exact:true});
 await expect(search).toBeFocused();await search.fill('Zungenknoten');
 await search.press('ArrowDown');
 const active=await search.getAttribute('aria-activedescendant');expect(active).toBeTruthy();
 await expect(page.locator('[id="'+active+'"]')).toHaveAttribute('role','option');
 await search.press('Enter');await expect(d.locator('[name=kind]')).toHaveValue('tongue_twister');
 await expect(trigger).toBeFocused();
 await trigger.click();await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
 await trigger.click();await page.keyboard.press('Tab');await expect(trigger).not.toBeFocused();
 await expect(page.getByRole('listbox')).toHaveCount(0);
 await trigger.click();await page.keyboard.press('Shift+Tab');await expect(d.getByRole('button',{name:'Schließen',exact:true})).toBeFocused();
});

test('language and dark mode stay usable when browser storage is blocked',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new DOMException('Blocked','SecurityError');};Storage.prototype.setItem=()=>{throw new DOMException('Blocked','SecurityError');};});
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const d=await setup(page);await d.getByRole('button',{name:'Schließen',exact:true}).click();
 await page.getByRole('button',{name:'EN',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 const before=await page.locator('html').getAttribute('data-theme');
 await page.locator('.theme-toggle').click();
 await expect(page.locator('html')).not.toHaveAttribute('data-theme',before!);
 expect(errors).toEqual([]);
});

test('restoring a German draft in an English interface preserves both language versions when publishing',async({page})=>{
 let d=await setup(page),saved:ReturnType<typeof entryInput.parse>|undefined;
 await d.getByRole('combobox').first().click();await page.getByRole('option',{name:'Wort',exact:true}).click();
 await d.locator('[name=phrase]').fill('Testwort');await d.locator('[name=literal]').fill('Eine deutsche Bedeutung');
 await d.locator('[name="translation.literal"]').fill('An English meaning');
 await d.getByLabel('Ich habe die zweite Sprachfassung geprüft.',{exact:true}).check();
 await expect(page.getByRole('status')).toContainText('Entwurf in diesem Browser gespeichert.');
 await d.getByRole('button',{name:'Schließen',exact:true}).click();
 await page.getByRole('button',{name:'EN',exact:true}).click();
 await page.locator('.header').getByRole('button',{name:'Contribute',exact:true}).click();d=page.getByRole('dialog');
 await d.getByRole('button',{name:'Restore draft',exact:true}).click();
 await expect(d.locator('[name=literal]')).toHaveValue('Eine deutsche Bedeutung');
 await expect(d.locator('[name="translation.literal"]')).toHaveValue('An English meaning');
 await page.route('**/api/entries',r=>{saved=entryInput.parse(r.request().postDataJSON());return r.fulfill({status:201,json:{entry:{id:'qa'}}});});
 await d.getByRole('button',{name:'Publish contribution',exact:true}).click();
 await expect.poll(()=>saved?.sourceLocale).toBe('de');expect(saved?.translation?.literal).toBe('An English meaning');
});

test('general translation previews keep an independent hint and reject late results after target edits',async({page})=>{
 const d=await setup(page,true);
 await d.getByRole('combobox').first().click();await page.getByRole('option',{name:'Dialekt',exact:true}).click();
 await d.locator('[name=hint]').fill('Ein Körperteil');
 await d.locator('.inline-hint-translation summary').click();
 await d.locator('[name="translation.hint"]').fill('A body part');
 await d.locator('[name=literal]').fill('Ein Kopf');
 const general=d.locator('.translation-editor:not(.inline-hint-translation)');
 const requests:Record<string,unknown>[]=[];
 await page.route('**/api/translations',r=>{requests.push(r.request().postDataJSON());return r.fulfill({json:{translation:{literal:'A head',hint:'Must not replace the hint'}}});});
 await general.getByRole('button',{name:'Übersetzung vorschlagen',exact:true}).click();
 await expect(general.locator('.answer-translation-preview')).toBeVisible();
 await expect(d.locator('[name="translation.literal"]')).toHaveValue('');
 await general.getByRole('button',{name:'Vorschlag übernehmen',exact:true}).click();
 await expect(d.locator('[name="translation.literal"]')).toHaveValue('A head');
 await expect(d.locator('[name="translation.hint"]')).toHaveValue('A body part');
 expect((requests[0].texts as Record<string,string>).hint).toBe('');
 let release!:()=>void;const pending=new Promise<void>(resolve=>release=resolve);
 let requested!:()=>void;const started=new Promise<void>(resolve=>requested=resolve);
 await page.route('**/api/translations',async r=>{requested();await pending;await r.fulfill({json:{translation:{literal:'Outdated head'}}});});
 await general.getByRole('button',{name:'Übersetzung vorschlagen',exact:true}).click();await started;
 await d.locator('[name="translation.literal"]').fill('My own translation');release();
 await expect(general.getByRole('alert')).toBeVisible();
 await expect(d.locator('[name="translation.literal"]')).toHaveValue('My own translation');
 await expect(general.locator('.answer-translation-preview')).toHaveCount(0);
});
