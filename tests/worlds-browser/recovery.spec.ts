import {test,expect} from '@playwright/test';

test('one-time recovery reuses native reset, keeps form state and translates notifications without creating a new account',async({page})=>{
 const calls:{path:string;body:Record<string,string>}[]=[];
 await page.route('**/api/**',route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  if(request.method()==='POST'){calls.push({path,body:request.postDataJSON()});return route.fulfill({json:{status:true}});}
  return route.fulfill({json:path.startsWith('/api/auth/')?null:{entries:[],available:false}});
 });
 await page.route('**/auth/status',route=>route.fulfill({json:{user:null,source:'anonymous'}}));
 await page.route('**/auth/worlds/recovery',route=>route.fulfill({json:{eligible:true}}));
 try{
  await page.goto('/worlds-migration?lang=en&next=%2Fme');
  let dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  await dialog.locator('input[name="email"]').fill('synthetic@fixture.invalid');
  await dialog.getByRole('button',{name:'Forgot your password?',exact:true}).click();
  await dialog.getByRole('button',{name:'Send link',exact:true}).click();
  await expect(dialog.getByRole('status')).toHaveText('If an account exists for this email, you will receive a reset link.');
  expect(calls).toHaveLength(1);expect(calls[0]).toEqual({path:'/api/auth/request-password-reset',body:{email:'synthetic@fixture.invalid',redirectTo:'http://localhost:5186/worlds-migration?lang=en&next=%2Fme'}});
  await dialog.getByRole('button',{name:'DE',exact:true}).click();
  await expect(dialog.getByRole('status')).toHaveText('Falls ein Konto mit dieser E-Mail existiert, erhältst du einen Link zum Zurücksetzen.');
  await expect(dialog.locator('input[name="email"]')).toHaveValue('synthetic@fixture.invalid');
  // Simulated reset delivery only. No email, real account or provider is used.
  await page.goto('/worlds-migration?lang=en&next=%2Fme&token=synthetic-reset-only');
  dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  await expect(page).not.toHaveURL(/token=/);
  await expect(dialog.locator('input[name="email"]')).toHaveCount(0);
  await dialog.locator('input[name="password"]').fill('Synthetic new password!');
  await dialog.getByRole('button',{name:'DE',exact:true}).click();
  await expect(dialog.locator('input[name="password"]')).toHaveValue('Synthetic new password!');
  await dialog.getByRole('button',{name:'Passwort speichern',exact:true}).click();
  await expect(dialog.getByRole('heading',{name:'Bisheriges Konto bestätigen'})).toBeVisible();
  await expect(dialog.getByRole('status')).toHaveText('Dein Passwort wurde geändert. Du kannst dich jetzt anmelden.');
  await dialog.getByRole('button',{name:'EN',exact:true}).click();
  await expect(dialog.getByRole('status')).toHaveText('Your password has been changed. You can sign in now.');
  expect(calls).toHaveLength(2);expect(calls[1]).toEqual({path:'/api/auth/reset-password',body:{newPassword:'Synthetic new password!',token:'synthetic-reset-only'}});
  await expect(dialog.getByRole('button',{name:'Create an account',exact:true})).toHaveCount(0);
  await expect(page.locator('a.login-button')).toHaveAttribute('href',/\/auth\/start\?/);
 }finally{await page.goto('about:blank');await page.unrouteAll({behavior:'wait'});}
});

test('missing or already linked central identity never opens the migration credential form; provider outages are visible',async({page})=>{
 let status=401,posts=0;
 await page.route('**/api/**',route=>{if(route.request().method()==='POST')posts++;return route.fulfill({json:null});});
 await page.route('**/auth/status',route=>route.fulfill({json:{user:null,source:'anonymous'}}));
 await page.route('**/auth/worlds/recovery',route=>route.fulfill({status,json:{eligible:false}}));
 try{
  for(const code of [401,409,503]){
   status=code;
   await page.goto('/worlds-migration?lang=en&next=https%3A%2F%2Fforeign.test&token=synthetic-expired-only');
   await expect(page.getByRole(code===503?'alert':'status')).toHaveText(code===503?'Your sign-in could not be checked. Please try again.':'Open your Worlds account to continue transferring your account or use your existing link.');
   await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('input[type="password"]')).toHaveCount(0);
   await expect(page).not.toHaveURL(/token=/);
   await expect(page.locator('main a')).toHaveAttribute('href','/auth/worlds-en?next=%2Fen%2Flearn');
  }
  expect(posts).toBe(0);
 }finally{await page.goto('about:blank');await page.unrouteAll({behavior:'wait'});}
});
