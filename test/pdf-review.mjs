import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
const base='http://localhost:8787/api', headers={'Content-Type':'application/json',Origin:'http://localhost:5173'}
const demo=await(await fetch(`${base}/dev/demo`,{method:'POST',headers})).json()
const login=await fetch(`${base}/account/login`,{method:'POST',headers,body:JSON.stringify(demo.studio)})
headers.Cookie=login.headers.get('set-cookie').split(';')[0]
const get=async path=>await(await fetch(base+path,{headers})).json()
const types=await get('/studio/types'), links=await get('/studio/links')
const content='ssdoc:1:'+JSON.stringify({type:'doc',content:[{type:'heading',attrs:{level:2},content:[{type:'text',text:'Verification terms'}]},{type:'paragraph',content:[{type:'text',text:'Formatted agreement for {client}.',marks:[{type:'bold'}]}]},{type:'bulletList',content:[{type:'listItem',content:[{type:'paragraph',content:[{type:'text',text:'Payment within 15 days.'}]}]}]}]})
const res=await fetch(`${base}/studio/invoices`,{method:'POST',headers,body:JSON.stringify({linkId:links.find(x=>x.status==='active').id,typeId:types[0].id,theme:'classic',items:[{id:'review',desc:'Local PDF verification',qty:1,rate:10000}],fields:{},gstPct:0,discount:0,advance:0,issued:new Date().toISOString(),due:new Date(Date.now()+86400000).toISOString(),note:'',terms:[],extra:{customTerms:content,annexure:content}})})
assert(res.ok,await res.clone().text());const {id}=await res.json()
try {
 const pdf=await fetch(`${base}/studio/invoices/${id}/pdf`,{headers});assert(pdf.ok,await pdf.clone().text());const buffer=Buffer.from(await pdf.arrayBuffer());assert(buffer.subarray(0,5).toString()==='%PDF-');assert(buffer.length>10000);await writeFile('/tmp/shakeslip-ux-review/invoice.pdf',buffer);console.log(`PDF export passed (${buffer.length} bytes)`)
} finally {const removed=await fetch(`${base}/studio/invoices/${id}`,{method:'DELETE',headers});assert(removed.ok)}
