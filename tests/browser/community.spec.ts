import {test,expect,type Page} from '@playwright/test';
async function mockSession(page:Page){
 await page.route('**/api/auth/get-session**',route=>route.fulfill({json:{session:{id:'browser-session',userId:'browser-user',expiresAt:'2099-01-01T00:00:00Z',token:'browser-test-only'},user:{id:'browser-user',name:'Browser QA',email:'qa@sprachwelten.invalid',emailVerified:false,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z'}}}));
 await page.route('**/api/admin/access',route=>route.fulfill({json:{isAdmin:false}}));
 await page.route('**/api/audio',route=>route.fulfill({json:{available:false}}));
 await page.route('**/api/entries/duplicates?*',route=>route.fulfill({json:{duplicate:null}}));
}
test('half the game cards, expandable explanations, language and mobile login',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'Anmelden',exact:true})).toBeVisible();
 await expect(page.locator('.mode-card')).toHaveCount(4);await page.locator('.show-more-modes').click();await expect(page.locator('.mode-card')).toHaveCount(8);
 await page.getByRole('button',{name:'EN',exact:true}).click();await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Start game',exact:true})).toBeVisible();
});
test('region failure retains defaults, retry restores registry and selection closes',async({page})=>{
 await mockSession(page);let attempts=0;await page.route('**/api/regions',route=>{attempts++;return route.fulfill(attempts===1?{status:503,json:{error:'Unavailable'}}:{json:{regions:{'custom-test':{de:'Testregion',en:'Test region'}}}});});
 await page.goto('/');await expect(page.getByRole('link',{name:'Meine Beiträge',exact:true})).toBeVisible();await page.getByRole('button',{name:'Eigenen Ausdruck teilen',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.getByRole('combobox').first().click();await page.getByRole('option',{name:'Dialekt',exact:true}).click();
 await expect(dialog.getByText('Die Regionen konnten nicht geladen werden. Die Standardregionen bleiben verfügbar.')).toBeVisible();
 await dialog.getByRole('combobox',{name:'Region',exact:true}).click();await page.getByRole('option',{name:'Österreich',exact:true}).click();await expect(page.getByRole('listbox')).toHaveCount(0);
 await dialog.getByRole('button',{name:'Erneut versuchen',exact:true}).click();await expect(dialog.getByText('Die Regionen konnten nicht geladen werden. Die Standardregionen bleiben verfügbar.')).toHaveCount(0);
 await dialog.getByRole('combobox',{name:'Region',exact:true}).click();await page.getByRole('option',{name:'Testregion',exact:true}).click();await expect(page.getByRole('listbox')).toHaveCount(0);
 await dialog.locator('[name="phrase"]').fill('Ein Testwort');await dialog.getByRole('button',{name:'Beitrag veröffentlichen',exact:true}).click();await expect(dialog.locator('[name="literal"]')).toBeFocused();
});
test('own suggestion statuses show feedback without exposing internal notes',async({page})=>{
 await mockSession(page);await page.route('**/api/me/entries?*',route=>route.fulfill({json:{entries:[],more:false}}));
 await page.route('**/api/me/suggestions?*',route=>route.fulfill({json:{suggestions:[{id:'1',entryId:'entry',phrase:'Ein Ausdruck',status:'accepted',createdAt:'2026-10-17T12:00:00Z',reviewedAt:'2026-10-17T13:00:00Z',feedback:'Danke für die Korrektur.'}],more:false}}));
 await page.goto('/me');await page.getByRole('button',{name:'Verbesserungsvorschläge',exact:true}).click();await expect(page.getByText('Übernommen',{exact:true})).toBeVisible();await expect(page.getByText('Danke für die Korrektur.')).toBeVisible();
 await page.getByRole('button',{name:'EN',exact:true}).click();await expect(page.getByText('Accepted',{exact:true})).toBeVisible();
});
