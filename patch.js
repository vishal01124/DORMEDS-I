const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// ─── 1. Replace vOrder with timeline version ─────────────────────
const oldVOrder = `  vOrder(id){
    const o=this.data.orders.find(o=>o.id===id);if(!o)return;
    this.showModal('Order \u2013 '+o.id,\`<div class="ic" style="margin-bottom:14px"><div class="icg"><div class="if"><label>Order ID</label><span style="font-family:monospace">\${o.id}</span></div><div class="if"><label>Date</label><span>\${o.date}</span></div><div class="if"><label>Pharmacy</label><span>\${o.phName}</span></div><div class="if"><label>Status</label><span>\${this.sbadge(o.status)}</span></div><div class="if"><label>Delivery</label><span>\${o.del==='free'?'Free':'Paid'}</span></div><div class="if"><label>Notes</label><span>\${o.notes||'\u2014'}</span></div></div></div><table><thead><tr><th>Drug</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>\${o.drugs.map(d=>\`<tr><td>\${d.name}</td><td>\${d.qty}</td><td>\u20b9\${d.up.toFixed(2)}</td><td>\u20b9\${d.tot.toFixed(2)}</td></tr>\`).join('')}<tr><td colspan="3" style="text-align:right;font-weight:700">Subtotal</td><td>\u20b9\${o.sub.toFixed(2)}</td></tr><tr><td colspan="3" style="text-align:right;font-weight:700">GST (5%)</td><td>\u20b9\${o.gst.toFixed(2)}</td></tr><tr><td colspan="3" style="text-align:right;font-weight:800;color:var(--txt)">Total</td><td style="font-weight:800;color:var(--acc)">\u20b9\${this.fmt(o.tot)}</td></tr></tbody></table>\`,
    \`<button class="btn btn-s" onclick="A.closeModal()">Close</button>\${o.status==='pending'?\`<button class="btn btn-ok" onclick="A.closeModal();A.approveOrd('\${o.id}')">Approve</button>\`:''}'\`);
  },`;

const newVOrder = `  vOrder(id){
    const o=this.data.orders.find(o=>o.id===id);if(!o)return;
    const isAdmin=this.st.role==='admin';
    const steps=['pending','approved','dispatched','delivered'],labels=['Placed','Approved','Dispatched','Delivered'],icons=['shopping_cart','check_circle','local_shipping','done_all'];
    const ci=steps.indexOf(o.status);
    const tl=steps.map((s,i)=>{const done=i<=ci,active=i===ci;return '<div style="display:flex;align-items:flex-start"><div style="display:flex;flex-direction:column;align-items:center;gap:6px;min-width:74px"><div style="width:38px;height:38px;border-radius:50%;background:'+(done?'var(--acc)':'var(--inp)')+';border:2px solid '+(done?'var(--acc)':'var(--bdr)')+';display:flex;align-items:center;justify-content:center;'+(active?'box-shadow:0 0 0 5px rgba(108,99,255,.2);':'')+'">'+'<span class="material-icons-round" style="font-size:18px;color:'+(done?'#fff':'var(--mute)')+'">'+icons[i]+'</span></div><div style="font-size:.7rem;font-weight:'+(active?700:400)+';color:'+(done?'var(--txt)':'var(--mute)')+';text-align:center">'+labels[i]+'</div></div>'+(i<3?'<div style="height:2px;width:32px;background:'+(i<ci?'var(--acc)':'var(--bdr)')+';margin-top:18px;flex-shrink:0"></div>':'')+'</div>';}).join('');
    const timeline='<div style="display:flex;align-items:flex-start;justify-content:center;gap:0;margin:20px 0 24px;overflow-x:auto;padding:4px 0">'+tl+'</div>';
    const tableRows=o.drugs.map(d=>'<tr><td>'+d.name+'</td><td>'+d.qty+'</td><td>\\u20b9'+(+d.up).toFixed(2)+'</td><td>\\u20b9'+(+d.tot).toFixed(2)+'</td></tr>').join('');
    const body=timeline+'<div class="ic" style="margin-bottom:14px"><div class="icg"><div class="if"><label>Order ID</label><span style="font-family:monospace">'+o.id+'</span></div><div class="if"><label>Date</label><span>'+o.date+'</span></div><div class="if"><label>Pharmacy</label><span>'+o.phName+'</span></div><div class="if"><label>Delivery</label><span>'+(o.del==='free'?'Free':'Paid')+'</span></div><div class="if"><label>Notes</label><span>'+(o.notes||'\\u2014')+'</span></div></div></div>'+'<table><thead><tr><th>Drug</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>'+tableRows+'<tr><td colspan="3" style="text-align:right;font-weight:700">Subtotal</td><td>\\u20b9'+(+o.sub).toFixed(2)+'</td></tr><tr><td colspan="3" style="text-align:right;font-weight:700">GST 5%</td><td>\\u20b9'+(+o.gst).toFixed(2)+'</td></tr><tr><td colspan="3" style="text-align:right;font-weight:800">Total</td><td style="font-weight:800;color:var(--acc)">\\u20b9'+this.fmt(o.tot)+'</td></tr></tbody></table>';
    let foot='<button class="btn btn-s" onclick="A.closeModal()">Close</button><button class="btn btn-s" onclick="A.downloadOrderPDF(\''+o.id+'\')"><span class="material-icons-round">download</span>PDF</button>';
    if(isAdmin&&o.status==='pending')foot+='<button class="btn btn-ok" onclick="A.closeModal();A.approveOrd(\''+o.id+'\')">Approve</button>';
    if(isAdmin&&o.status==='approved')foot+='<button class="btn btn-p" onclick="A.closeModal();A.dispatchOrd(\''+o.id+'\')">Dispatch</button>';
    if(isAdmin&&o.status==='dispatched')foot+='<button class="btn btn-ok" onclick="A.closeModal();A.deliverOrd(\''+o.id+'\')">Mark Delivered</button>';
    this.showModal('Order - '+o.id,body,foot,'mdl-lg');
  },`;

if (code.includes('vOrder(id)')) {
  // Find and replace from vOrder(id) to next function
  code = code.replace(/  vOrder\(id\)\{[\s\S]*?\n  \},\n/, newVOrder + '\n');
  console.log('vOrder replaced OK');
} else {
  console.log('ERROR: vOrder not found');
}

// ─── 2. Update rAnalytics to add export buttons + chart canvases ──
const oldAnalyticsBtn = `<button class="btn btn-p" onclick="A.addPharmacyModal()"><span class="material-icons-round">add</span>Add Tenant</button></div>`;
const newAnalyticsBtn = `<button class="btn btn-s" onclick="A.exportCSV('pharmacies')"><span class="material-icons-round">download</span>Pharmacies CSV</button><button class="btn btn-s" onclick="A.exportCSV('bills')"><span class="material-icons-round">download</span>Bills CSV</button><button class="btn btn-p" onclick="A.addPharmacyModal()"><span class="material-icons-round">add</span>Add Tenant</button></div>`;
code = code.replace(oldAnalyticsBtn, newAnalyticsBtn);
console.log('Analytics buttons updated');

// Add chart canvases after the KPI grid closing </div>
const oldKpiEnd = `    </div>\n    <div class="card" style="margin-top:14px"><div class="ch"><h3>Tenant Management</h3>`;
const newKpiEnd = `    </div>\n    <div class="cr" style="margin-top:14px"><div class="card"><div class="ch"><h3>Revenue by Pharmacy</h3></div><div class="cc"><canvas id="an-rev-chart"></canvas></div></div><div class="card"><div class="ch"><h3>Top Products Ordered</h3></div><div class="cc"><canvas id="an-prod-chart"></canvas></div></div></div>\n    <div class="card" style="margin-top:14px"><div class="ch"><h3>Tenant Management</h3>`;
code = code.replace(oldKpiEnd, newKpiEnd);
console.log('Analytics charts added');

// ─── 3. Update loadAnalytics to populate new charts ───────────────
const oldLoadAnalytics = `    set('an-ord',res.totalOrders+' total orders');
  },`;
const newLoadAnalytics = `    set('an-ord',res.totalOrders+' total orders');
    // Revenue by pharmacy chart
    const c1=Q('#an-rev-chart')?.getContext('2d');
    if(c1){const phs=this.data.pharmacies.slice(0,6);const revs=phs.map(p=>this.data.bills.filter(b=>b.phId===p.id&&b.status==='paid').reduce((s,b)=>s+b.amt,0));this.st.charts.ar=new Chart(c1,{type:'doughnut',data:{labels:phs.map(p=>p.name),datasets:[{data:revs,backgroundColor:['#6C63FF','#00D4FF','#00D48E','#FFB547','#FF4757','#3B82F6'],borderColor:'#0E1826',borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#7B9CC4'}}},cutout:'55%'}});}
    // Top products chart
    const c2=Q('#an-prod-chart')?.getContext('2d');
    if(c2){const pm={};this.data.orders.filter(o=>o.type==='inventory').forEach(o=>o.drugs.forEach(d=>{pm[d.name]=(pm[d.name]||0)+d.qty;}));const sorted=Object.entries(pm).sort((a,b)=>b[1]-a[1]).slice(0,6);this.st.charts.ap=new Chart(c2,{type:'bar',data:{labels:sorted.map(e=>e[0].split(' ').slice(0,2).join(' ')),datasets:[{label:'Units',data:sorted.map(e=>e[1]),backgroundColor:'rgba(108,99,255,.7)',borderColor:'#6C63FF',borderWidth:1,borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#7B9CC4'}},y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#7B9CC4'}}}}});}
  },`;
code = code.replace(oldLoadAnalytics, newLoadAnalytics);
console.log('loadAnalytics updated');

// ─── 4. Add exportCSV + downloadOrderPDF after loadAnalytics ──────
const insertAfterLoadAnalytics = `\n\n  exportCSV(type){\n    let rows=[],name=type+'.csv';\n    if(type==='orders'){rows=[['Order ID','Pharmacy','Date','Items','Subtotal','GST','Total','Status','Delivery']];this.data.orders.filter(o=>o.type==='inventory').forEach(o=>rows.push([o.id,o.phName,o.date,o.drugs.map(d=>d.name+'\xd7'+d.qty).join(';'),(+o.sub).toFixed(2),(+o.gst).toFixed(2),(+o.tot).toFixed(2),o.status,o.del]));name='orders.csv';}\n    else if(type==='bills'){rows=[['Bill ID','Pharmacy','Order','Amount','Date','Due','Status']];this.data.bills.forEach(b=>rows.push([b.id,b.phName,b.ordId,(+b.amt).toFixed(2),b.date,b.due,b.status]));name='bills.csv';}\n    else if(type==='pharmacies'){rows=[['ID','Name','Email','Contact','License','Plan','Status','Joined']];this.data.pharmacies.forEach(p=>rows.push([p.id,p.name,p.email,p.contact,p.license,p.plan?p.plan+'/mo':'None',p.status,p.joined]));name='pharmacies.csv';}\n    const csv=rows.map(r=>r.map(v=>'"'+String(v||'').replace(/"/g,'""')+'"').join(',')).join('\\n');\n    const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download=name;a.click();\n    this.toast('Downloaded!','ok',name);\n  },\n\n  downloadOrderPDF(id){\n    const o=this.data.orders.find(o=>o.id===id);if(!o)return;\n    const d=this.data.dist;\n    let c='PharmaDist Pro\\n'+(d.address||'')+'\\nGST: '+(d.gst||'')+'\\n\\nTAX INVOICE\\nOrder: '+o.id+'\\nDate: '+o.date+'\\nPharmacy: '+o.phName+'\\nStatus: '+o.status.toUpperCase()+'\\n\\n';\n    c+='Drug                                    Qty   Unit Price   Total\\n'+'='.repeat(65)+'\\n';\n    o.drugs.forEach(dr=>{ c+=(dr.name||'').padEnd(40)+String(dr.qty).padEnd(6)+('Rs'+(+dr.up).toFixed(2)).padEnd(13)+'Rs'+(+dr.tot).toFixed(2)+'\\n'; });\n    c+='='.repeat(65)+'\\n'+'Subtotal: Rs'+(+o.sub).toFixed(2)+'\\nGST(5%):  Rs'+(+o.gst).toFixed(2)+'\\nTOTAL:    Rs'+(+o.tot).toFixed(2)+'\\n';\n    const blob=new Blob([c],{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Invoice-'+o.id+'.txt';a.click();\n    this.toast('Invoice downloaded!','ok','Invoice-'+o.id+'.txt');\n  },\n`;

// Insert after the closing of loadAnalytics
code = code.replace(/(async loadAnalytics\(\)\{[\s\S]*?\n  \},)/, '$1' + insertAfterLoadAnalytics);
console.log('exportCSV + downloadOrderPDF added');

fs.writeFileSync('app.js', code, 'utf8');
console.log('All patches applied successfully!');
