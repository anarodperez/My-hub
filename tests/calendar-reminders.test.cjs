const {test}=require('node:test');
const assert=require('node:assert/strict');
const {reminderDate,createReminderManager}=require('../src/features/hub/calendar-reminders.ts');
function setup(){const rows=new Map();let permission=true;const api={list:async()=>[...rows.values()],cancel:async id=>rows.delete(id),schedule:async row=>rows.set(row.id,row),permission:async()=>permission};return {manager:createReminderManager(api,()=>new Date(2026,9,15,12)),rows,deny:()=>permission=false};}
const event={id:'event',title:'Plan',date:'2026-10-25'};
test('fecha local a las nueve, dia anterior civil y fechas invalidas',()=>{
 assert.equal(reminderDate('2026-10-25',1).getHours(),9);
 assert.equal(reminderDate('2026-10-25',1).getDate(),24);
 assert.throws(()=>reminderDate('2026-02-30',0));
});
test('un solo aviso por cuenta y evento, cancelacion explicita',async()=>{
 const {manager,rows}=setup();await manager.sync('a',[event]);await manager.set('a',event,0);await manager.set('a',event,1);
 assert.equal(rows.size,1);assert.equal([...rows.values()][0].lead,1);
 await manager.set('a',event,null);assert.equal(rows.size,0);
});
test('ediciones actualizan aviso; borrar evento y cerrar sesion cancelan',async()=>{
 const {manager,rows}=setup();await manager.sync('a',[event]);await manager.set('a',event,0);
 await manager.sync('a',[{...event,title:'Nuevo',date:'2026-10-28'}]);assert.equal([...rows.values()][0].title,'Nuevo');assert.equal([...rows.values()][0].date,'2026-10-28');
 await manager.sync('a',[]);assert.equal(rows.size,0);
 await manager.set('a',event,0);await manager.sync(undefined);assert.equal(rows.size,0);
});
test('no programa sin permiso, en pasado ni para otra cuenta',async()=>{
 const {manager,rows,deny}=setup();await manager.sync('a',[event]);
 await assert.rejects(manager.set('b',event,0));
 await assert.rejects(manager.set('a',{...event,date:'2026-10-14'},0));
 deny();await assert.rejects(manager.set('a',event,0));assert.equal(rows.size,0);
});
test('cambio de cuenta durante permiso no deja avisos antiguos',async()=>{
 const rows=new Map();let release;const manager=createReminderManager({list:async()=>[...rows.values()],cancel:async id=>rows.delete(id),schedule:async row=>rows.set(row.id,row),permission:()=>new Promise(resolve=>release=resolve)},()=>new Date(2026,9,15));
 await manager.sync('a',[event]);const pending=manager.set('a',event,0);await new Promise(resolve=>setImmediate(resolve));const switched=manager.sync('b',[]);release(true);await assert.rejects(pending);await switched;assert.equal(rows.size,0);
});
