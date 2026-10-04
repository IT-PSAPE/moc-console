import { expect, test } from 'bun:test'
import handler from '../../../../../../apps/api/server/handlers/cron/scheduled-messages'
import config from '../../../../../../apps/api/vercel.json'

test('scheduled cron rejects unsigned calls and non-GET requests before touching the database', async () => {
 const prior=process.env.CRON_SECRET
 process.env.CRON_SECRET='test-cron-secret'
 try {
  for (const request of [{method:'GET',headers:{}},{method:'GET',headers:{authorization:'Bearer wrong'}},{method:'POST',headers:{authorization:'Bearer test-cron-secret'}}]) {
   let status=0
   const response={status(code:number){status=code;return response},json(){},setHeader(){}}
   await handler(request,response)
   expect(status).toBe(request.method==='POST'?405:401)
  }
 } finally { if(prior===undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET=prior }
})
test('Hobby configuration checks every hour using once-daily jobs, keeping the other jobs', () => {
 const jobs=config.crons.filter(job=>job.path==='/api/cron/scheduled-messages')
 expect(jobs.map(job=>job.schedule)).toEqual(Array.from({length:24},(_,hour)=>`0 ${hour} * * *`))
 expect(config.crons.length).toBeLessThanOrEqual(100)
 expect(config.crons.filter(job=>job.path!=='/api/cron/scheduled-messages')).toHaveLength(3)
})

test('authorized hourly worker prepares occurrences then selects only due scheduled deliveries', async () => {
 const priorFetch=globalThis.fetch
 const prior={secret:process.env.CRON_SECRET,url:process.env.VITE_SUPABASE_URL,key:process.env.SUPABASE_SECRET_KEY}
 const calls:URL[]=[]
 process.env.CRON_SECRET='test-cron-secret'
 process.env.VITE_SUPABASE_URL='https://supabase.test'
 process.env.SUPABASE_SECRET_KEY='test-key'
 globalThis.fetch=async input=>{
  const url=new URL(String(input));calls.push(url)
  return new Response(JSON.stringify(url.pathname.includes('/rpc/')?null:[]),{headers:{'content-type':'application/json'}})
 }
 try {
  let status=0
  const response={status(code:number){status=code;return response},json(){},setHeader(){}}
  await handler({method:'GET',headers:{authorization:'Bearer test-cron-secret'}},response)
  expect(status).toBe(200)
  expect(calls.slice(0,2).map(url=>url.pathname.split('/').at(-1))).toEqual(['recover_scheduled_deliveries','prepare_scheduled_messages'])
  const queue=calls.find(url=>url.searchParams.get('select')==='id')
  expect(queue?.searchParams.get('scheduled_occurrence_id')).toBe('not.is.null')
  expect(queue?.searchParams.get('next_attempt_at')).toStartWith('lte.')
 } finally {
  globalThis.fetch=priorFetch
  for(const [key,value] of Object.entries({CRON_SECRET:prior.secret,VITE_SUPABASE_URL:prior.url,SUPABASE_SECRET_KEY:prior.key})) {if(value===undefined) delete process.env[key];else process.env[key]=value}
 }
})
