const KEY="taskLog.v1";
let tasks=[];
try{tasks=JSON.parse(localStorage.getItem(KEY)||"[]");if(!Array.isArray(tasks))tasks=[]}catch(e){tasks=[]}
const $=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,"0");
const isoDate=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const hm=d=>pad(d.getHours())+":"+pad(d.getMinutes());
const today=isoDate(new Date());
const PER=10;
let page=1,editKey=null,curItems=[];
const picked=new Set();

// Popup that asks the person to type the ID (or DELETE) before a delete goes ahead
function askConfirm(title,text,expected){
  return new Promise(res=>{
    const d=$("dlg"),inp=$("dlgInput"),ok=$("dlgOk");
    let result=false;
    $("dlgTitle").textContent=title;$("dlgText").textContent=text;
    $("dlgLabel").textContent="Type \""+expected+"\" to confirm";
    inp.value="";ok.disabled=true;
    inp.oninput=()=>{ok.disabled=inp.value.trim()!==expected};
    inp.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();ok.click()}};
    ok.onclick=()=>{if(inp.value.trim()===expected){result=true;d.close()}};
    $("dlgCancel").onclick=()=>d.close();
    d.addEventListener("close",()=>res(result),{once:true});
    d.showModal();inp.focus();
  });
}

$("date").min=today;           // yesterday and earlier cannot be picked
$("date").value=today;

function persist(){try{localStorage.setItem(KEY,JSON.stringify(tasks));return true}catch(e){return false}}
function msg(t,err){const m=$("msg");m.textContent=t;m.className="msg"+(err?" err":"")}

// Extract ID from the pasted link: .../id/1466628376/...
function extractId(s){
  const m=s.match(/\/id\/(\d+)/i)||s.match(/[?&]id=(\d+)/i);
  return m?m[1]:"";
}
function onLink(){
  const id=extractId($("link").value);
  if(id){$("tid").value=id;msg("ID "+id+" found in the link")}
  else if($("link").value.trim()){msg("No ID found in this link. Type it in the ID field.",true)}
}
$("link").addEventListener("input",onLink);
$("link").addEventListener("paste",()=>setTimeout(onLink,0));
$("now").onclick=()=>{$("start").value=hm(new Date())};

function resetForm(){
  editKey=null;
  ["link","tid","start"].forEach(k=>$(k).value="");
  $("status").value="Submitted";$("date").min=today;$("date").value=today;
  $("end").value="Set on submit";
  $("submitBtn").textContent="Submit task";$("cancelEdit").hidden=true;
}
function startEdit(t){
  editKey=t.created;
  $("link").value=t.link;$("tid").value=t.id;$("date").min="";$("date").value=t.date;
  $("start").value=t.start;$("status").value=t.status;$("end").value=t.end;
  $("submitBtn").textContent="Update task";$("cancelEdit").hidden=false;
  msg("Editing task "+t.id+". End time stays as saved.");
  $("form").scrollIntoView({behavior:"smooth",block:"start"});
}
$("cancelEdit").onclick=()=>{resetForm();msg("Edit cancelled")};

function updateSel(items){
  const n=tasks.filter(t=>picked.has(t.created)).length;
  $("delSel").textContent="Delete selected ("+n+")";$("delSel").disabled=n===0;
  $("selAll").checked=items.length>0&&items.every(x=>picked.has(x.t.created));
}
$("selAll").onchange=e=>{curItems.forEach(x=>e.target.checked?picked.add(x.t.created):picked.delete(x.t.created));draw()};
$("delSel").onclick=async()=>{
  const n=picked.size;if(!n)return;
  const ids=tasks.filter(t=>picked.has(t.created)).map(t=>t.id);
  const shown=ids.slice(0,10).join(", ")+(ids.length>10?" and "+(ids.length-10)+" more":"");
  if(!await askConfirm("Delete "+n+" selected task"+(n>1?"s":"")+"?","IDs: "+shown+". This cannot be undone.",n===1?ids[0]:"DELETE"))return;
  tasks=tasks.filter(t=>!picked.has(t.created));
  if(picked.has(editKey))resetForm();
  picked.clear();persist();draw();
};

$("form").addEventListener("submit",e=>{
  e.preventDefault();
  const id=$("tid").value.trim(),date=$("date").value;
  if(!/^\d+$/.test(id)){msg("ID must be numbers only.",true);return}
  const editing=editKey!==null?tasks.find(t=>t.created===editKey):null;
  if(date<today&&!(editing&&editing.date===date)){msg("Pick today or a later date.",true);return}
  if(editing){
    Object.assign(editing,{id,link:$("link").value.trim(),date,start:$("start").value,status:$("status").value});
    const ok=persist();msg(ok?"Task "+id+" updated":"Could not save in this browser",!ok);
    resetForm();draw();return;
  }
  const end=hm(new Date());                       // current time at submit
  $("end").value=end;
  if(tasks.some(t=>t.id===id&&t.date===date)&&!confirm("ID "+id+" is already logged for "+date+". Add it again?"))return;
  tasks.unshift({id,link:$("link").value.trim(),date,start:$("start").value,end,status:$("status").value,created:Date.now()});
  msg(persist()?"Saved. End time "+end:"Could not save in this browser",!persist());
  $("link").value="";$("tid").value="";$("start").value="";$("status").value="Submitted";
  setTimeout(()=>{if(editKey===null)$("end").value="Set on submit"},1500);
  page=1;draw();
});

function draw(){
  const f=$("filter").value;
  const list=tasks.map((t,i)=>({t,i})).filter(x=>!f||x.t.date===f);
  const pages=Math.max(1,Math.ceil(list.length/PER));
  if(page>pages)page=pages;
  const start=(page-1)*PER;
  const pageItems=list.slice(start,start+PER);
  curItems=pageItems;
  $("empty").hidden=list.length>0;
  const tb=$("rows");tb.innerHTML="";
  pageItems.forEach(({t,i})=>{
    const tr=document.createElement("tr");
    const cell=(v)=>{const td=document.createElement("td");td.textContent=v;return td};
    const cTd=document.createElement("td"),cb=document.createElement("input");
    cb.type="checkbox";cb.style.width="auto";cb.checked=picked.has(t.created);cb.setAttribute("aria-label","Select task "+t.id);
    cb.onchange=()=>{cb.checked?picked.add(t.created):picked.delete(t.created);updateSel(pageItems)};
    cTd.append(cb);
    tr.append(cTd,cell(t.id),cell(t.date),cell(t.start),cell(t.end));
    const sTd=document.createElement("td"),sel=document.createElement("select");
    ["Submitted","Pending"].forEach(o=>{const op=new Option(o,o,false,o===t.status);sel.add(op)});
    sel.className=t.status==="Submitted"?"pill-S":"pill-P";
    sel.onchange=()=>{tasks[i].status=sel.value;persist();draw()};
    sTd.append(sel);tr.append(sTd);
    const lTd=document.createElement("td");
    if(/^https?:\/\//i.test(t.link)){const a=document.createElement("a");a.href=t.link;a.target="_blank";a.rel="noopener noreferrer";a.textContent="Open";lTd.append(a)}
    tr.append(lTd);
    const aTd=document.createElement("td");
    const ed=document.createElement("button");ed.type="button";ed.className="rowbtn";ed.textContent="Edit";ed.onclick=()=>startEdit(t);
    const del=document.createElement("button");del.type="button";del.className="rowbtn";del.textContent="Delete";
    del.onclick=async()=>{
      const ok=await askConfirm("Delete task "+t.id+"?","Date "+t.date+", "+t.start+" to "+t.end+". This cannot be undone.",t.id);
      if(!ok)return;
      const k=tasks.findIndex(x=>x.created===t.created);if(k>-1)tasks.splice(k,1);
      picked.delete(t.created);persist();if(editKey===t.created)resetForm();draw();
    };
    aTd.append(ed,del);tr.append(aTd);tb.append(tr);
  });
  updateSel(pageItems);
  const pg=$("pager");pg.innerHTML="";
  if(list.length>PER){
    const info=document.createElement("span");info.className="hint";
    info.textContent="Showing "+(start+1)+"–"+Math.min(start+PER,list.length)+" of "+list.length;
    const mk=(label,p,dis,cur)=>{const b=document.createElement("button");b.type="button";b.textContent=label;b.disabled=dis;if(cur){b.className="primary";b.setAttribute("aria-current","page")}b.onclick=()=>{page=p;draw()};return b};
    pg.append(info,mk("Prev",page-1,page===1));
    for(let p=1;p<=pages;p++)pg.append(mk(String(p),p,false,p===page));
    pg.append(mk("Next",page+1,page===pages));
  }
}
$("filter").onchange=()=>{page=1;draw()};
$("clearFilter").onclick=()=>{$("filter").value="";page=1;draw()};
$("csv").onclick=()=>{
  const q=v=>'"'+String(v).replace(/"/g,'""')+'"';
  const rows=[["ID","Task Link","Date","Start time","End time","Status"],...tasks.map(t=>[t.id,t.link,t.date,t.start,t.end,t.status])];
  const blob=new Blob([rows.map(r=>r.map(q).join(",")).join("\n")],{type:"text/csv"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="task-log.csv";a.click();
};
draw();
