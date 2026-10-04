import { describe, expect, test as bunTest } from 'bun:test'
import type { QueryResultRow } from 'pg'
import { runWithSqlFixture, setSqlFixture } from '../sql-fixture.js'

function test(name:string,body:()=>Promise<void>):void { bunTest(name,()=>runWithSqlFixture(body)) }

type Member = { telegram_chat_id:string;can_update:boolean;can_manage_roles:boolean }
type Command = { command:string;description:string;is_ephemeral?:boolean }
const members: Member[]=[]
const calls: Array<{method:string;body:Record<string,unknown>}> = []
const menus = new Map<string,Command[]>()
let failReads=false
let onlyRestricted=false

function scopeKey(scope: Record<string,unknown>|undefined): string {
  if(!scope) return 'default'
  return `${String(scope.type)}:${String(scope.chat_id??'')}:${String(scope.user_id??'')}`
}
function configureSqlFixture():void {
  setSqlFixture({queryRows:async(text:string,values:readonly unknown[]=[])=>{
    if(text.includes('FROM public.telegram_groups')) return [{chat_id:'-1001',workspace_id:'workspace-1'}] as QueryResultRow[]
    if(text.includes('FROM public.workspace_users')) return members.filter(member=>!values[1]||member.telegram_chat_id===String(values[1])) as QueryResultRow[]
    return []
  }})
}
const {syncManagementCommands}=await import('../../../../../apps/api/server/scheduled-messages/commands')

function fixture(options:{failReads?:boolean;onlyRestricted?:boolean}={}) {
  configureSqlFixture()
  members.splice(0,members.length,
    {telegram_chat_id:'456',can_manage_roles:true,can_update:true},
    {telegram_chat_id:'789',can_manage_roles:false,can_update:true},
    {telegram_chat_id:'987',can_manage_roles:false,can_update:false},
  )
  calls.length=0;menus.clear();failReads=options.failReads??false;onlyRestricted=options.onlyRestricted??false
  const previous=globalThis.fetch
  const previousToken=process.env.TELEGRAM_BOT_TOKEN
  process.env.TELEGRAM_BOT_TOKEN='test-bot-token'
  globalThis.fetch=async(input,init)=>{
    const url=String(input),method=url.split('/').at(-1)??'',body=typeof init?.body==='string'?JSON.parse(init.body) as Record<string,unknown>:{}
    calls.push({method,body})
    if(method==='getMyCommands') return failReads?new Response(JSON.stringify({ok:false,error_code:500,description:'failed'}),{status:500}):new Response(JSON.stringify({ok:true,result:menus.get(scopeKey(body.scope as Record<string,unknown>|undefined))??(onlyRestricted?[{command:'manage_messages',description:'old'},{command:'register_group',description:'old'}]:[{command:'help',description:'Group help'},{command:'status',description:'Status'},{command:'about',description:'About'}])}))
    if(method==='setMyCommands') { menus.set(scopeKey(body.scope as Record<string,unknown>|undefined),body.commands as Command[]);return new Response(JSON.stringify({ok:true,result:true})) }
    return new Response(JSON.stringify({ok:false,error_code:500,description:'unexpected'}),{status:500})
  }
  return {restore(){globalThis.fetch=previous;if(previousToken===undefined)delete process.env.TELEGRAM_BOT_TOKEN;else process.env.TELEGRAM_BOT_TOKEN=previousToken},menu(scope:string,userId?:number){return (menus.get(scope==='default'?'default':`${scope}:-1001:${userId??''}`)??[]).map(item=>item.command)},commands(scope:string,userId:number){return menus.get(`${scope}:-1001:${userId}`)??[]}}
}

describe('Telegram group command menus',()=>{
  test('keeps public commands in role menus and applies MOC permissions',async()=>{
    const f=fixture();try{
      await expect(syncManagementCommands()).resolves.toEqual({failed:0})
      expect(f.menu('chat')).toEqual(['help','status','about'])
      expect(f.menu('chat_administrators')).toEqual(['help','status','about'])
      expect(f.menu('chat_member',456)).toEqual(['help','status','about','register_group','register_topic','manage_messages'])
      expect(f.menu('chat_member',789)).toEqual(['help','status','about','manage_messages'])
      expect(f.menu('chat_member',987)).toEqual(['help','status','about'])
      expect(f.commands('chat_member',456).find(command=>command.command==='manage_messages')?.is_ephemeral).toBe(true)
    }finally{f.restore()}
  })
  test('uses the current member permission when refreshing a single user',async()=>{
    const f=fixture();try{
      await syncManagementCommands()
      members[0]!.can_manage_roles=false;members[0]!.can_update=false
      await syncManagementCommands('workspace-1','456')
      expect(f.menu('chat_member',456)).toEqual(['help','status','about'])
    }finally{f.restore()}
  })
  test('leaves menus untouched when Telegram command reads fail',async()=>{
    const f=fixture({failReads:true});try{await expect(syncManagementCommands()).resolves.toEqual({failed:1});expect(calls.some(call=>call.method==='setMyCommands')).toBe(false)}finally{f.restore()}
  })
  test('removes legacy restricted registrations from broader scopes',async()=>{
    const f=fixture({onlyRestricted:true});try{await syncManagementCommands();expect(calls.some(call=>call.method==='setMyCommands')).toBe(true);expect(f.menu('default')).toEqual([])}finally{f.restore()}
  })
})
