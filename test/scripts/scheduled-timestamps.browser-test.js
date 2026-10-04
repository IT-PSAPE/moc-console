// Production Console with isolated local transport; no hosted changes.
async (page) => {
 if (!page.url().startsWith('http://127.0.0.1:5195/')) throw new Error('Use the isolated fixture on port 5195');
 await page.unrouteAll({behavior:'wait'});
 page.on('dialog', dialog => dialog.accept());
 let saved;
 let schedule;
 const templates=[];
 await page.route('**/fixture-api', async route => {
  const body=route.request().postDataJSON();
  if(body?.op==='template.save') {
   saved=body.data;
   templates.push({id:saved.creationId,name:saved.name,message_type:saved.messageType,fields:saved.fields,body:saved.body,audience:saved.audience,require_arrival:saved.requireArrival});
  }
  if(body?.op==='schedule.create') schedule=body.data;
  await route.fulfill({json:{templates,schedules:[],occurrences:[],groups:[{chat_id:'-100123',title:'Test group',telegram_group_topics:[]}],members:[],memberTypes:[{id:'members',name:'Members',is_default:true}]}});
 });
 await page.goto('http://127.0.0.1:5195/scheduled-messages/templates/new');
 await page.getByRole('textbox',{name:'Template name',exact:true}).fill('Expiry message');
 await page.getByRole('textbox',{name:'Default Title',exact:true}).fill('Sunday service');
 if(await page.locator('input[aria-label="Default Date"]').count()) throw new Error('Independent date field was not removed');
 const editor=page.getByRole('textbox',{name:'Rich text editor',exact:true});
 for(const name of ['date','time']) if(!await editor.locator('code[data-variable]').filter({hasText:new RegExp(`^${name}$`)}).count()) throw new Error(`${name} placeholder missing`);
    async function cursorAtEndOfVariable() {
        await editor.locator('code[data-variable]').first().evaluate(element => {
            element.closest('[contenteditable]').focus();
            const range = document.createRange();
            range.selectNodeContents(element);
            range.collapse(false);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            document.dispatchEvent(new Event('selectionchange'));
        });
    }
    await cursorAtEndOfVariable();
    await page.keyboard.press('Space');
    await page.keyboard.insertText('outside');
    if (await editor.locator('code[data-variable]').first().textContent() !== 'title') throw new Error('Space edited the variable name');
    await cursorAtEndOfVariable();
    await page.keyboard.press('Enter');
    await page.keyboard.insertText('new line');
    if (await editor.locator('code[data-variable]').first().textContent() !== 'title') throw new Error('Enter edited the variable name');
    await page.getByRole('button', { name: 'Source', exact: true }).click();
    const source = await page.getByRole('textbox', { name: 'Message template source', exact: true }).inputValue();
    if (!source.includes('{{title}}') || !source.includes('{{date}}') || !source.includes('outside') || !source.includes('new line')) throw new Error('Boundary typing broke the template');

 await page.getByRole('button',{name:'Save template',exact:true}).click();
 await page.waitForURL('**/scheduled-messages');
 if('date' in saved.fields || 'time' in saved.fields || !saved.body.includes('{{time}}')) throw new Error('Template persisted an independent lifecycle variable');
 await page.getByRole('button',{name:'Use template',exact:true}).click();
 await page.waitForURL('**/scheduled-messages/new?template=*');
 await page.getByRole('combobox',{name:'Telegram group',exact:true}).click();
 await page.getByRole('option',{name:'Test group',exact:true}).click();
 await page.getByLabel('Send date and time date',{exact:true}).fill('2026-10-03');
 await page.getByLabel('Send date and time time',{exact:true}).fill('18:15');
 await page.getByLabel('Message expiry date',{exact:true}).fill('2026-10-04');
 await page.getByLabel('Message expiry time',{exact:true}).fill('07:30');
 await page.getByRole('combobox',{name:'Repeat',exact:true}).click();
 await page.getByRole('option',{name:'Daily',exact:true}).click();
 await page.getByRole('button',{name:'Preview message',exact:true}).click();
 if(!(await page.getByText('431004 07:30',{exact:false}).count())) throw new Error('Preview did not derive expiry date/time');
 await page.getByRole('button',{name:'Review schedule',exact:true}).click();
 const dialog=page.getByRole('alertdialog');
 await dialog.getByRole('button',{name:'Schedule message',exact:true}).click();
 await page.waitForURL('**/scheduled-messages');
 if(schedule.startsOn!=='2026-10-03T16:15:00.000Z' || schedule.expiresAt!=='2026-10-04T05:30:00.000Z' || schedule.frequency!=='daily') throw new Error(`Wrong scheduled timestamps: ${JSON.stringify(schedule)}`);
 await page.getByRole('tab',{name:'Templates',exact:true}).click();
 await page.getByRole('button',{name:'Use template',exact:true}).click();
 await page.setViewportSize({width:375,height:812});
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw new Error('Date/time controls overflow mobile');
 await page.screenshot({path:'output/playwright/scheduled-timestamps-mobile.png',fullPage:true});
 return 'Expiry-derived date/time, native controls, UTC schedule submission, token boundary typing and mobile layout passed';
}
