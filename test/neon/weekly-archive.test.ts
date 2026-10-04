import { expect, test as bunTest } from 'bun:test'
import { runWithSqlFixture, setSqlFixture } from '../apps/api/server/sql-fixture.js'

function test(name:string,body:()=>Promise<void>):void { bunTest(name,()=>runWithSqlFixture(body)) }
const {default:handler}=await import('../../neon/functions/weekly-archive.js')
function payload() { return {version:1,invocation_id:'archive-invoke-1',trigger:{type:'schedule',id:'archive-trigger',name:'moc-weekly-archive'},data:{}} }

test('weekly archive rejects unsigned or mismatched requests before SQL work',async()=>{
  const sql:string[]=[]
  setSqlFixture({queryRows:async(text)=>{sql.push(text);return []}})
  const response=await handler(new Request('https://function.test/',{method:'POST',body:JSON.stringify(payload())}))
  expect(response.status).toBe(403)
  expect(sql).toEqual([])
})

test('weekly archive uses the archive functions under a verified trigger envelope',async()=>{
  const sql:string[]=[]
  setSqlFixture({queryRows:async(text)=>{sql.push(text);return text.includes('archive_completed_requests')?[{count:'2'}]:[{count:'3'}]}})
  const response=await handler(new Request('https://function.test/',{
    method:'POST',headers:{'x-neon-trigger-invocation-id':'archive-invoke-1'},body:JSON.stringify(payload()),
  }))
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ok:true,invocationId:'archive-invoke-1',archivedRequests:2,archivedBookings:3})
  expect(sql).toEqual(['SELECT count(*)::text AS count FROM public.archive_completed_requests()','SELECT count(*)::text AS count FROM public.archive_returned_bookings()'])
})
