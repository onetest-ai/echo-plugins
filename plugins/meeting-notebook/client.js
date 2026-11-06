// Meeting Notebook — the client half (runs in the Echo window). An activity of its own, "Notebook": the
// Meeting Notebook artifact's three panes — folders (meeting types) | subfolders (client, person or series)
// with dated pages | the open page — its page editor (rich text, decisions, action items Claude can do or
// that are manual, my notes) and its views (open action items, last 14 days, a subfolder's overview).
//
// Pages live in the host half's store and go through `ctx.call`. The notebook keeps one root element for
// its whole life and moves it into Echo's page after each render, so typing is never redrawn away. Every
// class, id and data attribute is prefixed (nb-) because Echo's own page handles names like data-cmd.

const TYPE_ORDER = ['Client', 'Partner', '1:1', 'Internal', 'Industry & Analyst', 'Other']
const TYPE_COLOR = { Client: '--t-client', Partner: '--t-partner', '1:1': '--t-11', Internal: '--t-internal', 'Industry & Analyst': '--t-analyst', Other: '--t-other' }
const PALETTE = ['--t-client', '--t-partner', '--t-11', '--t-internal', '--t-analyst']
const ACTIVITY = 'meeting-notebook:notebook'
const BOOK = (s) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6z"/><path d="M6 3.5v17M3.5 7.5H6M3.5 12H6M3.5 16.5H6M10 8h5M10 11.5h5"/></svg>`

const CSS = `
.mnb-host{flex:1;min-height:0;display:flex}
.mnb{flex:1;min-width:0;min-height:0;display:flex;position:relative;
  --paper:#fbfafa;--sheet:#ffffff;--ink:#000000;--muted:#717171;--rule:rgba(0,0,0,.2);--hover:#f6f6f6;
  --accent:#0047ff;--accent-ink:#ffffff;--accent-soft:rgba(0,71,255,.07);--link:#0078c2;--ok:#03815b;--warn:#c50303;
  --band:#000000;--band-ink:#ffffff;--band-muted:#d8d3d3;--band-accent:#00f6ff;
  --t-client:#0047ff;--t-partner:#a84370;--t-11:#03815b;--t-internal:#107e8d;--t-analyst:#5b7812;--t-other:#717171;
  --hl-y:rgba(0,246,255,.35);--hl-g:rgba(0,255,211,.35);--hl-p:rgba(132,83,210,.25);
  --f-ui:"Museo Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --f-body:var(--f-ui);
  --f-mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  background:var(--paper);color:var(--ink);font-family:var(--f-ui);font-size:14px;line-height:1.45;letter-spacing:.02em}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .mnb{
  --paper:#000000;--sheet:#060606;--ink:#ffffff;--muted:#d8d3d3;--rule:rgba(255,255,255,.22);--hover:#161616;
  --accent:#00f6ff;--accent-ink:#000000;--accent-soft:rgba(0,246,255,.12);--link:#7ba8ff;--ok:#00f4ab;--warn:#ff4d40;
  --band:#161616;--band-ink:#ffffff;--band-muted:#d8d3d3;--band-accent:#00f6ff;
  --t-client:#00f6ff;--t-partner:#f6969c;--t-11:#00f4ab;--t-internal:#89f0f0;--t-analyst:#d5e662;--t-other:#d8d3d3;
  --hl-y:rgba(0,246,255,.3);--hl-g:rgba(0,244,171,.3);--hl-p:rgba(169,138,235,.35);color-scheme:dark}}
:root[data-theme="dark"] .mnb{
  --paper:#000000;--sheet:#060606;--ink:#ffffff;--muted:#d8d3d3;--rule:rgba(255,255,255,.22);--hover:#161616;
  --accent:#00f6ff;--accent-ink:#000000;--accent-soft:rgba(0,246,255,.12);--link:#7ba8ff;--ok:#00f4ab;--warn:#ff4d40;
  --band:#161616;--band-ink:#ffffff;--band-muted:#d8d3d3;--band-accent:#00f6ff;
  --t-client:#00f6ff;--t-partner:#f6969c;--t-11:#00f4ab;--t-internal:#89f0f0;--t-analyst:#d5e662;--t-other:#d8d3d3;
  --hl-y:rgba(0,246,255,.3);--hl-g:rgba(0,244,171,.3);--hl-p:rgba(169,138,235,.35);color-scheme:dark}
.mnb *{box-sizing:border-box}
.mnb [hidden]{display:none!important}
.mnb button,.mnb input,.mnb select,.mnb textarea{font:inherit;color:inherit}
.mnb button{cursor:pointer}
.mnb :focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.mnb .nb-app{--wt:clamp(190px,14vw,300px);--wb:clamp(250px,22vw,460px);flex:1;min-width:0;display:grid;grid-template-columns:var(--wt) var(--wb) minmax(0,1fr);height:100%;transition:grid-template-columns .18s}
.mnb .nb-app.ct{--wt:44px}.mnb .nb-app.cb{--wb:44px}
.mnb .nb-pane{min-width:0;min-height:0;overflow:auto;border-right:1px solid var(--rule)}
.mnb .nb-tabs{background:var(--paper);padding:16px 10px;display:flex;flex-direction:column;gap:4px}
.mnb .nb-brand{font-family:var(--f-body);font-weight:600;font-size:19px;padding:2px 8px 12px;letter-spacing:-.01em}
.mnb .nb-search{width:100%;padding:7px 10px;border:1px solid var(--rule);border-radius:6px;background:var(--sheet);margin-bottom:10px}
.mnb .nb-tab{display:flex;align-items:center;gap:10px;padding:8px 10px;border:0;background:none;border-radius:6px;text-align:left;width:100%}
.mnb .nb-tab:hover{background:var(--hover)}
.mnb .nb-tab.on{background:var(--sheet);box-shadow:0 0 0 1px var(--rule)}
.mnb .nb-tab .sw{width:4px;height:18px;border-radius:2px;background:var(--c,var(--t-other));flex:none}
.mnb .nb-tab .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mnb .nb-tab .ct{font-family:var(--f-mono);font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
.mnb .nb-lbl{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);padding:14px 10px 6px}
.mnb .nb-newbtn{margin-top:auto;padding:9px 10px;border:1px dashed var(--rule);background:none;border-radius:6px;color:var(--accent);font-weight:500}
.mnb .nb-newbtn:hover{background:var(--accent-soft)}
.mnb .nb-binder{background:var(--sheet)}
.mnb .nb-bhead{position:sticky;top:0;background:var(--sheet);padding:16px 16px 10px;border-bottom:1px solid var(--rule);display:flex;align-items:center;gap:8px;z-index:1}
.mnb .nb-bhead h2{margin:0;font-size:15px;font-weight:600;flex:1;min-width:0}
.mnb .nb-back{display:none;border:0;background:none;color:var(--accent);padding:4px 6px}
.mnb .nb-group{border-bottom:1px solid var(--rule)}
.mnb .nb-ghead{display:flex;align-items:center;gap:8px;width:100%;padding:10px 16px;border:0;background:none;text-align:left;font-weight:600}
.mnb .nb-ghead:hover{background:var(--hover)}
.mnb .nb-ghead .car{width:10px;color:var(--muted);transition:transform .15s}
.mnb .nb-group.open .nb-ghead .car{transform:rotate(90deg)}
.mnb .nb-ghead .ct{margin-left:auto;font-family:var(--f-mono);font-size:12px;color:var(--muted);font-weight:400}
.mnb .nb-pages{display:none;padding:0 0 8px}
.mnb .nb-group.open .nb-pages{display:block}
.mnb .nb-pg{display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 12px;width:100%;padding:7px 16px 7px 34px;border:0;background:none;text-align:left}
.mnb .nb-pg.flat{padding-left:16px}
.mnb .nb-pg:hover{background:var(--hover)}
.mnb .nb-pg.on{background:var(--accent-soft)}
.mnb .nb-pg .d{font-family:var(--f-mono);font-size:12px;color:var(--muted);grid-row:span 2;padding-top:1px;font-variant-numeric:tabular-nums;min-width:48px}
.mnb .nb-pg .t{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mnb .nb-pg .s{font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mnb .nb-empty{padding:28px 18px;color:var(--muted);line-height:1.55}
.mnb .nb-empty b{color:var(--ink)}
.mnb .nb-page{background:var(--sheet);border-right:0}
.mnb .nb-sheet{max-width:clamp(760px,72vw,1500px);margin:0 auto;padding-block:28px 64px;padding-inline:clamp(16px,4vw,44px)}
.mnb .nb-crumbs{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;color:var(--muted);margin-bottom:10px}
.mnb .nb-chip{display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border-radius:999px;background:var(--hover);font-size:12px}
.mnb .nb-chip .sw{width:7px;height:7px;border-radius:50%;background:var(--c,var(--t-other))}
.mnb .nb-ttl{width:100%;border:0;background:none;font-family:var(--f-body);font-size:28px;font-weight:600;line-height:1.2;padding:0;letter-spacing:-.01em}
.mnb .nb-ttl:focus{outline:none;box-shadow:0 2px 0 var(--accent)}
.mnb .nb-meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:16px 0 6px}
.mnb .nb-field{display:flex;flex-direction:column;gap:3px;min-width:0}
.mnb .nb-field label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.mnb .nb-field input{padding:6px 8px;border:1px solid var(--rule);border-radius:6px;background:var(--paper);min-width:0}
.mnb .nb-src{font-size:12px;color:var(--muted);margin:6px 0 20px;display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center}
.mnb .nb-src button{border:0;background:none;color:var(--accent);padding:0;font-size:12px}
.mnb .nb-src button:hover{text-decoration:underline}
.mnb .nb-sec{margin-top:26px}
.mnb .nb-sec h3{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin:0 0 8px;font-weight:600}
.mnb .nb-sh{display:flex;gap:8px;align-items:center;width:100%;border:0;background:none;padding:4px 0;font:inherit;letter-spacing:inherit;text-transform:inherit;color:inherit;text-align:left}
.mnb .nb-sh:hover{color:var(--ink)}
.mnb .nb-sh .car{display:inline-block;width:10px;transition:transform .15s;transform:rotate(90deg)}
.mnb .nb-sec.closed .nb-sh .car{transform:none}
.mnb .nb-sec.closed>:not(h3){display:none!important}
.mnb .nb-sec.closed h3{margin-bottom:0}
.mnb .nb-secall{border:0;background:none;color:var(--accent);font-size:12px;padding:2px 0}
.mnb .nb-secall:hover{text-decoration:underline}
.mnb .nb-ptog{flex:none;border:1px solid var(--rule);background:var(--sheet);color:var(--muted);width:28px;height:28px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-size:14px;line-height:1;padding:0}
.mnb .nb-ptog:hover{color:var(--ink);border-color:var(--accent)}
.mnb .nb-tabs .nb-ptog{align-self:flex-end;margin:-4px 0 -24px}
.mnb .nb-app.ct .nb-tabs{padding:16px 7px}
.mnb .nb-app.ct .nb-tabs>:not(.nb-ptog){display:none!important}
.mnb .nb-app.ct .nb-tabs .nb-ptog{margin:0;align-self:center}
.mnb .nb-app.cb .nb-binder>:not(.nb-bhead){display:none}
.mnb .nb-app.cb .nb-bhead{padding:16px 7px;justify-content:center;border-bottom:0}
.mnb .nb-app.cb .nb-bhead>:not(.nb-ptog){display:none}
.mnb .nb-sec h3 .n{font-family:var(--f-mono);font-weight:400}
.mnb .nb-list{display:flex;flex-direction:column;gap:4px}
.mnb .nb-row{display:flex;gap:8px;align-items:flex-start}
.mnb .nb-row textarea{flex:1;min-width:0;border:1px solid transparent;border-radius:6px;background:none;padding:5px 8px;font-family:var(--f-body);font-size:15.5px}
.mnb .nb-row textarea:hover{border-color:var(--rule)}
.mnb .nb-row textarea:focus{outline:none;border-color:var(--accent);background:var(--paper)}
.mnb .nb-row .bullet{width:6px;height:6px;border-radius:50%;background:var(--muted);margin:13px 2px 0 4px;flex:none}
.mnb .nb-x{border:0;background:none;color:var(--muted);padding:4px 6px;border-radius:4px;opacity:.5}
.mnb .nb-row:hover .nb-x,.mnb .nb-act:hover .nb-x,.mnb .nb-x:focus{opacity:1}
.mnb .nb-x:hover{background:var(--hover);color:var(--warn)}
.mnb .nb-act{display:grid;grid-template-columns:22px minmax(0,1fr) clamp(110px,12vw,220px) clamp(130px,10vw,170px) 28px;gap:6px;align-items:start;padding:2px 0}
.mnb .nb-act input[type=checkbox]{width:16px;height:16px;accent-color:var(--ok);margin:8px 0 0}
.mnb .nb-act input[type=text],.mnb .nb-act input[type=date],.mnb .nb-act textarea{border:1px solid transparent;border-radius:6px;background:none;padding:5px 6px;min-width:0}
.mnb .nb-act .tx{font-family:var(--f-body);font-size:15.5px}
.mnb .nb-act input:hover,.mnb .nb-act textarea:hover{border-color:var(--rule)}
.mnb .nb-act input:focus,.mnb .nb-act textarea:focus{outline:none;border-color:var(--accent);background:var(--paper)}
.mnb .nb-act input.ow,.mnb .nb-act input.du{font-size:12.5px;color:var(--muted)}
.mnb .nb-act.done .tx{text-decoration:line-through;color:var(--muted)}
.mnb textarea.nb-wrap{resize:none;overflow:hidden;line-height:1.4;display:block;width:100%;min-height:0;white-space:pre-wrap;overflow-wrap:anywhere}
.mnb .nb-txc{min-width:0;display:flex;flex-direction:column;gap:3px}
.mnb .nb-how{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:0 6px 4px}
.mnb .nb-mode{border:1px solid var(--rule);background:var(--paper);border-radius:999px;padding:1px 9px;font-size:11.5px;line-height:1.6;color:var(--muted);display:inline-flex;align-items:center;gap:5px}
.mnb .nb-mode:hover{border-color:var(--accent)}
.mnb .nb-mode .dot{width:6px;height:6px;border-radius:50%;background:currentColor}
.mnb .nb-mode.claude{background:var(--accent-soft);border-color:transparent;color:var(--accent)}
.mnb .nb-mode.manual{background:var(--hover);border-color:transparent;color:var(--ink)}
.mnb .nb-cpy{border:0;background:none;color:var(--accent);font-size:12px;padding:0 2px}
.mnb .nb-cpy:hover{text-decoration:underline}
.mnb .nb-act textarea.pr{font-family:var(--f-mono);font-size:12.5px;line-height:1.5;color:var(--ink);background:var(--paper);border:1px solid var(--rule);border-radius:6px;padding:6px 8px;margin:0 0 4px 0}
.mnb .nb-act.done .nb-how,.mnb .nb-act.done textarea.pr{opacity:.55}
.mnb .nb-ai .pv{grid-column:2;font-family:var(--f-mono);font-size:12px;line-height:1.45;color:var(--muted);background:var(--paper);border-radius:6px;padding:6px 8px;white-space:pre-wrap;overflow-wrap:anywhere}
.mnb .nb-mfilter{display:flex;gap:4px;padding:8px 16px;border-bottom:1px solid var(--rule)}
.mnb .nb-mfilter button{border:1px solid var(--rule);background:var(--sheet);border-radius:999px;padding:2px 10px;font-size:12px;color:var(--muted)}
.mnb .nb-mfilter button.on{background:var(--accent-soft);border-color:transparent;color:var(--accent)}
.mnb .nb-row .nb-x,.mnb .nb-act .nb-x{margin-top:2px}
.mnb .nb-add{border:0;background:none;color:var(--accent);padding:6px 4px;font-size:13px;text-align:left}
.mnb .nb-add:hover{text-decoration:underline}
.mnb .nb-attend input{width:100%;border:1px solid var(--rule);border-radius:6px;background:var(--paper);padding:6px 8px;font-size:13px}
.mnb .nb-foot{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:40px;padding-top:16px;border-top:1px solid var(--rule);font-size:12px;color:var(--muted)}
.mnb .nb-foot .sp{flex:1}
.mnb .nb-danger{border:1px solid var(--rule);background:none;border-radius:6px;padding:5px 10px;color:var(--warn)}
.mnb .nb-danger.arm{background:var(--warn);color:var(--sheet);border-color:var(--warn)}
.mnb .nb-save{font-family:var(--f-mono);font-size:11.5px}
.mnb .nb-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:var(--ink);color:var(--sheet);padding:8px 14px;border-radius:6px;font-size:13px;opacity:0;transition:opacity .2s;pointer-events:none;max-width:calc(100% - 32px);z-index:60}
.mnb .nb-toast.show{opacity:1}
.mnb .nb-ai{display:grid;grid-template-columns:22px minmax(0,1fr);gap:4px 10px;padding:10px 16px;border-bottom:1px solid var(--rule);align-items:start}
.mnb .nb-ai input{margin:3px 0 0;width:16px;height:16px;accent-color:var(--ok)}
.mnb .nb-ai .tx{font-family:var(--f-body);font-size:15px;line-height:1.4}
.mnb .nb-ai .mt{grid-column:2;font-size:12px;color:var(--muted);display:flex;flex-wrap:wrap;gap:4px 10px}
.mnb .nb-ai .mt button{border:0;background:none;color:var(--accent);padding:0;font-size:12px;text-align:left}
.mnb .nb-ai .od{color:var(--warn)}
.mnb .nb-rtebox{border:1px solid var(--rule);border-radius:8px;background:var(--sheet)}
.mnb .nb-rtebox:focus-within{border-color:var(--accent)}
.mnb .nb-tb{display:flex;flex-wrap:wrap;gap:2px;align-items:center;padding:4px 6px;border-bottom:1px solid var(--rule);background:var(--paper);border-radius:8px 8px 0 0;position:sticky;top:0;z-index:2}
.mnb .nb-tb button{border:0;background:none;min-width:30px;height:28px;padding:0 7px;border-radius:5px;color:var(--ink);font-size:13px;display:inline-flex;align-items:center;justify-content:center;gap:4px}
.mnb .nb-tb button:hover{background:var(--hover)}
.mnb .nb-tb button.on{background:var(--accent-soft);color:var(--accent)}
.mnb .nb-tb .sep{width:1px;height:18px;background:var(--rule);margin:0 4px}
.mnb .nb-tb .hl{width:14px;height:14px;border-radius:3px;border:1px solid var(--rule)}
.mnb .nb-tb svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.mnb .nb-rte{min-height:5em;padding:10px 14px;font-family:var(--f-body);font-size:16px;line-height:1.6;outline:none;overflow-wrap:anywhere}
.mnb .nb-notes .nb-rte{min-height:9em}
.mnb .nb-rte:empty::before{content:attr(data-nb-ph);color:var(--muted)}
.mnb .nb-rte p{margin:0 0 .55em}
.mnb .nb-rte h4{font-family:var(--f-ui);font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:.9em 0 .3em}
.mnb .nb-rte h4:first-child{margin-top:0}
.mnb .nb-rte ul,.mnb .nb-rte ol{margin:.2em 0 .6em;padding-left:1.4em}
.mnb .nb-rte li{margin:.15em 0}
.mnb .nb-rte li::marker{color:var(--muted)}
.mnb .nb-rte b,.mnb .nb-rte strong{font-weight:600}
.mnb .nb-rte a{color:var(--accent)}
.mnb .nb-rte img{display:block;max-width:100%;height:auto;margin:.6em 0;border:1px solid var(--rule);border-radius:6px;cursor:zoom-in}
.mnb .nb-modal{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:40;padding:16px}
.mnb .nb-mbox{background:var(--sheet);color:var(--ink);border:1px solid var(--rule);border-radius:10px;width:min(680px,100%);max-height:calc(100vh - 32px);overflow:auto;padding:20px 22px;display:flex;flex-direction:column;gap:12px}
.mnb .nb-mbox h3{margin:0;font-family:var(--f-body);font-size:20px}
.mnb .nb-mbox p{margin:0;color:var(--muted);line-height:1.5;font-size:13px}
.mnb .nb-mbox .mact{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.mnb .nb-mbox button.b{border:1px solid var(--rule);background:var(--sheet);border-radius:6px;padding:7px 14px}
.mnb .nb-mbox button.pri{background:var(--accent);border-color:var(--accent);color:#fff}
.mnb .nb-mbox button:disabled{opacity:.45;cursor:default}
.mnb .nb-crow{display:grid;grid-template-columns:62px minmax(0,1fr) auto;gap:4px 12px;align-items:center;padding:8px 0;border-top:1px solid var(--rule)}
.mnb .nb-crow .d{font-family:var(--f-mono);font-size:12px;color:var(--muted)}
.mnb .nb-crow .st{font-size:12px;color:var(--muted)}
.mnb .nb-crow .st.bad{color:var(--warn)}
.mnb .nb-crow button{border:1px solid var(--rule);background:var(--sheet);border-radius:6px;padding:4px 10px;font-size:12px;white-space:nowrap}
.mnb .nb-crow button:hover{border-color:var(--accent);color:var(--accent)}
.mnb .nb-lightbox{position:fixed;inset:0;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;z-index:50;cursor:zoom-out;padding:16px}
.mnb .nb-lightbox img{max-width:96vw;max-height:94vh;border-radius:6px;background:#fff}
.mnb mark{background:var(--hl-y);color:inherit;border-radius:2px;padding:0 1px}
.mnb mark.g{background:var(--hl-g)}.mnb mark.p{background:var(--hl-p)}
.mnb .nb-cb{position:relative;display:flex;min-width:0}
.mnb .nb-cb>input{flex:1;min-width:0;padding-right:26px!important}
.mnb .nb-cb-btn{position:absolute;right:2px;top:50%;transform:translateY(-50%);border:0;background:none;color:var(--muted);width:24px;height:24px;border-radius:4px;font-size:11px;line-height:1}
.mnb .nb-cb-btn:hover{background:var(--hover);color:var(--ink)}
.mnb .nb-cb-list{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:20;background:var(--sheet);border:1px solid var(--rule);border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.14);max-height:260px;overflow:auto;padding:4px;min-width:200px}
.mnb .nb-cb-opt{display:flex;align-items:center;gap:8px;width:100%;border:0;background:none;text-align:left;padding:7px 9px;border-radius:5px;font-size:13px;color:var(--ink)}
.mnb .nb-cb-opt .sw{width:8px;height:8px;border-radius:50%;background:var(--c,var(--t-other));flex:none}
.mnb .nb-cb-opt .hint{margin-left:auto;font-size:11px;color:var(--muted)}
.mnb .nb-cb-opt.act,.mnb .nb-cb-opt:hover{background:var(--accent-soft)}
.mnb .nb-cb-opt.new{color:var(--accent)}
.mnb .nb-cb-head{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);padding:8px 9px 3px}
.mnb .nb-cb-empty{padding:8px 9px;font-size:12px;color:var(--muted)}
.mnb .nb-act .nb-cb>input{border:1px solid transparent;border-radius:6px;background:none;padding:5px 6px;font-size:12.5px;color:var(--muted)}
.mnb .nb-act .nb-cb>input:hover{border-color:var(--rule)}
.mnb .nb-act .nb-cb>input:focus{outline:none;border-color:var(--accent);background:var(--paper);color:var(--ink)}
.mnb .nb-act .nb-cb .nb-cb-btn{opacity:0}.mnb .nb-act:hover .nb-cb .nb-cb-btn,.mnb .nb-act .nb-cb:focus-within .nb-cb-btn{opacity:1}
.mnb .nb-tabrow,.mnb .nb-ghrow{display:flex;align-items:center;min-width:0}
.mnb .nb-tabrow .nb-tab,.mnb .nb-ghrow .nb-ghead{flex:1;min-width:0}
.mnb .nb-more{flex:none;border:0;background:none;color:var(--muted);padding:4px 8px;border-radius:5px;opacity:0;font-size:15px;line-height:1}
.mnb .nb-tabrow:hover .nb-more,.mnb .nb-ghrow:hover .nb-more,.mnb .nb-more:focus,.mnb .nb-more.on{opacity:1}
.mnb .nb-more:hover,.mnb .nb-more.on{background:var(--hover);color:var(--ink)}
.mnb .nb-tools{display:flex;flex-wrap:wrap;gap:4px;padding:2px 10px 8px 24px}
.mnb .nb-binder .nb-tools{padding-left:34px}
.mnb .nb-tools button{border:1px solid var(--rule);background:var(--sheet);border-radius:5px;padding:3px 9px;font-size:12px}
.mnb .nb-tools button:hover{border-color:var(--accent);color:var(--accent)}
.mnb .nb-tools button.dz{color:var(--warn)}
.mnb .nb-tools button:disabled{opacity:.4;cursor:default;border-color:var(--rule);color:inherit}
.mnb .nb-rn{width:100%;padding:7px 10px;border:1px solid var(--accent);border-radius:6px;background:var(--sheet);margin:2px 0}
.mnb .nb-binder .nb-rnwrap{padding:6px 16px}
.mnb .nb-addline{border:0;background:none;color:var(--accent);padding:8px 10px;font-size:13px;text-align:left}
.mnb .nb-binder .nb-addline{padding:12px 16px}
.mnb .nb-addline:hover{text-decoration:underline}
.mnb .nb-sortbar{display:flex;gap:6px 14px;padding:8px 16px;border-bottom:1px solid var(--rule);font-size:12px;color:var(--muted);flex-wrap:wrap;align-items:center}
.mnb .nb-sortbar label{display:flex;gap:6px;align-items:center}
.mnb .nb-sortbar select{border:1px solid var(--rule);border-radius:5px;background:var(--paper);padding:3px 6px;font-size:12px}
.mnb .nb-ghead.on{background:var(--accent-soft)}
.mnb .nb-crumbg{border:0;background:none;padding:0;color:inherit;font:inherit;text-decoration:underline;text-decoration-color:var(--rule);text-underline-offset:3px}
.mnb .nb-crumbg:hover{color:var(--accent);text-decoration-color:var(--accent)}
.mnb .nb-gtitle{font-family:var(--f-body);font-size:28px;font-weight:600;line-height:1.2;margin:0;letter-spacing:-.01em;text-wrap:balance}
.mnb .nb-gsearch{margin:4px 0 0;max-width:520px}
.mnb .nb-gsearch .nb-search{margin:0;background:var(--paper)}
.mnb .nb-hlcard{margin-top:22px;border:1px solid var(--rule);border-left:3px solid var(--accent);border-radius:8px;padding:16px 18px 14px;background:var(--paper)}
.mnb .nb-hlcard .eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.mnb .nb-hlcard h2{margin:4px 0 8px;font-family:var(--f-body);font-size:20px;font-weight:600;line-height:1.3}
.mnb .nb-hlcard .nb-rte.ro{padding:0;min-height:0}
.mnb .nb-hlcard .mini{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:12px 0 4px;font-weight:600}
.mnb .nb-dlist{margin:0;padding-left:1.3em;font-family:var(--f-body);font-size:15px;line-height:1.5}
.mnb .nb-lnk{border:0;background:none;padding:0;color:inherit;font:inherit;text-align:left}
.mnb .nb-lnk:hover{color:var(--accent)}
.mnb .nb-lnk.sm{margin-top:10px;font-size:13px;color:var(--accent)}
.mnb .nb-glist{display:flex;flex-direction:column}
.mnb .nb-gpg{display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 14px;width:100%;padding:9px 8px;border:0;border-bottom:1px solid var(--rule);background:none;text-align:left;border-radius:0}
.mnb .nb-gpg:hover{background:var(--hover)}
.mnb .nb-gpg .d{font-family:var(--f-mono);font-size:12px;color:var(--muted);grid-row:span 2;padding-top:2px;min-width:52px;font-variant-numeric:tabular-nums}
.mnb .nb-gpg .t{font-weight:500}
.mnb .nb-gpg .s{font-size:12.5px;color:var(--muted);line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.mnb .nb-sheet .nb-ai{padding:10px 0}
.mnb .nb-gempty{padding:4px 16px 10px 34px;font-size:12px;color:var(--muted)}
.mnb .nb-filing{margin:10px 16px 0;padding:8px 10px;border-radius:6px;background:var(--accent-soft);color:var(--accent);font-size:12px;line-height:1.45}
.mnb .nb-filing.bad{background:var(--hover);color:var(--warn)}
.mnb .nb-filing button{border:0;background:none;color:inherit;text-decoration:underline;padding:0;font-size:12px}
@media (min-width:861px) and (max-width:1100px){.mnb .nb-app{--wt:180px;--wb:240px}.mnb .nb-app.ct{--wt:44px}.mnb .nb-app.cb{--wb:44px}}
@media (min-width:1800px){.mnb{font-size:15px}.mnb .nb-rte{font-size:17px}.mnb .nb-ttl{font-size:32px}}
@media (max-width:860px){
  .mnb .nb-ptog{display:none!important}
  .mnb .nb-app.ct .nb-tabs>*,.mnb .nb-app.cb .nb-binder>*,.mnb .nb-app.cb .nb-bhead>*{display:revert}
  .mnb .nb-app{grid-template-columns:minmax(0,1fr)}
  .mnb .nb-pane{border-right:0}
  .mnb .nb-app[data-view="tabs"] .nb-binder,.mnb .nb-app[data-view="tabs"] .nb-page{display:none}
  .mnb .nb-app[data-view="binder"] .nb-tabs,.mnb .nb-app[data-view="binder"] .nb-page{display:none}
  .mnb .nb-app[data-view="page"] .nb-tabs,.mnb .nb-app[data-view="page"] .nb-binder{display:none}
  .mnb .nb-back{display:inline-block}
  .mnb .nb-act{grid-template-columns:22px minmax(0,1fr) 28px}
  .mnb .nb-act .nb-ow-wrap,.mnb .nb-act input.du{grid-column:2}
}
@media (prefers-reduced-motion:reduce){.mnb *{transition:none!important}}
/* ---------- BRANDI: labels in wide-tracked caps, light display type, pills, hairlines, no shadows ---------- */
.mnb .nb-brand{font-family:var(--f-ui);font-weight:300;font-size:20px;letter-spacing:.01em;padding-right:36px}
.mnb .nb-lbl,.mnb .nb-sec h3,.mnb .nb-field label,.mnb .nb-hlcard .eyebrow,.mnb .nb-hlcard .mini,.mnb .nb-cb-head{font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--muted)}
.mnb .nb-search{border-radius:100px;padding:8px 14px}
.mnb .nb-tab.on{background:var(--sheet);box-shadow:inset 0 0 0 1px var(--rule);font-weight:500}
.mnb .nb-newbtn{margin-top:auto;border:1px solid var(--ink);background:var(--ink);color:var(--paper);border-radius:100px;font-size:11px;font-weight:700;letter-spacing:.21em;text-transform:uppercase;padding:11px 12px}
.mnb .nb-newbtn:hover{opacity:.8;background:var(--ink)}
.mnb .nb-newbtn.alt{background:none;color:var(--ink);border-color:var(--rule)}
.mnb .nb-newbtn.alt:hover{border-color:var(--ink);background:none;opacity:1}
.mnb .nb-pg.on{background:var(--accent-soft);box-shadow:inset 2px 0 0 var(--accent)}
.mnb .nb-ttl,.mnb .nb-gtitle{font-family:var(--f-ui);font-weight:300;font-size:36px;line-height:1.15;letter-spacing:.01em}
.mnb .nb-chip{background:none;border:1px solid var(--c,var(--t-other));color:var(--c,var(--t-other));font-weight:500}
.mnb .nb-chip .sw{display:none}
.mnb .nb-field input{background:var(--sheet);border-radius:5px}
.mnb .nb-rte,.mnb .nb-row textarea,.mnb .nb-act .tx,.mnb .nb-ai .tx,.mnb .nb-dlist{font-family:var(--f-ui);font-weight:300}
.mnb .nb-rte b,.mnb .nb-rte strong{font-weight:700}
.mnb .nb-rte h4{font-family:var(--f-ui);font-size:11px;font-weight:700;letter-spacing:.2em}
.mnb .nb-rtebox,.mnb .nb-modal .nb-mbox,.mnb .nb-hlcard{border-radius:5px}
.mnb .nb-mode{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:2px 10px}
.mnb .nb-mode.claude{background:var(--accent);color:var(--accent-ink)}
.mnb .nb-mode.manual{background:none;border-color:var(--rule);color:var(--ink)}
.mnb .nb-mfilter button.on{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.mnb .nb-hlcard{background:var(--band);color:var(--band-ink);border:0;border-left:0;padding:26px 30px}
.mnb .nb-hlcard .eyebrow,.mnb .nb-hlcard .mini{color:var(--band-muted)}
.mnb .nb-hlcard h2{font-family:var(--f-ui);font-weight:300;font-size:26px}
.mnb .nb-hlcard .nb-lnk:hover{color:var(--band-accent)}
.mnb .nb-hlcard .nb-lnk.sm{color:var(--band-accent);font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase}
.mnb .nb-hlcard .nb-rte.ro{color:var(--band-ink)}
.mnb .nb-hlcard mark{background:none;color:var(--band-accent);font-weight:500}
.mnb .nb-hlcard .nb-ts{color:var(--band-accent)}
.mnb .nb-filing{background:var(--accent);color:var(--accent-ink);border-radius:5px}
.mnb .nb-filing.bad{background:none;border:1px solid var(--warn);color:var(--warn)}
.mnb .nb-danger{border-radius:100px;border-color:var(--warn);padding:6px 16px}
.mnb .nb-mbox h3{font-family:var(--f-ui);font-weight:300;font-size:28px}
.mnb .nb-mbox button.b,.mnb .nb-crow button,.mnb .nb-pill{font:inherit;font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;padding:7px 16px;border-radius:100px;border:1px solid var(--rule);background:var(--sheet);color:var(--ink);cursor:pointer}
.mnb .nb-pill:hover,.mnb .nb-crow button:hover{border-color:var(--ink);color:var(--ink)}
.mnb .nb-pill.pri{background:var(--ink);border-color:var(--ink);color:var(--paper)}
.mnb .nb-pill.pri:hover{opacity:.8}
.mnb .nb-pill:disabled{opacity:.4;cursor:default}
.mnb .nb-ts{border:0;background:none;padding:0 0 0 4px;font:inherit;font-size:12px;font-weight:700;color:var(--accent);letter-spacing:.04em;white-space:nowrap;cursor:pointer}
.mnb .nb-ts:hover{text-decoration:underline}
.mnb .nb-only{font-size:10.5px;color:var(--muted);letter-spacing:.06em}
.mnb .nb-run{border:0;background:none;padding:0 2px;font-size:12px;font-weight:700;color:var(--accent);cursor:pointer}
.mnb .nb-run:hover{text-decoration:underline}
.mnb .nb-runstate{font-size:12px;font-weight:700;color:var(--accent)}
/* Today: the whole page, folders beside it */
.mnb .nb-app.today{grid-template-columns:var(--wt) 0 minmax(0,1fr)}
.mnb .nb-app.today .nb-binder{display:none}
.mnb .nb-app.today .nb-page{grid-column:3}
@media (max-width:860px){.mnb .nb-app.today .nb-page{grid-column:1}}
.mnb .nb-today{display:flex;flex-direction:column;min-height:100%}
.mnb .nb-tband{background:var(--band);color:var(--band-ink);padding:36px clamp(20px,4vw,56px) 32px;display:flex;flex-direction:column;gap:22px}
.mnb .nb-tband h1{margin:0;font-family:var(--f-ui);font-weight:300;font-size:52px;line-height:1.1;letter-spacing:.01em}
.mnb .nb-tband .nb-lbl{color:var(--band-muted);padding:0}
.mnb .nb-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;max-width:900px}
.mnb .nb-kpis b{display:block;font-size:44px;font-weight:100;color:var(--band-accent);line-height:1.1}
.mnb .nb-tgrid{padding:28px clamp(20px,4vw,56px) 56px;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px;align-items:start}
.mnb .nb-card{background:var(--sheet);border:1px solid var(--rule);border-radius:5px;padding:20px 22px;display:flex;flex-direction:column;min-width:0}
.mnb .nb-card h2{margin:0 0 6px;display:flex;align-items:center;gap:8px}
.mnb .nb-card h2 .nb-lbl{padding:0;flex:1}
.mnb .nb-tag{font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:2px 10px;border-radius:100px;background:var(--ink);color:var(--paper)}
.mnb .nb-crow2{display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:2px 12px;align-items:center;padding:11px 0;border-bottom:1px solid var(--rule);text-align:left;width:100%;background:none;border-left:0;border-right:0;border-top:0;color:inherit;font:inherit}
.mnb .nb-crow2:last-child{border-bottom:0}
.mnb .nb-crow2 .t{font-size:12px;color:var(--muted)}
.mnb button.nb-crow2:hover .nm{color:var(--accent)}
.mnb .nb-state{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:2px 10px;border-radius:100px;white-space:nowrap;border:1px solid var(--rule);color:var(--muted)}
.mnb .nb-state.busy{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.mnb .nb-state.ok{border-color:var(--ok);color:var(--ok)}
.mnb .nb-state.bad{border-color:var(--warn);color:var(--warn)}
.mnb .nb-tempty{font-size:13px;color:var(--muted);padding:8px 0}
/* Review of a re-filing */
.mnb .nb-review{background:var(--accent);color:var(--accent-ink);margin:-28px calc(-1 * clamp(16px,4vw,44px)) 22px;padding:16px clamp(16px,4vw,44px);display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center}
.mnb .nb-review .w{flex:1 1 320px;display:flex;flex-direction:column;gap:2px}
.mnb .nb-review b{font-weight:700}
.mnb .nb-review .nb-pill{background:var(--accent-ink);color:var(--accent);border-color:var(--accent-ink)}
.mnb .nb-review .nb-pill.ghost{background:none;color:var(--accent-ink)}
.mnb .nb-chg{border:1px solid var(--rule);border-radius:5px;padding:14px 18px;margin-bottom:12px;display:flex;flex-direction:column;gap:8px;background:var(--sheet)}
.mnb .nb-chg .old{color:var(--muted);text-decoration:line-through;font-size:14px;margin:0}
.mnb .nb-chg .new{font-size:15px;margin:0}
.mnb .nb-chg .row2{display:flex;gap:8px;flex-wrap:wrap}
/* Side panel: From the call · Run with Claude */
.mnb .nb-drawer{position:absolute;top:0;right:0;bottom:0;width:min(460px,100%);background:var(--paper);border-left:1px solid var(--rule);z-index:30;overflow:auto;padding:24px 26px 40px;display:flex;flex-direction:column;gap:16px}
.mnb .nb-drawer h2{margin:0;font-family:var(--f-ui);font-size:22px;line-height:1.25;font-weight:300}
.mnb .nb-dhead{display:flex;align-items:center;gap:10px}
.mnb .nb-dhead .nb-lbl{flex:1;padding:0}
.mnb .nb-seg{display:grid;grid-template-columns:46px minmax(0,1fr);gap:3px 12px;padding:10px 0;border-bottom:1px solid var(--rule)}
.mnb .nb-seg.at{background:var(--hl-y);margin:0 -26px;padding:10px 26px}
.mnb .nb-seg .who{font-size:11.5px;font-weight:700;color:var(--muted)}
.mnb .nb-seg .tx{grid-column:2;font-size:14px;line-height:1.5}
.mnb .nb-steps{display:flex;align-items:center;gap:8px}
.mnb .nb-steps span.s{display:flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.mnb .nb-steps span.s i{font-style:normal;width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--rule)}
.mnb .nb-steps span.s.on{color:var(--ink)}.mnb .nb-steps span.s.on i{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.mnb .nb-steps span.s.now{color:var(--accent)}.mnb .nb-steps span.s.now i{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.mnb .nb-steps em{flex:1;height:1px;background:var(--rule)}
.mnb .nb-drawer textarea{font:inherit;font-family:var(--f-mono);font-size:12.5px;line-height:1.5;width:100%;min-height:96px;border:1px solid var(--rule);border-radius:5px;padding:10px 12px;background:var(--sheet);color:var(--ink);resize:vertical}
.mnb .nb-drawer label.src{display:flex;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--rule);font-size:14px}
.mnb .nb-drawer label.src input{accent-color:var(--accent);width:16px;height:16px}
.mnb .nb-draft{background:var(--sheet);border:1px solid var(--rule);border-radius:5px;padding:16px 18px;font-size:14px;line-height:1.55;overflow-wrap:anywhere}
.mnb .nb-draft h1,.mnb .nb-draft h2,.mnb .nb-draft h3{font-size:15px;font-weight:700;margin:.6em 0 .3em}
.mnb .nb-draft p{margin:0 0 .6em}
.mnb .nb-draft ul,.mnb .nb-draft ol{margin:.2em 0 .6em;padding-left:1.3em}
.mnb .nb-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.mnb .nb-note{font-size:12px;line-height:1.5;color:var(--muted);margin:0}
`

const SKELETON = `<div class="nb-app" data-view="tabs">
  <nav class="nb-pane nb-tabs" aria-label="Meeting types">
    <button class="nb-ptog" id="nb-tog-tabs" aria-label="Collapse folders" title="Collapse folders">«</button>
    <div class="nb-brand">Meeting Notebook</div>
    <input class="nb-search" id="nb-q" type="search" placeholder="Search notes" aria-label="Search notes">
    <button class="nb-tab" id="nb-tab-today" data-nb-k="__today" style="margin-bottom:8px"><span class="sw" style="--c:var(--band-accent)"></span><span class="nm">Today</span><span class="ct" id="nb-today-ct"></span></button>
    <div class="nb-lbl" style="padding-top:2px">Folders</div>
    <div id="nb-tabs"></div>
    <div class="nb-lbl">Views</div>
    <button class="nb-tab" id="nb-tab-actions" data-nb-k="__actions"><span class="sw" style="--c:var(--ok)"></span><span class="nm">Open action items</span><span class="ct" id="nb-act-ct"></span></button>
    <button class="nb-tab" id="nb-tab-recent" data-nb-k="__recent"><span class="sw" style="--c:var(--accent)"></span><span class="nm">Last 14 days</span><span class="ct" id="nb-rec-ct"></span></button>
    <button class="nb-newbtn" id="nb-new">+ New page</button>
    <button class="nb-newbtn alt" id="nb-imp" style="margin-top:8px">File an Echo call</button>
  </nav>
  <section class="nb-pane nb-binder" aria-label="Pages">
    <div class="nb-bhead"><button class="nb-back" id="nb-back1">‹ Types</button><h2 id="nb-btitle">Notebook</h2><button class="nb-ptog" id="nb-tog-binder" aria-label="Collapse pages list" title="Collapse pages list">«</button></div>
    <div id="nb-filing"></div>
    <div id="nb-binder"><div class="nb-empty">Loading your notebook…</div></div>
  </section>
  <main class="nb-pane nb-page" aria-label="Page">
    <div class="nb-sheet" id="nb-sheet">
      <div class="nb-empty"><b>Your meeting minutes land here.</b><br>When Echo has written a call's minutes, Claude files the call by type, then by client or person, then by date. Filing a call again updates its page and keeps your edits. Pick a page on the left, or use <b>+ New page</b> to write your own.</div>
    </div>
  </main>
</div>
<aside class="nb-drawer" id="nb-drawer" hidden aria-label="Side panel"></aside>
<div class="nb-toast" id="nb-toast" role="status" aria-live="polite"></div>`

export function apply(ctx) {
  ctx.ui.style(CSS)
  const root = document.createElement('div')
  root.className = 'mnb'
  root.innerHTML = SKELETON
  const $ = (s) => root.querySelector(s)
  const $$ = (s) => root.querySelectorAll(s)
  const app = $('.nb-app')

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

  /* ---------- rich text: sanitize, convert, plain ---------- */
  const OK_TAGS = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'MARK', 'UL', 'OL', 'LI', 'H4', 'A', 'IMG'])
  const IMG_SRC = /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/
  function cleanNode(src, doc) {
    const out = doc.createDocumentFragment()
    src.childNodes.forEach((ch) => {
      if (ch.nodeType === 3) { out.appendChild(doc.createTextNode(ch.nodeValue)); return }
      if (ch.nodeType !== 1) return
      let tag = ch.tagName
      if (tag === 'DIV' || tag === 'H1' || tag === 'H2' || tag === 'H3' || tag === 'H5' || tag === 'H6') tag = tag === 'DIV' ? 'P' : 'H4'
      if (tag === 'SCRIPT' || tag === 'STYLE') return
      if (!OK_TAGS.has(tag)) { out.appendChild(cleanNode(ch, doc)); return }
      if (tag === 'IMG') {
        const sv = (ch.getAttribute('src') || '').trim()
        if (!IMG_SRC.test(sv)) return
        const im = doc.createElement('img'); im.setAttribute('src', sv); im.setAttribute('alt', (ch.getAttribute('alt') || 'Pasted image').slice(0, 120)); out.appendChild(im); return
      }
      const el = doc.createElement(tag)
      if (tag === 'MARK') { const c = (ch.getAttribute('class') || '').trim(); if (c === 'g' || c === 'p') el.className = c }
      if (tag === 'A') { const h = ch.getAttribute('href') || ''; if (/^https?:\/\//i.test(h)) { el.setAttribute('href', h); el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener') } }
      el.appendChild(cleanNode(ch, doc)); out.appendChild(el)
    })
    return out
  }
  function sanitize(html) {
    const t = document.createElement('template'); t.innerHTML = html || ''
    const box = document.createElement('div'); box.appendChild(cleanNode(t.content, document))
    const s = box.innerHTML.replace(/​/g, '').replace(/<p><br><\/p>$/, '')
    return /^\s*(<br>)?\s*$/.test(s) ? '' : s
  }
  function toHtml(s) {
    s = s || ''
    if (/<\s*(p|ul|ol|li|b|strong|i|em|u|mark|br|h4|a|img)\b/i.test(s)) return sanitize(s)
    return s.split(/\n\s*\n/).map((b) => {
      const lines = b.split('\n')
      if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) return '<ul>' + lines.map((l) => '<li>' + esc(l.replace(/^\s*[-*•]\s+/, '')) + '</li>').join('') + '</ul>'
      return '<p>' + lines.map(esc).join('<br>') + '</p>'
    }).join('').replace(/<p><\/p>/g, '')
  }
  function plain(s) {
    const t = document.createElement('template')
    t.innerHTML = sanitize(String(s || '')).replace(/<\/(p|li|h4)>/gi, ' </$1>').replace(/<br\s*\/?>/gi, ' ')
    return (t.content.textContent || '').replace(/\s+/g, ' ').trim()
  }
  const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  const today = () => ymd(new Date())
  const cutoff = () => ymd(new Date(Date.now() - 14 * 864e5))
  const fmtDate = (s) => {
    if (!s) return ''
    const [y, m, d] = s.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + (y !== new Date().getFullYear() ? ' ' + y : '')
  }
  let meta = { typeOrder: null, colors: {}, groupSort: {}, groupOrder: {}, pageSort: 'newest', aliases: { types: {}, groups: {} } }
  function colorOf(t) {
    let v = (meta.colors || {})[t] || TYPE_COLOR[t]
    if (!v) { let h = 0; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) >>> 0; v = PALETTE[h % PALETTE.length] }
    return 'var(' + v + ')'
  }

  let notes = {}, filed = {}, filingNow = [], runningNow = [], deliver = [], me = '', loaded = false, lastLoad = 0, loading = null
  const sel = { kind: 'today', type: null, id: null, gview: null }
  const openGroups = new Set()
  let query = '', menuOpen = null, renaming = null, adding = null, modeFilter = 'all', gq = ''

  function toast(msg) { const t = $('#nb-toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2400) }
  const allNotes = () => Object.values(notes)
  function matches(n) {
    if (!query) return true
    const q = query.toLowerCase()
    const hay = [n.title, n.group, n.type, plain(n.summary), plain(n.myNotes), (n.attendees || []).join(' '), (n.decisions || []).join(' '), (n.actions || []).map((a) => (a.text || '') + ' ' + (a.owner || '')).join(' ')].join(' ').toLowerCase()
    return hay.includes(q)
  }
  function types() {
    const base = meta.typeOrder || TYPE_ORDER.slice(0, 5)
    const s = new Set(base); allNotes().forEach((n) => n.type && s.add(n.type))
    return [...s].sort((a, b) => { const ia = base.indexOf(a), ib = base.indexOf(b); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b) })
  }
  const byDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '') || (b.start || '').localeCompare(a.start || '')
  const pageCmp = (a, b) => (meta.pageSort === 'oldest' ? -byDateDesc(a, b) : byDateDesc(a, b))
  /* subfolders of a folder, in the chosen order (includes empty subfolders the user created) */
  function groupsOf(T, ns) {
    const groups = {}
    ;(ns || allNotes()).filter((n) => n.type === T).forEach((n) => { const g = n.group || 'General'; (groups[g] = groups[g] || []).push(n) })
    const custom = (meta.groupOrder || {})[T] || []
    if (!query) custom.forEach((g) => { if (!groups[g]) groups[g] = [] })
    for (const g in groups) groups[g].sort(byDateDesc)
    const latest = (g) => (groups[g][0] ? groups[g][0].date || '' : '')
    const mode = (meta.groupSort || {})[T] || 'recent'
    const names = Object.keys(groups).sort((a, b) => {
      if (mode === 'az') return a.localeCompare(b, undefined, { sensitivity: 'base' })
      if (mode === 'custom') { const ia = custom.indexOf(a), ib = custom.indexOf(b); if (ia !== ib) return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) }
      return latest(b).localeCompare(latest(a)) || a.localeCompare(b)
    })
    names.forEach((g) => groups[g].sort(pageCmp))
    return { names, groups }
  }

  /* ---------- loading and saving (the host half) ---------- */
  function lsGet(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode */ } }
  function setMeta(v) {
    v = v || {}
    meta = { typeOrder: Array.isArray(v.typeOrder) ? v.typeOrder : null, colors: v.colors || {}, groupSort: v.groupSort || {}, groupOrder: v.groupOrder || {}, pageSort: v.pageSort || 'newest', aliases: { types: (v.aliases && v.aliases.types) || {}, groups: (v.aliases && v.aliases.groups) || {} } }
    const local = lsGet('mnb-sort', {})
    if (local.groupSort) meta.groupSort = { ...meta.groupSort, ...local.groupSort }
    if (local.pageSort) meta.pageSort = local.pageSort
  }
  const saveLocalSort = () => lsSet('mnb-sort', { groupSort: meta.groupSort, pageSort: meta.pageSort })
  let metaQuietUntil = 0
  async function saveMeta(fields) {
    metaQuietUntil = Date.now() + 5000
    try { await ctx.call('meta', { fields: JSON.parse(JSON.stringify(fields || meta)) }); return true } catch (e) { toast("Couldn't save folder settings: " + (e.message || e)); return false }
  }
  function load() {
    if (loading) return loading
    loading = ctx.call('view').then((v) => {
      const fresh = {}
      for (const n of (v && v.notes) || []) fresh[n.id] = n
      for (const id in pend) if (fresh[id]) Object.assign(fresh[id], pend[id])
      notes = fresh
      filed = (v && v.filed) || {}
      filingNow = (v && v.filing) || []
      runningNow = (v && v.running) || []
      deliver = (v && v.deliver) || []
      me = (v && v.me) || ''
      if (Date.now() >= metaQuietUntil) setMeta(v && v.meta)
      loaded = true; lastLoad = Date.now()
      if (naming()) return
      renderTabs(); renderBinder(); renderFiling()
      if (!editing()) renderPage()
      renderDrawer()
      syncRecent()
    }).catch((e) => {
      lastLoad = Date.now()
      if (!loaded) $('#nb-binder').innerHTML = '<div class="nb-empty">Couldn\'t load the notebook. ' + esc(e.message || e) + '</div>'
    }).finally(() => { loading = null })
    return loading
  }
  let pend = {}, timer = null
  function queue(id, fields) {
    if (!notes[id]) return
    pend[id] = Object.assign(pend[id] || {}, fields); Object.assign(notes[id], fields)
    setSave('Saving…'); clearTimeout(timer); timer = setTimeout(flush, 650)
  }
  async function flush() {
    const batch = pend; pend = {}
    for (const id in batch) {
      try { const r = await ctx.call('save', { id, fields: batch[id] }); if (notes[id] && r) notes[id].updatedAt = r.updatedAt; setSave('Saved') } catch (e) { setSave('Not saved'); toast("Couldn't save: " + (e.message || e)) }
    }
  }
  function setSave(t) { const s = $('#nb-save'); if (s) s.textContent = t }
  function editing() { const a = document.activeElement; return !!(a && $('#nb-sheet').contains(a) && (/INPUT|TEXTAREA/.test(a.tagName) || a.isContentEditable)) }
  function naming() { const a = document.activeElement; return !!(a && a.classList && a.classList.contains('nb-rn')) }

  /* ---------- folder & subfolder structure ---------- */
  function repoint(map, from, to) { for (const k in map) if (map[k] === from) map[k] = to; map[from] = to; delete map[to] }
  async function moveNotes(filter, fields) {
    const list = allNotes().filter(filter)
    for (const n of list) { Object.assign(notes[n.id], fields); try { await ctx.call('save', { id: n.id, fields }) } catch (e) { toast("Couldn't move " + (n.title || 'a page') + ': ' + (e.message || e)) } }
    return list.length
  }
  async function renameType(old, nw) {
    nw = nw.trim(); if (!nw || nw === old) return
    meta.typeOrder = [...new Set(types().map((t) => (t === old ? nw : t)))]
    meta.colors = meta.colors || {}; if (!meta.colors[nw]) meta.colors[nw] = meta.colors[old] || TYPE_COLOR[old] || TYPE_COLOR.Other; delete meta.colors[old]
    repoint(meta.aliases.types, old, nw)
    const ga = {}; for (const k in meta.aliases.groups) ga[k.startsWith(old + '|') ? nw + k.slice(old.length) : k] = meta.aliases.groups[k]; meta.aliases.groups = ga
    if (meta.groupSort[old] && !meta.groupSort[nw]) meta.groupSort[nw] = meta.groupSort[old]; delete meta.groupSort[old]
    if (meta.groupOrder[old]) meta.groupOrder[nw] = [...new Set([...(meta.groupOrder[nw] || []), ...meta.groupOrder[old]])]; delete meta.groupOrder[old]
    if (sel.type === old) sel.type = nw
    await saveMeta(); const c = await moveNotes((n) => n.type === old, { type: nw }); renderAll()
    toast(`Renamed to “${nw}”` + (c ? ` · ${c} page${c > 1 ? 's' : ''} moved` : ''))
  }
  async function renameGroup(T, old, nw) {
    nw = nw.trim(); if (!nw || nw === old) return
    const ga = meta.aliases.groups; for (const k in ga) if (ga[k] === old && k.startsWith(T + '|')) ga[k] = nw; ga[T + '|' + old] = nw; delete ga[T + '|' + nw]
    meta.groupOrder[T] = [...new Set(((meta.groupOrder || {})[T] || []).map((g) => (g === old ? nw : g)))]
    if (openGroups.has(T + '|' + old)) openGroups.add(T + '|' + nw)
    await saveMeta(); const c = await moveNotes((n) => n.type === T && (n.group || 'General') === old, { group: nw }); renderAll()
    toast(`Renamed to “${nw}”` + (c ? ` · ${c} page${c > 1 ? 's' : ''}` : ''))
  }
  function moveType(t, dir) { const o = types(); const i = o.indexOf(t), j = i + dir; if (i < 0 || j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; meta.typeOrder = o; saveMeta(); renderTabs() }
  function moveGroup(T, g, dir) { const o = groupsOf(T).names; const i = o.indexOf(g), j = i + dir; if (i < 0 || j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; meta.groupOrder[T] = o; meta.groupSort[T] = 'custom'; saveMeta(); renderBinder() }
  function removeType(t) { meta.typeOrder = types().filter((x) => x !== t); if (sel.type === t) { sel.kind = null; sel.type = null } menuOpen = null; saveMeta(); renderAll() }
  function removeGroup(T, g) { meta.groupOrder[T] = ((meta.groupOrder || {})[T] || []).filter((x) => x !== g); menuOpen = null; saveMeta(); renderBinder() }
  function addType(name) { name = name.trim(); if (!name) return; if (!types().includes(name)) meta.typeOrder = [...types(), name]; sel.kind = 'type'; sel.type = name; saveMeta(); renderAll() }
  function addGroup(T, name) {
    name = name.trim(); if (!name) return
    const cur = (meta.groupOrder || {})[T] || []
    if (!cur.includes(name)) meta.groupOrder[T] = [...(meta.groupSort[T] === 'custom' ? groupsOf(T).names : cur), name].filter((v, i, a) => a.indexOf(v) === i)
    openGroups.add(T + '|' + name); saveMeta(); renderBinder()
  }
  function renderAll() { renderTabs(); renderBinder(); renderFiling(); if (!editing()) renderPage() }
  function openActions() {
    const out = []
    allNotes().forEach((n) => (n.actions || []).forEach((a, i) => { if (!a.done && a.text) out.push({ n, a, i }) }))
    return out.sort((x, y) => (x.a.due || '9999').localeCompare(y.a.due || '9999') || byDateDesc(x.n, y.n))
  }

  /* ---------- tabs ---------- */
  function renderTabs() {
    const ns = allNotes().filter(matches)
    const ts = types()
    $('#nb-tabs').innerHTML = ts.map((t, i) => {
      const c = ns.filter((n) => n.type === t).length, total = allNotes().filter((n) => n.type === t).length, key = 'type|' + t
      if (renaming === key) return `<input class="nb-rn" data-nb-rn="${esc(key)}" value="${esc(t)}" aria-label="Rename folder ${esc(t)}">`
      return `<div class="nb-tabrow"><button class="nb-tab${sel.kind === 'type' && sel.type === t ? ' on' : ''}" data-nb-k="${esc(t)}"><span class="sw" style="--c:${colorOf(t)}"></span><span class="nm">${esc(t)}</span><span class="ct">${c || ''}</span></button><button class="nb-more${menuOpen === key ? ' on' : ''}" data-nb-menu="${esc(key)}" aria-label="Options for ${esc(t)}" aria-expanded="${menuOpen === key}">⋯</button></div>` +
        (menuOpen === key ? `<div class="nb-tools"><button data-nb-do="rename" data-nb-key="${esc(key)}">Rename</button><button data-nb-do="up" data-nb-key="${esc(key)}" ${i === 0 ? 'disabled' : ''}>Move up</button><button data-nb-do="down" data-nb-key="${esc(key)}" ${i === ts.length - 1 ? 'disabled' : ''}>Move down</button>${total === 0 ? `<button class="dz" data-nb-do="remove" data-nb-key="${esc(key)}">Remove</button>` : ''}</div>` : '')
    }).join('') + (adding === 'type' ? '<input class="nb-rn" data-nb-add="type" placeholder="New folder name" aria-label="New folder name">' : '<button class="nb-addline" data-nb-do="addtype">+ Add folder</button>')
    $('#nb-act-ct').textContent = openActions().filter((x) => matches(x.n)).length || ''
    const cut = cutoff(); $('#nb-rec-ct').textContent = ns.filter((n) => (n.date || '') >= cut).length || ''
    $('#nb-tab-today').classList.toggle('on', sel.kind === 'today' && !sel.id)
    $('#nb-today-ct').textContent = (unopened().length + overdue().length) || ''
    $('#nb-tab-actions').classList.toggle('on', sel.kind === 'actions')
    $('#nb-tab-recent').classList.toggle('on', sel.kind === 'recent')
  }
  function focusRn() { setTimeout(() => { const r = root.querySelector('.nb-rn'); if (r) { r.focus(); r.select() } }, 0) }
  root.addEventListener('click', (e) => {
    const m = e.target.closest('[data-nb-menu]')
    if (m) { e.stopPropagation(); menuOpen = menuOpen === m.dataset.nbMenu ? null : m.dataset.nbMenu; m.dataset.nbMenu.startsWith('type|') ? renderTabs() : renderBinder(); return }
    const b = e.target.closest('[data-nb-do]'); if (!b || b.disabled) return
    const act = b.dataset.nbDo, key = b.dataset.nbKey || ''; const [kind, ...rest] = key.split('|')
    if (act === 'addtype') { adding = 'type'; renderTabs(); focusRn(); return }
    if (act === 'addgroup') { adding = 'group'; renderBinder(); focusRn(); return }
    if (act === 'rename') { renaming = key; menuOpen = null; kind === 'type' ? renderTabs() : renderBinder(); focusRn(); return }
    if (kind === 'type') { const t = rest.join('|'); if (act === 'up') moveType(t, -1); if (act === 'down') moveType(t, 1); if (act === 'remove') removeType(t); return }
    if (kind === 'group') { const T = rest[0], g = rest.slice(1).join('|'); if (act === 'up') moveGroup(T, g, -1); if (act === 'down') moveGroup(T, g, 1); if (act === 'remove') removeGroup(T, g) }
  })
  let committing = false
  async function commitRn(el, cancel) {
    if (committing || el.dataset.nbDone) return
    committing = true; el.dataset.nbDone = '1'
    const v = el.value, key = el.dataset.nbRn, add = el.dataset.nbAdd
    renaming = null; adding = null
    try {
      if (!cancel && v.trim()) {
        if (add === 'type') addType(v)
        else if (add === 'group') addGroup(sel.type, v)
        else if (key) { const [kind, ...rest] = key.split('|'); if (kind === 'type') await renameType(rest.join('|'), v); else await renameGroup(rest[0], rest.slice(1).join('|'), v) }
      }
    } finally { committing = false; renderTabs(); renderBinder() }
  }
  root.addEventListener('keydown', (e) => {
    const el = e.target
    if (!el.classList || !el.classList.contains('nb-rn')) return
    if (e.key === 'Enter') { e.preventDefault(); commitRn(el, false) } else if (e.key === 'Escape') { e.preventDefault(); commitRn(el, true) }
  })
  root.addEventListener('focusout', (e) => { const el = e.target; if (el.classList && el.classList.contains('nb-rn') && el.isConnected) commitRn(el, false) })

  $('.nb-tabs').addEventListener('click', (e) => {
    const t = e.target.closest('.nb-tab'); if (!t) return
    const k = t.dataset.nbK; menuOpen = null
    if (k === '__today') { sel.kind = 'today'; sel.id = null; sel.gview = null; app.dataset.view = 'page'; renderTabs(); renderBinder(); renderPage(); refreshToday(); return }
    if (k === '__actions') sel.kind = 'actions'; else if (k === '__recent') sel.kind = 'recent'; else { sel.kind = 'type'; sel.type = k }
    app.dataset.view = 'binder'; app.classList.remove('today'); renderTabs(); renderBinder()
  })

  /* ---------- filing status (calls Claude is filing, or couldn't) ---------- */
  function renderFiling() {
    const box = $('#nb-filing')
    const busy = Object.entries(filed).filter(([, r]) => r.state === 'filing')
    const bad = Object.entries(filed).filter(([, r]) => r.state === 'failed')
    let html = ''
    if (busy.length) html += `<div class="nb-filing">Claude is filing ${busy.length === 1 ? 'a call' : busy.length + ' calls'} into the notebook…</div>`
    if (bad.length) html += `<div class="nb-filing bad">${bad.length === 1 ? 'A call' : bad.length + ' calls'} couldn't be filed: ${esc(bad[0][1].error || 'unknown error')}. <button data-nb-call="${esc(bad[0][0])}">Try again</button> · <button data-nb-calls="1">See calls</button></div>`
    if (box._html !== html) { box.innerHTML = html; box._html = html }
  }
  $('#nb-filing').addEventListener('click', (e) => {
    const r = e.target.closest('[data-nb-call]'); if (r) { fileCall(r.dataset.nbCall); return }
    if (e.target.closest('[data-nb-calls]')) openCalls()
  })
  async function fileCall(call, quiet) {
    try {
      await ctx.call('file', { call })
      filed[call] = { ...(filed[call] || {}), state: 'filing' }
      renderFiling()
      if (!quiet) toast('Claude is filing the call. Its page appears in a minute or two.')
      setTimeout(load, 4000)
    } catch (e) { toast("Couldn't file the call: " + (e.message || e)) }
  }

  /* ---------- binder ---------- */
  function pageBtn(n, flat) {
    const sub = n.summary ? plain(n.summary).slice(0, 140) : n.source === 'manual' ? 'Manual note' : 'No summary yet'
    return `<button class="nb-pg${flat ? ' flat' : ''}${n.id === sel.id ? ' on' : ''}" data-nb-id="${esc(n.id)}"><span class="d">${esc(fmtDate(n.date))}</span><span class="t">${esc(n.title || 'Untitled')}</span><span class="s">${esc(flat ? n.type + ' · ' + (n.group || 'General') : sub)}</span></button>`
  }
  const MODE_LBL = { claude: 'Claude can do this', manual: 'Manual' }
  function renderBinder() {
    const box = $('#nb-binder')
    if (!loaded) return
    if (sel.kind === 'today') { $('#nb-btitle').textContent = 'Today'; box.innerHTML = ''; return }
    if (!sel.kind) {
      $('#nb-btitle').textContent = 'Notebook'
      box.innerHTML = allNotes().length ? '<div class="nb-empty">Choose a meeting type on the left.</div>' : '<div class="nb-empty"><b>No pages yet.</b><br>The next call Echo writes minutes for lands here. You can also file a call you already have with <b>File an Echo call…</b>, or start a page with <b>+ New page</b>.</div>'
      return
    }
    if (sel.kind === 'actions') {
      $('#nb-btitle').textContent = 'Open action items'
      const all = openActions().filter((x) => matches(x.n)), td = today()
      const cnt = (m) => all.filter((x) => m === 'all' || x.a.mode === m).length
      const list = all.filter((x) => modeFilter === 'all' || x.a.mode === modeFilter)
      const bar = `<div class="nb-mfilter" role="group" aria-label="Filter by how it gets done">${[['all', 'All'], ['claude', 'Claude can do'], ['manual', 'Manual']].map(([k, l]) => `<button data-nb-mf="${k}" class="${modeFilter === k ? 'on' : ''}">${l} ${cnt(k) || ''}</button>`).join('')}</div>`
      box.innerHTML = bar + (list.length ? list.map(({ n, a, i }) => `<div class="nb-ai"><input type="checkbox" aria-label="Mark done" data-nb-done="${esc(n.id)}|${i}"><div class="tx">${esc(a.text)}</div><div class="mt">${a.mode ? `<span class="nb-mode ${esc(a.mode)}" style="cursor:default"><span class="dot"></span>${esc(MODE_LBL[a.mode] || a.mode)}</span>` : ''}${a.owner ? `<span>${esc(a.owner)}</span>` : ''}${a.due ? `<span class="${a.due < td ? 'od' : ''}">due ${esc(fmtDate(a.due))}</span>` : ''}${a.mode === 'claude' && a.prompt ? `<button data-nb-cp="${esc(n.id)}|${i}">Copy prompt</button>` : ''}<button data-nb-open="${esc(n.id)}">${esc(n.title || n.group || 'Open page')} · ${esc(fmtDate(n.date))}</button></div>${a.mode === 'claude' && a.prompt ? `<div class="pv">${esc(a.prompt)}</div>` : a.mode === 'manual' && a.how ? `<div class="mt">${esc(a.how)}</div>` : ''}</div>`).join('') : '<div class="nb-empty">No open action items here.</div>')
      return
    }
    let ns = allNotes().filter(matches)
    if (sel.kind === 'recent') {
      $('#nb-btitle').textContent = query ? 'Search results' : 'Last 14 days'
      const cut = cutoff()
      if (!query) ns = ns.filter((n) => (n.date || '') >= cut)
      ns.sort(byDateDesc)
      box.innerHTML = ns.length ? `<div style="padding-top:6px">${ns.map((n) => pageBtn(n, true)).join('')}</div>` : `<div class="nb-empty">${query ? 'No pages match your search.' : 'Nothing in the last 14 days.'}</div>`
      return
    }
    const T = sel.type; $('#nb-btitle').textContent = T
    const { names, groups } = groupsOf(T, ns)
    const gs = (meta.groupSort || {})[T] || 'recent'
    const bar = `<div class="nb-sortbar"><label for="nb-gsort">Subfolders</label><select id="nb-gsort"><option value="recent"${gs === 'recent' ? ' selected' : ''}>Most recent</option><option value="az"${gs === 'az' ? ' selected' : ''}>A–Z</option><option value="custom"${gs === 'custom' ? ' selected' : ''}>Custom order</option></select><label for="nb-psort">Pages</label><select id="nb-psort"><option value="newest"${meta.pageSort !== 'oldest' ? ' selected' : ''}>Newest first</option><option value="oldest"${meta.pageSort === 'oldest' ? ' selected' : ''}>Oldest first</option></select></div>`
    const addl = query ? '' : adding === 'group' ? '<div class="nb-rnwrap"><input class="nb-rn" data-nb-add="group" placeholder="New subfolder name" aria-label="New subfolder name"></div>' : '<button class="nb-addline" data-nb-do="addgroup">+ Add subfolder</button>'
    if (!names.length) { box.innerHTML = bar + `<div class="nb-empty">No ${esc(T)} pages${query ? ' match your search' : ' yet'}.</div>` + addl; bindSort(T); return }
    if (query || names.length <= 3) names.forEach((g) => openGroups.add(T + '|' + g))
    if (sel.id && notes[sel.id] && notes[sel.id].type === T) openGroups.add(T + '|' + (notes[sel.id].group || 'General'))
    box.innerHTML = bar + names.map((g, i) => {
      const k = T + '|' + g, key = 'group|' + k, arr = groups[g], o = openGroups.has(k)
      if (renaming === key) return `<div class="nb-group"><div class="nb-rnwrap"><input class="nb-rn" data-nb-rn="${esc(key)}" value="${esc(g)}" aria-label="Rename subfolder ${esc(g)}"></div></div>`
      return `<div class="nb-group${o ? ' open' : ''}"><div class="nb-ghrow"><button class="nb-ghead${sel.gview && !sel.id && sel.gview.T === T && sel.gview.g === g ? ' on' : ''}" data-nb-g="${esc(k)}" title="Open the subfolder overview" aria-expanded="${o}"><span class="car">›</span><span>${esc(g)}</span><span class="ct">${arr.length || ''}</span></button><button class="nb-more${menuOpen === key ? ' on' : ''}" data-nb-menu="${esc(key)}" aria-label="Options for ${esc(g)}" aria-expanded="${menuOpen === key}" style="margin-right:8px">⋯</button></div>` +
        (menuOpen === key ? `<div class="nb-tools"><button data-nb-do="rename" data-nb-key="${esc(key)}">Rename</button><button data-nb-do="up" data-nb-key="${esc(key)}" ${i === 0 ? 'disabled' : ''}>Move up</button><button data-nb-do="down" data-nb-key="${esc(key)}" ${i === names.length - 1 ? 'disabled' : ''}>Move down</button>${arr.length === 0 ? `<button class="dz" data-nb-do="remove" data-nb-key="${esc(key)}">Remove</button>` : ''}</div>` : '') +
        `<div class="nb-pages">${arr.length ? arr.map((n) => pageBtn(n, false)).join('') : '<div class="nb-gempty">Empty. Move a page here with its “Client / person / group” field.</div>'}</div></div>`
    }).join('') + addl
    bindSort(T)
  }
  function bindSort(T) {
    const g = $('#nb-gsort'), p = $('#nb-psort'), L = { recent: 'most recent first', az: 'A–Z', custom: 'your custom order' }
    if (g) g.onchange = () => {
      if (g.value === 'custom' && !((meta.groupOrder || {})[T] || []).length) meta.groupOrder[T] = groupsOf(T).names
      meta.groupSort = { ...meta.groupSort, [T]: g.value }; saveLocalSort(); renderBinder(); toast('Subfolders sorted ' + L[g.value])
      saveMeta({ groupSort: meta.groupSort, groupOrder: meta.groupOrder })
    }
    if (p) p.onchange = () => { meta.pageSort = p.value; saveLocalSort(); renderBinder(); if (sel.gview && !sel.id) renderPage(); toast(p.value === 'oldest' ? 'Pages sorted oldest first' : 'Pages sorted newest first'); saveMeta({ pageSort: meta.pageSort }) }
  }
  $('#nb-binder').addEventListener('click', (e) => {
    const g = e.target.closest('.nb-ghead')
    if (g) {
      const k = g.dataset.nbG, wide = innerWidth > 860
      if (e.target.closest('.car') || !wide) { openGroups.has(k) ? openGroups.delete(k) : openGroups.add(k); renderBinder(); return }
      openGroups.add(k); openGroup(sel.type, k.slice(sel.type.length + 1)); return
    }
    const mf = e.target.closest('[data-nb-mf]'); if (mf) { modeFilter = mf.dataset.nbMf; renderBinder(); return }
    const cp = e.target.closest('[data-nb-cp]'); if (cp) { const [id, i] = cp.dataset.nbCp.split('|'); const a = ((notes[id] || {}).actions || [])[+i]; if (a) copyText(a.prompt || a.text || ''); return }
    const p = e.target.closest('[data-nb-id],[data-nb-open]'); if (p) openPage(p.dataset.nbId || p.dataset.nbOpen)
  })
  $('#nb-binder').addEventListener('change', (e) => {
    const c = e.target.closest('[data-nb-done]'); if (!c) return
    const [id, i] = c.dataset.nbDone.split('|'); if (!notes[id]) return
    markDone(id, +i, true); toast('Marked done'); renderTabs(); setTimeout(renderBinder, 300)
  })
  function openGroup(T, g) { sel.gview = { T, g }; sel.id = null; gq = ''; app.dataset.view = 'page'; renderBinder(); renderPage(); $('.nb-page').scrollTop = 0 }
  function openPage(id) {
    const n = notes[id]
    if (n && (sel.kind === 'today' || sel.kind == null)) { sel.kind = 'type'; sel.type = n.type }
    app.classList.remove('today')
    sel.id = id; app.dataset.view = 'page'; renderTabs(); renderBinder(); renderPage(); $('.nb-page').scrollTop = 0
    // Opened: no longer "not opened yet" (a re-filing to review stays until it is reviewed).
    if (n && n.reviewed === false && !n.review) { n.reviewed = true; ctx.call('seen', { id }).catch(() => {}); renderTabs() }
    if (n && n.call) syncEcho(id, true)
  }
  $('#nb-back1').onclick = () => { app.dataset.view = 'tabs' }

  /* ---------- page ---------- */
  function grow(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px' }
  const IC = {
    ul: '<svg viewBox="0 0 16 16"><circle cx="3" cy="4" r=".9" fill="currentColor"/><circle cx="3" cy="8" r=".9" fill="currentColor"/><circle cx="3" cy="12" r=".9" fill="currentColor"/><path d="M6 4h8M6 8h8M6 12h8"/></svg>',
    ol: '<svg viewBox="0 0 16 16"><path d="M2 3h1.2v3M2 6h2.4M2 10.2c.3-.6 2.2-.8 2.1.3-.1.8-2.1 1.5-2.1 2.5h2.3M6.5 4h7.5M6.5 8h7.5M6.5 12h7.5"/></svg>',
    ind: '<svg viewBox="0 0 16 16"><path d="M2 3h12M7 6.5h7M7 9.5h7M2 13h12M2 6l2.5 2L2 10"/></svg>',
    out: '<svg viewBox="0 0 16 16"><path d="M2 3h12M7 6.5h7M7 9.5h7M2 13h12M4.5 6L2 8l2.5 2"/></svg>',
    clr: '<svg viewBox="0 0 16 16"><path d="M4 3h8M8 3l-2 10M3 14l10-10"/></svg>',
    img: '<svg viewBox="0 0 16 16"><rect x="2" y="3" width="12" height="10" rx="1.5"/><circle cx="6" cy="7" r="1.1"/><path d="M2.5 12l3.5-3.5 2.5 2.5 2-2 3 3"/></svg>',
  }
  /* images in My notes: kept in the page as small JPEGs (each save goes to Echo in one request) */
  async function shrink(file) {
    const bmp = await createImageBitmap(file); const sc = Math.min(1, 1100 / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bmp.width * sc)); c.height = Math.max(1, Math.round(bmp.height * sc))
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.72)
  }
  async function insertImages(ed, files, save) {
    for (const f of files) {
      try {
        toast('Adding image…')
        const src = await shrink(f)
        if (src.length > 220000) { toast('That image is too large to keep here. Try a smaller screenshot.'); continue }
        ed.focus(); document.execCommand('insertHTML', false, '<img src="' + src + '" alt="Pasted image"><p><br></p>')
        save(); toast('Image added')
      } catch (err) { toast("Couldn't add image: " + ((err && (err.message || err.code)) || err)) }
    }
  }
  function pickImages(ed, save) { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.multiple = true; i.onchange = () => { const fs = [...i.files].filter((f) => /^image\//.test(f.type)); if (fs.length) insertImages(ed, fs, save) }; i.click() }
  root.addEventListener('dblclick', (e) => {
    const im = e.target.closest && e.target.closest('.nb-rte img'); if (!im) return
    const o = document.createElement('div'); o.className = 'nb-lightbox'; const x = document.createElement('img'); x.src = im.src; o.appendChild(x); o.onclick = () => o.remove(); root.appendChild(o)
  })
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const l = root.querySelector('.nb-lightbox'); if (l) l.remove() } })

  function people() {
    const m = new Map()
    const add = (v) => { v = (v || '').trim(); if (!v) return; const k = v.toLowerCase(); m.set(k, m.get(k) || { v, c: 0 }); m.get(k).c++ }
    if (me) add(me)
    allNotes().forEach((n) => { (n.attendees || []).forEach(add); (n.actions || []).forEach((a) => add(a.owner)); if (n.type === '1:1') add(n.group) })
    return [...m.values()].sort((a, b) => b.c - a.c || a.v.localeCompare(b.v)).map((x) => x.v)
  }
  /* writable dropdown: type anything, or pick from what's already in the notebook */
  function combo(input, getOpts, evt, multi) {
    const wrap = input.parentNode; let list = null, idx = -1, items = [], typed = false
    const token = () => (multi ? input.value.split(',').pop().trim() : input.value.trim())
    function close() { if (list) { list.remove(); list = null } idx = -1 }
    function open() {
      const q = typed ? token().toLowerCase() : '', all = getOpts()
      const used = multi ? input.value.split(',').slice(0, -1).map((x) => x.trim().toLowerCase()) : []
      items = []; let html = '', pendingHead = null
      all.forEach((o) => {
        if (o.head) { pendingHead = o.head; return }
        if (used.includes(o.v.toLowerCase())) return
        if (q && !o.v.toLowerCase().includes(q)) return
        if (pendingHead) { html += `<div class="nb-cb-head">${esc(pendingHead)}</div>`; pendingHead = null }
        html += `<button type="button" class="nb-cb-opt" data-nb-i="${items.length}">${o.c ? `<span class="sw" style="--c:${o.c}"></span>` : ''}<span>${esc(o.v)}</span>${o.hint ? `<span class="hint">${esc(o.hint)}</span>` : ''}</button>`; items.push(o.v)
      })
      const t = token()
      if (t && !all.some((o) => !o.head && o.v.toLowerCase() === t.toLowerCase())) { html += `<button type="button" class="nb-cb-opt new" data-nb-i="${items.length}">+ Use “${esc(t)}”</button>`; items.push(t) }
      if (!items.length) html = '<div class="nb-cb-empty">Type to add a new one</div>'
      if (!list) {
        list = document.createElement('div'); list.className = 'nb-cb-list'; list.setAttribute('role', 'listbox'); wrap.appendChild(list)
        list.addEventListener('mousedown', (e) => e.preventDefault())
        list.addEventListener('click', (e) => { const b = e.target.closest('.nb-cb-opt'); if (b) pick(+b.dataset.nbI) })
      }
      list.innerHTML = html; idx = -1
    }
    function hi() { if (!list) return; list.querySelectorAll('.nb-cb-opt').forEach((b, i) => b.classList.toggle('act', i === idx)); const a = list.querySelector('.nb-cb-opt.act'); if (a) a.scrollIntoView({ block: 'nearest' }) }
    function pick(i) {
      const v = items[i]; if (v == null) return
      if (multi) { const parts = input.value.split(',').slice(0, -1).map((x) => x.trim()).filter(Boolean); parts.push(v); input.value = parts.join(', ') + ', ' } else input.value = v
      typed = false; close(); input.dispatchEvent(new Event('input', { bubbles: true })); if (evt === 'change') input.dispatchEvent(new Event('change', { bubbles: true }))
      if (multi) { input.focus(); open() } else input.blur()
    }
    input.addEventListener('focus', () => { typed = false; open() })
    input.addEventListener('input', (e) => { if (e.isTrusted) { typed = true; open() } })
    input.addEventListener('blur', () => setTimeout(close, 120))
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (!list) open(); idx = Math.min(idx + 1, items.length - 1); hi() }
      else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(idx - 1, 0); hi() }
      else if (e.key === 'Enter') { if (list && idx >= 0) { e.preventDefault(); pick(idx) } else if (evt === 'change') { e.preventDefault(); close(); input.blur() } }
      else if (e.key === 'Escape') close()
    })
    const btn = wrap.querySelector('.nb-cb-btn')
    if (btn) { btn.addEventListener('mousedown', (e) => e.preventDefault()); btn.addEventListener('click', () => { if (list) close(); else { input.focus(); typed = false; open() } }) }
  }
  function rteHtml(field, val, ph) {
    return `<div class="nb-rtebox"><div class="nb-tb" role="toolbar" aria-label="Formatting">
  <button data-nb-cmd="bold" title="Bold (⌘B)" aria-label="Bold"><b>B</b></button>
  <button data-nb-cmd="italic" title="Italic (⌘I)" aria-label="Italic"><i style="font-family:var(--f-body)">I</i></button>
  <button data-nb-cmd="underline" title="Underline (⌘U)" aria-label="Underline"><u>U</u></button>
  <span class="sep"></span>
  <button data-nb-hl="y" title="Highlight yellow (⌘⇧H)" aria-label="Highlight yellow"><span class="hl" style="background:var(--hl-y)"></span></button>
  <button data-nb-hl="g" title="Highlight green" aria-label="Highlight green"><span class="hl" style="background:var(--hl-g)"></span></button>
  <button data-nb-hl="p" title="Highlight pink" aria-label="Highlight pink"><span class="hl" style="background:var(--hl-p)"></span></button>
  <span class="sep"></span>
  <button data-nb-cmd="insertUnorderedList" title="Bulleted list (type - then space)" aria-label="Bulleted list">${IC.ul}</button>
  <button data-nb-cmd="insertOrderedList" title="Numbered list (type 1. then space)" aria-label="Numbered list">${IC.ol}</button>
  <button data-nb-cmd="indent" title="Indent (Tab in a list)" aria-label="Indent">${IC.ind}</button>
  <button data-nb-cmd="outdent" title="Outdent (Shift+Tab)" aria-label="Outdent">${IC.out}</button>
  <button data-nb-cmd="h4" title="Heading" aria-label="Heading" style="font-weight:600;font-size:12px">H</button>
  <span class="sep"></span>
  <button data-nb-cmd="clear" title="Clear formatting" aria-label="Clear formatting">${IC.clr}</button>${field === 'myNotes' ? `<span class="sep"></span><button data-nb-cmd="img" title="Add image (or paste / drag one in)" aria-label="Add image">${IC.img}</button>` : ''}
</div><div class="nb-rte" contenteditable="true" data-nb-field="${field}" data-nb-ph="${esc(ph)}" spellcheck="true">${toHtml(val)}</div></div>`
  }
  function inside(node, tag, rt) { while (node && node !== rt) { if (node.nodeType === 1 && node.tagName === tag) return node; node = node.parentNode } return null }
  function unwrap(el) { const p = el.parentNode; while (el.firstChild) p.insertBefore(el.firstChild, el); p.removeChild(el) }
  function highlight(ed, color) {
    const s = getSelection(); if (!s.rangeCount) return
    const r = s.getRangeAt(0); if (!ed.contains(r.commonAncestorContainer)) return
    const m = inside(r.startContainer, 'MARK', ed) || inside(r.endContainer, 'MARK', ed)
    if (m && (m.className || 'y') === color && r.collapsed) { unwrap(m); return }
    if (r.collapsed) { if (m) unwrap(m); return }
    ed.querySelectorAll('mark').forEach((x) => { if (r.intersectsNode(x)) unwrap(x) })
    if (m && (m.className || 'y') === color) return
    const frag = r.extractContents(); const mk = document.createElement('mark'); if (color !== 'y') mk.className = color; mk.appendChild(frag); r.insertNode(mk)
    s.removeAllRanges(); const nr = document.createRange(); nr.selectNodeContents(mk); s.addRange(nr)
  }
  function updTb(ed) {
    const tb = ed.parentNode.querySelector('.nb-tb'); if (!tb) return
    ;['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList'].forEach((c) => { const b = tb.querySelector(`[data-nb-cmd="${c}"]`); let on = false; try { on = document.queryCommandState(c) } catch { /* not supported */ } if (b) b.classList.toggle('on', on && ed.contains(document.activeElement)) })
    const s = getSelection(); const h = s.rangeCount && inside(s.anchorNode, 'H4', ed); tb.querySelector('[data-nb-cmd="h4"]').classList.toggle('on', !!h)
  }
  function caretStrip(n, off) { const rest = n.nodeValue.slice(off); n.nodeValue = rest || '​'; const r = document.createRange(); r.setStart(n, 0); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r) }
  function bindRte(ed, id) {
    const field = ed.dataset.nbField, save = () => { queue(id, { [field]: sanitize(ed.innerHTML) }) }
    const tb = ed.parentNode.querySelector('.nb-tb')
    tb.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault() })
    tb.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return
      ed.focus()
      if (b.dataset.nbCmd === 'img') { pickImages(ed, save); return }
      try { document.execCommand('defaultParagraphSeparator', false, 'p') } catch { /* old engine */ }
      if (b.dataset.nbHl) highlight(ed, b.dataset.nbHl)
      else if (b.dataset.nbCmd === 'h4') { const s = getSelection(); const h = s.rangeCount && inside(s.anchorNode, 'H4', ed); document.execCommand('formatBlock', false, h ? 'p' : 'h4') }
      else if (b.dataset.nbCmd === 'clear') {
        document.execCommand('removeFormat'); const s = getSelection()
        if (s.rangeCount) { const r = s.getRangeAt(0); ed.querySelectorAll('mark').forEach((x) => { if (r.intersectsNode(x)) unwrap(x) }); const h = inside(s.anchorNode, 'H4', ed); if (h) document.execCommand('formatBlock', false, 'p') }
      } else document.execCommand(b.dataset.nbCmd)
      save(); updTb(ed)
    })
    ed.addEventListener('focus', () => { try { document.execCommand('defaultParagraphSeparator', false, 'p') } catch { /* old engine */ } })
    ed.addEventListener('input', () => { save(); updTb(ed) })
    ed.addEventListener('keyup', () => updTb(ed)); ed.addEventListener('mouseup', () => updTb(ed)); ed.addEventListener('blur', () => updTb(ed))
    ed.addEventListener('keydown', (e) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.shiftKey && (e.key === 'h' || e.key === 'H')) { e.preventDefault(); highlight(ed, 'y'); save(); return }
      if (mod && e.shiftKey && e.key === '8') { e.preventDefault(); document.execCommand('insertUnorderedList'); save(); return }
      if (mod && e.shiftKey && e.key === '7') { e.preventDefault(); document.execCommand('insertOrderedList'); save(); return }
      if (e.key === 'Tab') { const s = getSelection(); if (s.rangeCount && inside(s.anchorNode, 'LI', ed)) { e.preventDefault(); document.execCommand(e.shiftKey ? 'outdent' : 'indent'); save() } return }
      if (e.key === ' ') {
        const s = getSelection(); if (!s.rangeCount || !s.isCollapsed) return
        const n = s.anchorNode; if (!n || n.nodeType !== 3 || inside(n, 'LI', ed)) return
        const before = n.nodeValue.slice(0, s.anchorOffset), atStart = !n.previousSibling
        if (atStart && /^\s*[-*•]$/.test(before)) { e.preventDefault(); caretStrip(n, s.anchorOffset); document.execCommand('insertUnorderedList'); save() }
        else if (atStart && /^\s*1[.)]$/.test(before)) { e.preventDefault(); caretStrip(n, s.anchorOffset); document.execCommand('insertOrderedList'); save() }
      }
    })
    if (field === 'myNotes') {
      const imgs = (dt) => [...((dt && dt.files) || [])].filter((f) => /^image\//.test(f.type))
      ed.addEventListener('dragover', (e) => { if ([...((e.dataTransfer && e.dataTransfer.types) || [])].includes('Files')) e.preventDefault() })
      ed.addEventListener('drop', (e) => { const fs = imgs(e.dataTransfer); if (!fs.length) return; e.preventDefault(); insertImages(ed, fs, save) })
    }
    ed.addEventListener('paste', (e) => {
      if (field === 'myNotes') { const fs = [...((e.clipboardData && e.clipboardData.files) || [])].filter((f) => /^image\//.test(f.type)); if (fs.length) { e.preventDefault(); insertImages(ed, fs, save); return } }
      const html = e.clipboardData && e.clipboardData.getData('text/html'), txt = e.clipboardData && e.clipboardData.getData('text/plain')
      e.preventDefault(); document.execCommand('insertHTML', false, html ? sanitize(html) : toHtml(txt || '')); save()
    })
  }
  /* action mode: "claude" (Claude can do or draft it; prompt ready to paste) or "manual" (a person has to do it) */
  function modeBtn(a, attr) {
    const m = a.mode === 'claude' || a.mode === 'manual' ? a.mode : ''
    return `<button class="nb-mode ${m}" ${attr} title="${m ? 'Click to switch' : 'Tag how this gets done'}"><span class="dot"></span>${m ? MODE_LBL[m] : 'Tag: Claude or manual'}</button>`
  }
  const RUN_STATE = { running: 'Claude is drafting…', done: 'Draft ready', failed: "Couldn't draft" }
  function howHtml(a, i) {
    const m = a.mode, n = notes[sel.id] || {}, run = a.run
    return `<div class="nb-how">${modeBtn(a, `data-nb-actm="${i}"`)}${m === 'claude' ? `<button class="nb-run" data-nb-runopen="${i}">${run && run.answer ? 'Open draft' : 'Run with Claude'}</button><button class="nb-cpy" data-nb-actc="${i}">Copy prompt</button>` : ''}${run && RUN_STATE[run.state] ? `<span class="nb-runstate">${RUN_STATE[run.state]}</span>` : ''}${m === 'manual' && a.how ? `<span style="font-size:12px;color:var(--muted)">${esc(a.how)}</span>` : ''}${a.t != null && n.call ? tsBtn(n.call, a.t) : ''}${n.call && !a.echoId ? '<span class="nb-only" title="Echo\'s own list of this call\'s actions doesn\'t have this one">Notebook only</span>' : ''}</div>` +
      (m === 'claude' ? `<textarea class="pr nb-wrap" rows="1" data-nb-actp="${i}" placeholder="Prompt to paste into Claude" aria-label="Claude prompt">${esc(a.prompt || '')}</textarea>` : '')
  }
  async function copyText(t, msg) {
    msg = msg || 'Prompt copied. Paste it into Claude.'
    try { await navigator.clipboard.writeText(t); toast(msg) } catch {
      try { const ta = document.createElement('textarea'); ta.value = t; root.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast(msg) } catch { toast("Couldn't copy. Select the text instead.") }
    }
  }
  /* ---------- subfolder overview: highlights from the last call + search inside this subfolder ---------- */
  function snippet(n, q) {
    const txt = [plain(n.summary), plain(n.myNotes), (n.decisions || []).join(' '), (n.actions || []).map((a) => a.text).join(' '), (n.attendees || []).join(', ')].filter((x) => x && x.trim()).join('  ·  ')
    if (!q) return esc(txt.slice(0, 160))
    const i = txt.toLowerCase().indexOf(q.toLowerCase()); if (i < 0) return esc(txt.slice(0, 160))
    const a = Math.max(0, i - 70), b = Math.min(txt.length, i + q.length + 90)
    return (a > 0 ? '…' : '') + esc(txt.slice(a, i)) + '<mark>' + esc(txt.slice(i, i + q.length)) + '</mark>' + esc(txt.slice(i + q.length, b)) + (b < txt.length ? '…' : '')
  }
  const hit = (n, q) => [n.title, plain(n.summary), plain(n.myNotes), (n.attendees || []).join(' '), (n.decisions || []).join(' '), (n.actions || []).map((a) => (a.text || '') + ' ' + (a.owner || '')).join(' ')].join(' ').toLowerCase().includes(q.toLowerCase())
  const gRow = (n, q) => `<button class="nb-gpg" data-nb-open="${esc(n.id)}"><span class="d">${esc(fmtDate(n.date))}</span><span class="t">${esc(n.title || 'Untitled')}</span><span class="s">${snippet(n, q)}</span></button>`
  function renderGroup() {
    const s = $('#nb-sheet'), { T, g } = sel.gview
    const arr = allNotes().filter((n) => n.type === T && (n.group || 'General') === g).sort(byDateDesc)
    if (!arr.length) { s.innerHTML = `<div class="nb-crumbs"><span class="nb-chip" style="--c:${colorOf(T)}"><span class="sw"></span>${esc(T)}</span><span>›</span><span>${esc(g)}</span></div><h1 class="nb-gtitle">${esc(g)}</h1><div class="nb-empty">No pages in this subfolder yet.</div>`; s.onclick = null; return }
    const last = arr[0], td = today()
    const hl = last.summary ? stampify(toHtml(last.summary), last.call) : last.myNotes ? `<p>${esc(plain(last.myNotes).slice(0, 700))}${plain(last.myNotes).length > 700 ? '…' : ''}</p>` : '<p>No summary was written for this call.</p>'
    const lastDec = (last.decisions || []).filter(Boolean)
    const acts = []; arr.forEach((n) => (n.actions || []).forEach((a, i) => { if (!a.done && a.text) acts.push({ n, a, i }) }))
    acts.sort((x, y) => (x.a.due || '9999').localeCompare(y.a.due || '9999') || byDateDesc(x.n, y.n))
    const ordered = meta.pageSort === 'oldest' ? [...arr].reverse() : arr
    s.innerHTML = `
  <button class="nb-back" id="nb-back2">‹ ${esc(T)}</button>
  <div class="nb-crumbs"><span class="nb-chip" style="--c:${colorOf(T)}"><span class="sw"></span>${esc(T)}</span><span>›</span><span>${esc(g)}</span></div>
  <h1 class="nb-gtitle">${esc(g)}</h1>
  <div class="nb-src">${arr.length} page${arr.length > 1 ? 's' : ''} · last call ${esc(fmtDate(last.date))}${arr.length > 1 ? ' · first ' + esc(fmtDate(arr[arr.length - 1].date)) : ''}</div>
  <div class="nb-gsearch"><input class="nb-search" id="nb-gq" type="search" placeholder="Search only in ${esc(g)}" aria-label="Search only in ${esc(g)}" value="${esc(gq)}" autocomplete="off"></div>
  <div id="nb-gres"></div>
  <div id="nb-gbody">
    <section class="nb-hlcard" aria-label="Highlights from the last call">
      <div class="eyebrow">Highlights from the last call · ${esc(fmtDate(last.date))}${last.start ? ' · ' + esc(last.start) : ''}</div>
      <h2><button class="nb-lnk" data-nb-open="${esc(last.id)}">${esc(last.title || 'Untitled')}</button></h2>
      <div class="nb-rte ro">${hl}</div>
      ${lastDec.length ? `<h4 class="mini">Decisions</h4><ul class="nb-dlist">${lastDec.map((d) => `<li>${stampify(esc(d), last.call)}</li>`).join('')}</ul>` : ''}
      <button class="nb-lnk sm" data-nb-open="${esc(last.id)}">Open the full page ›</button>
    </section>
    <div class="nb-sec"><h3>Open action items <span class="n">${acts.length || ''}</span></h3>
      ${acts.length ? acts.map(({ n, a, i }) => `<div class="nb-ai"><input type="checkbox" aria-label="Mark done" data-nb-gdone="${esc(n.id)}|${i}"><div class="tx">${esc(a.text)}</div><div class="mt">${a.owner ? `<span>${esc(a.owner)}</span>` : ''}${a.due ? `<span class="${a.due < td ? 'od' : ''}">due ${esc(fmtDate(a.due))}</span>` : ''}<button data-nb-open="${esc(n.id)}">${esc(fmtDate(n.date))}</button></div></div>`).join('') : '<div class="nb-gempty" style="padding-left:0">Nothing open with this person or client.</div>'}</div>
    <div class="nb-sec"><h3>All pages <span class="n">${arr.length}</span></h3><div class="nb-glist">${ordered.map((n) => gRow(n, '')).join('')}</div></div>
  </div>`
    const q = $('#nb-gq')
    const run = () => {
      gq = q.value.trim(); const res = $('#nb-gres'), body = $('#nb-gbody')
      if (!gq) { res.innerHTML = ''; body.hidden = false; return }
      const m = arr.filter((n) => hit(n, gq)); body.hidden = true
      res.innerHTML = `<div class="nb-sec" style="margin-top:14px"><h3>${m.length} match${m.length === 1 ? '' : 'es'} in ${esc(g)}</h3>${m.length ? `<div class="nb-glist">${m.map((n) => gRow(n, gq)).join('')}</div>` : `<div class="nb-gempty" style="padding-left:0">Nothing in ${esc(g)} mentions “${esc(gq)}”.</div>`}</div>`
    }
    q.addEventListener('input', run); if (gq) run()
    s.onclick = (e) => { const o = e.target.closest('[data-nb-open]'); if (o) openPage(o.dataset.nbOpen) }
    s.onchange = (e) => {
      const c = e.target.closest('[data-nb-gdone]'); if (!c) return
      const [id, i] = c.dataset.nbGdone.split('|'); if (!notes[id]) return
      markDone(id, +i, true); toast('Marked done'); renderTabs(); setTimeout(() => { if (sel.gview && !sel.id) renderGroup() }, 300)
    }
    s.oninput = null
    $('#nb-back2').onclick = () => { app.dataset.view = 'binder' }
  }
  function sourceLine(n) {
    if (n.source === 'manual') return 'Written by you'
    if (n.source === 'import') return 'Imported from a PDF of notes'
    if (n.source === 'echo') return `Minutes drafted by Claude from Echo's recording${n.hasTranscript === false ? ' (no transcript was available)' : ''}`
    return `Minutes drafted by Claude from the ${n.hasTranscript === false ? 'calendar invite (no transcript was available)' : 'Teams transcript'}`
  }
  function renderPage() {
    const showToday = sel.kind === 'today' && !sel.id
    app.classList.toggle('today', showToday)
    if (showToday) { renderToday(); return }
    const tb = $('#nb-todaybox'); if (tb) tb.hidden = true
    $('#nb-sheet').hidden = false
    if (!sel.id && sel.gview) { renderGroup(); return }
    const s = $('#nb-sheet'), n = notes[sel.id]
    if (!n) {
      if (sel.id) sel.id = null
      if (!s.querySelector('.nb-empty')) s.innerHTML = '<div class="nb-empty">Pick a page on the left, or use <b>+ New page</b>.</div>'
      return
    }
    const acts = n.actions || [], decs = n.decisions || [], open = acts.filter((a) => !a.done).length
    const busy = n.call && filed[n.call] && filed[n.call].state === 'filing'
    s.innerHTML = `${reviewHtml(n)}
  <button class="nb-back" id="nb-back2">‹ ${esc(n.group || 'Back')}</button>
  <div class="nb-crumbs"><span class="nb-chip" style="--c:${colorOf(n.type)}"><span class="sw"></span>${esc(n.type || 'Other')}</span><span>›</span><button class="nb-crumbg" data-nb-gopen="1">${esc(n.group || 'General')}</button><span>›</span><span>${esc(fmtDate(n.date))}${n.start ? ' · ' + esc(n.start) + (n.end ? '–' + esc(n.end) : '') : ''}</span></div>
  <input class="nb-ttl" id="nb-f-title" value="${esc(n.title || '')}" placeholder="Untitled meeting" aria-label="Title">
  <div class="nb-meta">
    <div class="nb-field"><label for="nb-f-type">Type</label><span class="nb-cb"><input id="nb-f-type" autocomplete="off" value="${esc(n.type || '')}"><button class="nb-cb-btn" tabindex="-1" aria-label="Show folders">▼</button></span></div>
    <div class="nb-field"><label for="nb-f-group">Client / person / group</label><span class="nb-cb"><input id="nb-f-group" autocomplete="off" value="${esc(n.group || '')}"><button class="nb-cb-btn" tabindex="-1" aria-label="Show subfolders">▼</button></span></div>
    <div class="nb-field"><label for="nb-f-date">Date</label><input id="nb-f-date" type="date" value="${esc(n.date || '')}"></div>
  </div>
  <div class="nb-src"><span>${esc(sourceLine(n))}${n.updatedAt ? ' · updated ' + esc(new Date(n.updatedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) : ''}</span>${n.call ? `<button data-nb-echo="1">Open the call in Echo</button><button data-nb-refile="1" ${busy ? 'disabled' : ''}>${busy ? 'Filing…' : 'File again from the call'}</button>` : ''}</div>
  <div class="nb-sec" data-nb-s="att"><h3><button class="nb-sh" aria-expanded="true"><span class="car">›</span>Attendees <span class="n">${(n.attendees || []).length || ''}</span></button></h3>
    <div class="nb-attend nb-cb"><input id="nb-f-att" autocomplete="off" value="${esc((n.attendees || []).join(', '))}" placeholder="Names, separated by commas" aria-label="Attendees"><button class="nb-cb-btn" tabindex="-1" aria-label="Show people">▼</button></div></div>
  <div class="nb-sec" data-nb-s="sum"><h3><button class="nb-sh" aria-expanded="true"><span class="car">›</span>Summary</button></h3>${rteHtml('summary', n.summary, 'What was this meeting about?')}</div>
  <div class="nb-sec" data-nb-s="dec"><h3><button class="nb-sh" aria-expanded="true"><span class="car">›</span>Decisions <span class="n">${decs.length || ''}</span></button></h3>
    <div class="nb-list">${decs.map((d, i) => `<div class="nb-row"><span class="bullet"></span><textarea class="nb-wrap" rows="1" data-nb-dec="${i}" aria-label="Decision ${i + 1}">${esc(d)}</textarea>${n.call && tParse(d) != null ? tsBtn(n.call, tParse(d)) : ''}<button class="nb-x" data-nb-decx="${i}" aria-label="Remove decision">✕</button></div>`).join('')}</div>
    <button class="nb-add" id="nb-add-dec">+ Add decision</button></div>
  <div class="nb-sec" data-nb-s="act"><h3><button class="nb-sh" aria-expanded="true"><span class="car">›</span>Action items <span class="n">${open ? open + ' open' : ''}</span></button></h3>
    <div class="nb-list">${acts.map((a, i) => `<div class="nb-act${a.done ? ' done' : ''}"><input type="checkbox" data-nb-actd="${i}" ${a.done ? 'checked' : ''} aria-label="Done"><div class="nb-txc"><textarea class="tx nb-wrap" rows="1" data-nb-actt="${i}" placeholder="What needs doing" aria-label="Action">${esc(a.text || '')}</textarea>${howHtml(a, i)}</div><span class="nb-cb nb-ow-wrap"><input type="text" class="ow" data-nb-acto="${i}" autocomplete="off" value="${esc(a.owner || '')}" placeholder="Owner" aria-label="Owner"><button class="nb-cb-btn" tabindex="-1" aria-label="Show people">▼</button></span><input type="date" class="du" data-nb-actu="${i}" value="${esc(a.due || '')}" aria-label="Due date"><button class="nb-x" data-nb-actx="${i}" aria-label="Remove action">✕</button></div>`).join('')}</div>
    <button class="nb-add" id="nb-add-act">+ Add action item</button></div>
  <div class="nb-sec nb-notes" data-nb-s="notes"><h3><button class="nb-sh" aria-expanded="true"><span class="car">›</span>My notes</button></h3>${rteHtml('myNotes', n.myNotes, 'Your own notes. Filing a call again never overwrites this box.')}</div>
  <div class="nb-foot"><span class="nb-save" id="nb-save"></span><span class="sp"></span><button class="nb-danger" id="nb-del">Delete page</button></div>`
    const sb = document.createElement('div'); sb.style.cssText = 'display:flex;gap:14px;margin:-8px 0 4px'
    sb.innerHTML = '<button class="nb-secall" data-nb-all="0">Collapse all</button><button class="nb-secall" data-nb-all="1">Expand all</button>'
    s.querySelector('.nb-src').after(sb)
    applySecs()
    s.querySelectorAll('textarea').forEach(grow)
    bindPage(n.id)
  }
  function bindPage(id) {
    const n = () => notes[id]
    $('#nb-back2').onclick = () => { app.dataset.view = 'binder' }
    $('#nb-f-title').addEventListener('input', (e) => queue(id, { title: e.target.value }))
    $$('#nb-sheet .nb-rte').forEach((ed) => bindRte(ed, id))
    combo($('#nb-f-type'), () => [{ head: 'Folders' }, ...types().map((t) => ({ v: t, c: colorOf(t), hint: String(allNotes().filter((x) => x.type === t).length || '') }))], 'change')
    combo($('#nb-f-group'), () => {
      const T = $('#nb-f-type').value.trim() || n().type, here = groupsOf(T).names
      const other = [...new Set(allNotes().filter((x) => x.type !== T).map((x) => x.group).filter(Boolean))].filter((g) => !here.includes(g)).sort()
      return [{ head: 'In ' + T }, ...here.map((g) => ({ v: g })), ...(other.length ? [{ head: 'Other folders' }, ...other.map((g) => ({ v: g }))] : [])]
    }, 'change')
    combo($('#nb-f-att'), () => [{ head: 'People' }, ...people().map((v) => ({ v }))], 'input', true)
    $$('#nb-sheet input.ow').forEach((el) => combo(el, () => [{ head: 'People' }, ...people().map((v) => ({ v }))], 'input'))
    $('#nb-f-att').addEventListener('input', (e) => queue(id, { attendees: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) }))
    ;[['nb-f-type', 'type'], ['nb-f-group', 'group'], ['nb-f-date', 'date']].forEach(([k, f]) => $('#' + k).addEventListener('change', (e) => {
      let v = e.target.value.trim(); if (!v && f !== 'date') v = f === 'group' ? 'General' : 'Other'
      queue(id, { [f]: v }); if (f === 'type') { sel.kind = 'type'; sel.type = v } renderTabs(); renderBinder(); toast('Page moved')
    }))
    const s = $('#nb-sheet')
    s.onkeydown = (e) => { if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('nb-wrap')) { e.preventDefault(); e.target.blur() } }
    s.oninput = (e) => {
      const t = e.target; if (t.classList.contains('nb-wrap')) grow(t)
      if (t.dataset.nbDec !== undefined) { const d = [...(n().decisions || [])]; d[+t.dataset.nbDec] = t.value; queue(id, { decisions: d }); return }
      const ai = t.dataset.nbActt ?? t.dataset.nbActo ?? t.dataset.nbActu ?? t.dataset.nbActp; if (ai === undefined) return
      const a = (n().actions || []).map((x) => ({ ...x })), i = +ai
      if (t.dataset.nbActt !== undefined) a[i].text = t.value; else if (t.dataset.nbActo !== undefined) a[i].owner = t.value; else if (t.dataset.nbActp !== undefined) a[i].prompt = t.value; else a[i].due = t.value
      queue(id, { actions: a })
    }
    s.onchange = (e) => {
      const t = e.target; if (t.dataset.nbActd === undefined) return
      markDone(id, +t.dataset.nbActd, t.checked); t.closest('.nb-act').classList.toggle('done', t.checked); renderTabs()
    }
    s.onclick = (e) => {
      const cg = e.target.closest('[data-nb-gopen]'); if (cg) { const nn = n(); if (nn) openGroup(nn.type, nn.group || 'General'); return }
      if (e.target.closest('[data-nb-echo]')) { const nn = n(); if (nn && nn.call) ctx.go(`call/${nn.call}/minutes`); return }
      const rf = e.target.closest('[data-nb-refile]'); if (rf && !rf.disabled) { const nn = n(); if (nn && nn.call) { rf.disabled = true; rf.textContent = 'Filing…'; fileCall(nn.call) } return }
      const ro = e.target.closest('[data-nb-runopen]'); if (ro) { openRun(id, +ro.dataset.nbRunopen); return }
      if (e.target.closest('[data-nb-review]')) { const b = e.target.closest('[data-nb-review]'); resolve(id, b.dataset.nbField || '', b.dataset.nbReview); return }
      const mb = e.target.closest('[data-nb-actm]')
      if (mb) { const a = (n().actions || []).map((x) => ({ ...x })), i = +mb.dataset.nbActm; a[i].mode = a[i].mode === 'claude' ? 'manual' : 'claude'; queue(id, { actions: a }); renderPage(); return }
      const cb = e.target.closest('[data-nb-actc]'); if (cb) { const a = (n().actions || [])[+cb.dataset.nbActc] || {}; copyText(a.prompt || a.text || ''); return }
      const t = e.target.closest('[data-nb-decx],[data-nb-actx]'); if (!t) return
      if (t.dataset.nbDecx !== undefined) { const d = [...(n().decisions || [])]; d.splice(+t.dataset.nbDecx, 1); queue(id, { decisions: d }) }
      else { const a = [...(n().actions || [])]; a.splice(+t.dataset.nbActx, 1); queue(id, { actions: a }) }
      renderPage(); renderTabs()
    }
    $('#nb-add-dec').onclick = () => { queue(id, { decisions: [...(n().decisions || []), ''] }); renderPage(); const l = s.querySelectorAll('[data-nb-dec]'); if (l.length) l[l.length - 1].focus() }
    $('#nb-add-act').onclick = () => { queue(id, { actions: [...(n().actions || []), { text: '', owner: '', due: '', done: false }] }); renderPage(); const l = s.querySelectorAll('[data-nb-actt]'); if (l.length) l[l.length - 1].focus() }
    const del = $('#nb-del')
    del.onclick = async () => {
      if (!del.classList.contains('arm')) { del.classList.add('arm'); del.textContent = 'Click again to delete'; setTimeout(() => { if (del.isConnected) { del.classList.remove('arm'); del.textContent = 'Delete page' } }, 3500); return }
      try { delete pend[id]; await ctx.call('remove', { id }); delete notes[id]; sel.id = null; app.dataset.view = 'binder'; renderTabs(); renderBinder(); renderPage(); toast('Page deleted') } catch (e) { toast("Couldn't delete: " + (e.message || e)) }
    }
  }
  addEventListener('resize', () => { clearTimeout(grow._r); grow._r = setTimeout(() => $$('#nb-sheet textarea').forEach(grow), 120) })

  /* ---------- collapsible sections & panes (remembered on this computer) ---------- */
  const closedSecs = lsGet('mnb-closed-secs', {})
  function applySecs() { $$('#nb-sheet .nb-sec[data-nb-s]').forEach((el) => { const c = !!closedSecs[el.dataset.nbS]; el.classList.toggle('closed', c); const b = el.querySelector('.nb-sh'); if (b) b.setAttribute('aria-expanded', String(!c)) }) }
  $('#nb-sheet').addEventListener('click', (e) => {
    const h = e.target.closest('.nb-sh')
    if (h) { const k = h.closest('.nb-sec').dataset.nbS; closedSecs[k] = !closedSecs[k]; lsSet('mnb-closed-secs', closedSecs); applySecs(); if (!closedSecs[k]) h.closest('.nb-sec').querySelectorAll('textarea').forEach(grow); return }
    const a = e.target.closest('[data-nb-all]')
    if (a) { const open = a.dataset.nbAll === '1'; ['att', 'sum', 'dec', 'act', 'notes'].forEach((k) => { closedSecs[k] = !open }); lsSet('mnb-closed-secs', closedSecs); applySecs() }
  })
  const panes = lsGet('mnb-panes', { tabs: false, binder: false })
  function applyPanes() {
    app.classList.toggle('ct', !!panes.tabs); app.classList.toggle('cb', !!panes.binder)
    ;[['nb-tog-tabs', 'tabs', 'folders'], ['nb-tog-binder', 'binder', 'pages list']].forEach(([id, k, l]) => {
      const b = $('#' + id), c = !!panes[k]; b.textContent = c ? '»' : '«'; b.title = (c ? 'Expand ' : 'Collapse ') + l
      b.setAttribute('aria-label', (c ? 'Expand ' : 'Collapse ') + l); b.setAttribute('aria-expanded', String(!c))
    })
  }
  $('#nb-tog-tabs').onclick = (e) => { e.stopPropagation(); panes.tabs = !panes.tabs; lsSet('mnb-panes', panes); applyPanes() }
  $('#nb-tog-binder').onclick = (e) => { e.stopPropagation(); panes.binder = !panes.binder; lsSet('mnb-panes', panes); applyPanes() }
  applyPanes()

  /* ---------- new page & search ---------- */
  $('#nb-new').onclick = async () => {
    const type = sel.kind === 'type' ? sel.type : 'Internal'
    try {
      const n = await ctx.call('create', { doc: { type, group: 'General', title: '', date: today() } })
      notes[n.id] = n
      sel.kind = 'type'; sel.type = type; openGroups.add(type + '|General'); renderTabs(); openPage(n.id)
      const t = $('#nb-f-title'); if (t) t.focus()
    } catch (e) { toast("Couldn't create the page: " + (e.message || e)) }
  }
  $('#nb-q').addEventListener('input', (e) => { query = e.target.value.trim(); if (query && sel.kind !== 'type' && sel.kind !== 'actions') sel.kind = 'recent'; renderTabs(); renderBinder() })

  /* ---------- file an Echo call: the calls Echo has, and what the notebook has of each ---------- */
  async function openCalls() {
    const o = document.createElement('div'); o.className = 'nb-modal'
    o.innerHTML = `<div class="nb-mbox" role="dialog" aria-label="File an Echo call"><h3>File an Echo call</h3>
  <p>Claude reads the call's minutes, transcript and your notes, then files it as a page: type, client or person, summary, decisions and action items. Filing a call again updates its page and keeps what you edited.</p>
  <div id="nb-calls"><p>Loading Echo's calls…</p></div>
  <div class="mact"><button class="b" id="nb-calls-x">Close</button></div></div>`
    root.appendChild(o)
    const close = () => { o.remove(); root.removeEventListener('keydown', onKey) }
    const onKey = (e) => { if (e.key === 'Escape' && !root.querySelector('.nb-lightbox')) close() }
    root.addEventListener('keydown', onKey)
    o.querySelector('#nb-calls-x').onclick = close
    o.addEventListener('mousedown', (e) => { if (e.target === o) close() })
    const draw = (list) => {
      o.querySelector('#nb-calls').innerHTML = list.length ? list.map((c) => {
        const st = c.filed === 'filing' ? 'Filing…' : c.filed === 'done' ? 'In the notebook' : c.filed === 'failed' ? "Couldn't be filed" : c.filed === 'removed' ? 'Page deleted' : 'Not filed'
        const btns = c.filed === 'filing' ? '' : (c.page && notes[c.page] ? `<button data-nb-cpage="${esc(c.page)}">Open page</button> ` : '') + `<button data-nb-cfile="${esc(c.call)}">${c.filed === 'done' ? 'File again' : 'File'}</button>`
        return `<div class="nb-crow"><span class="d">${esc(fmtDate(c.date))}</span><div><div>${esc(c.title)}${c.kind === 'memo' ? ' <span class="st">· memo</span>' : ''}</div><div class="st${c.filed === 'failed' ? ' bad' : ''}">${esc(st)}</div></div><div>${btns}</div></div>`
      }).join('') : '<p>Echo has no calls with minutes yet.</p>'
    }
    let list = []
    try { list = await ctx.call('calls'); draw(list) } catch (e) { o.querySelector('#nb-calls').innerHTML = `<p>Couldn't read Echo's calls: ${esc(e.message || e)}</p>` }
    o.addEventListener('click', async (e) => {
      const p = e.target.closest('[data-nb-cpage]'); if (p) { close(); openPage(p.dataset.nbCpage); return }
      const f = e.target.closest('[data-nb-cfile]'); if (!f) return
      const call = f.dataset.nbCfile
      await fileCall(call, true)
      list = list.map((c) => (c.call === call ? { ...c, filed: 'filing' } : c)); draw(list)
      toast('Claude is filing the call. Its page appears in a minute or two.')
    })
  }
  $('#nb-imp').onclick = openCalls

  /* ---------- moments in the call: [mm:ss] in Claude's text, `t` on actions ---------- */
  const clock = (t) => { t = Math.max(0, Math.round(t)); const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60; return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(s).padStart(2, '0') }
  const STAMP = /\[(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\]/g
  const toSec = (h, m, s) => (+(h || 0)) * 3600 + (+m) * 60 + (+s)
  function tParse(s) { const all = [...String(s || '').matchAll(STAMP)]; if (!all.length) return null; const x = all[all.length - 1]; return toSec(x[1], x[2], x[3]) }
  const tsBtn = (call, t) => `<button class="nb-ts" data-nb-t="${t}" data-nb-tcall="${esc(call)}" title="See this moment in the transcript">${clock(t)}</button>`
  /** Escaped HTML with its [mm:ss] stamps turned into transcript links (left as text without a call). */
  const stampify = (html, call) => (call ? String(html).replace(STAMP, (_, h, m, s) => tsBtn(call, toSec(h, m, s))) : html)
  const openLink = (call, t) => {
    const link = `echo://call/${call}${t != null ? `?t=${Math.round(t)}` : ''}`
    if (window.echo && typeof window.echo.openLink === 'function') window.echo.openLink(link); else ctx.go(`call/${call}/transcript`)
  }
  root.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-nb-t]')
    if (b) { e.preventDefault(); openMoment(b.dataset.nbTcall, +b.dataset.nbT) }
  })

  /* ---------- Echo's own action items: one list, ticked in either place ---------- */
  const getJson = async (p) => { const r = await fetch(p); if (!r.ok) throw new Error(`${r.status} ${p}`); return r.json() }
  const echoRev = {}, segCache = {}
  let lastRecentSync = 0, lastOpenSync = 0
  const keyOf = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9а-я]+/gi, ' ').trim()
  function echoToggle(call, echoId, done) {
    try { if (window.ipc) window.ipc.postMessage(JSON.stringify({ cmd: 'toggle_action', call, id: echoId, status: done ? 'done' : 'todo' })) } catch { /* not in Echo's window */ }
    echoRev[call] = null
  }
  function markDone(id, i, done) {
    const n = notes[id]; if (!n) return
    const acts = (n.actions || []).map((a) => ({ ...a })); if (!acts[i]) return
    acts[i].done = done; queue(id, { actions: acts })
    if (n.call && acts[i].echoId) echoToggle(n.call, acts[i].echoId, done)
  }
  /** Read the call's action items from Echo: tie ours to Echo's by id (or wording), take Echo's ticks, add
   *  the ones Echo has that the page doesn't. Only when the call changed since the last look (its rev). */
  async function syncEcho(id, force) {
    const n = notes[id]; if (!n || !n.call) return
    const call = n.call
    try {
      const rev = JSON.stringify(await getJson(`api/call/${encodeURIComponent(call)}/rev`))
      if (!force && echoRev[call] === rev) return
      const d = await getJson(`api/call/${encodeURIComponent(call)}`)
      echoRev[call] = rev
      segCache[call] = Array.isArray(d.segments) ? d.segments : []
      const items = Array.isArray(d.actions) ? d.actions.filter((x) => x && x.id) : []
      const cur = notes[id]; if (!cur || !items.length) return
      const acts = (cur.actions || []).map((a) => ({ ...a })), used = new Set()
      let changed = false
      for (const a of acts) {
        let it = a.echoId ? items.find((x) => x.id === a.echoId) : null, linked = false
        if (!it && !a.echoId) { it = items.find((x) => !used.has(x.id) && keyOf(x.task) === keyOf(a.text)); if (it) { a.echoId = it.id; linked = true; changed = true; if (typeof it.t === 'number' && a.t == null) a.t = Math.round(it.t) } }
        if (!it) continue
        used.add(it.id)
        const done = it.status === 'done'
        if (done === !!a.done) continue
        // Ticked here before the two were tied together: Echo takes our tick. Otherwise Echo's wins.
        if (linked && a.done) echoToggle(call, it.id, true); else { a.done = done; changed = true }
      }
      for (const it of items) {
        if (used.has(it.id) || !String(it.task || '').trim()) continue
        acts.push({ text: String(it.task).trim(), owner: String(it.owner || ''), due: /^\d{4}-\d{2}-\d{2}$/.test(it.due || '') ? it.due : '', done: it.status === 'done', mode: '', echoId: it.id, ...(typeof it.t === 'number' ? { t: Math.round(it.t) } : {}) })
        changed = true
      }
      if (changed) {
        // Saved apart from the user's edits (`sync`): Echo's list arriving isn't an edit of the page.
        if (pend[id]) await flush()
        notes[id].actions = acts
        await ctx.call('sync', { id, actions: acts })
        if (sel.id === id && !editing()) renderPage(); renderTabs()
      }
    } catch { /* the call is gone or Echo's window API isn't here */ }
  }
  /** Recent call pages with open actions, now and then (each only when its call changed). */
  async function syncRecent() {
    if (Date.now() - lastRecentSync < 60000) return
    lastRecentSync = Date.now()
    const since = ymd(new Date(Date.now() - 21 * 864e5))
    const list = allNotes().filter((n) => n.call && (n.date || '') >= since && (n.actions || []).some((a) => !a.done)).sort(byDateDesc).slice(0, 15)
    for (const n of list) await syncEcho(n.id, false)
  }

  /* ---------- Today: today's calls, pages not opened yet, what's due ---------- */
  const unopened = () => allNotes().filter((n) => n.source === 'echo' && (n.reviewed === false || n.review)).sort(byDateDesc)
  const overdue = () => openActions().filter((x) => x.a.due && x.a.due < today())
  let todayCalls = [], todayAgenda = [], todayAt = 0
  async function refreshToday(force) {
    if (!force && Date.now() - todayAt < 30000) return
    todayAt = Date.now()
    const td = today()
    try { todayCalls = ((await ctx.call('calls')) || []).filter((c) => c.date === td) } catch { todayCalls = [] }
    try {
      const ag = await getJson('api/agenda')
      todayAgenda = (Array.isArray(ag) ? ag : []).filter((m) => m && m.start && ymd(new Date(m.start)) === td && new Date(m.start).getTime() > Date.now())
    } catch { todayAgenda = [] }
    if (sel.kind === 'today' && !sel.id) renderToday()
  }
  const callTime = (name) => { const m = /_(\d{2})(\d{2})\d{2}(?:-|$)/.exec(name || ''); return m ? `${m[1]}:${m[2]}` : '' }
  const hhmm = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') }
  function renderToday() {
    $('#nb-sheet').hidden = true
    let tb = $('#nb-todaybox')
    if (!tb) { tb = document.createElement('div'); tb.id = 'nb-todaybox'; $('.nb-page').prepend(tb); bindToday(tb) }
    tb.hidden = false
    if (!loaded) { tb.innerHTML = '<div class="nb-empty">Loading your notebook…</div>'; return }
    const td = today(), week = ymd(new Date(Date.now() + 7 * 864e5))
    const open = openActions()
    const due = open.filter((x) => x.a.due && x.a.due <= week).sort((x, y) => x.a.due.localeCompare(y.a.due))
    const dueWeek = due.filter((x) => x.a.due >= td).length, od = due.filter((x) => x.a.due < td).length
    const filedToday = todayCalls.filter((c) => c.filed === 'done').length
    const STATE = { filing: ['busy', 'Filing'], done: ['ok', 'Filed'], failed: ['bad', "Couldn't file"], removed: ['', 'Page deleted'] }
    const rows = [
      ...todayCalls.map((c) => {
        const [cls, label] = STATE[c.filed] || ['', 'Not filed']
        const page = c.page && notes[c.page]
        const where = page ? `${esc(page.type)} › ${esc(page.group || 'General')}` : c.error ? esc(c.error) : c.kind === 'memo' ? 'Memo' : 'Recorded'
        const right = c.filed === 'done' || c.filed === 'filing' ? `<span class="nb-state ${cls}">${label}</span>` : `<span style="display:flex;gap:6px;align-items:center"><span class="nb-state ${cls}">${label}</span><button class="nb-pill" data-nb-cfile="${esc(c.call)}">File</button></span>`
        const tag = page ? `button class="nb-crow2" data-nb-open="${esc(page.id)}"` : 'div class="nb-crow2"'
        return { at: callTime(c.call), html: `<${tag}><span class="t">${esc(callTime(c.call))}</span><span><span class="nm" style="display:block;font-weight:500">${esc(c.title)}</span><span class="t">${where}</span></span>${right}</${tag.split(' ')[0]}>` }
      }),
      ...todayAgenda.map((m) => ({ at: hhmm(m.start), html: `<div class="nb-crow2"><span class="t">${esc(hhmm(m.start))}</span><span><span style="display:block;font-weight:500">${esc(m.subject || 'Meeting')}</span><span class="t">Later today</span></span><span class="nb-state">Later</span></div>` })),
    ].sort((a, b) => a.at.localeCompare(b.at))
    const un = unopened()
    const unHtml = un.length ? un.slice(0, 8).map((n) => {
      const hl = (String(n.summary || '').match(/<li\b/gi) || []).length, dec = (n.decisions || []).length, ac = (n.actions || []).length
      const rv = n.review ? ((n.review.changes || []).length + Object.keys(n.review.proposed || {}).length) : 0
      return `<button class="nb-crow2" style="grid-template-columns:minmax(0,1fr) auto" data-nb-open="${esc(n.id)}"><span><span class="nm" style="display:block;font-weight:500">${esc(n.title || 'Untitled')}</span><span class="t">${rv ? `Filed again · ${rv} change${rv > 1 ? 's' : ''} to review` : `${hl} highlight${hl === 1 ? '' : 's'} · ${dec} decision${dec === 1 ? '' : 's'} · ${ac} action${ac === 1 ? '' : 's'}`}</span></span><span class="t">${esc(fmtDate(n.date))}</span></button>`
    }).join('') : '<div class="nb-tempty">Nothing new. Pages Claude files show here until you open them.</div>'
    const dueHtml = due.length ? due.slice(0, 10).map(({ n, a, i }) => `<div class="nb-ai" style="padding:11px 0"><input type="checkbox" aria-label="Mark done" data-nb-done="${esc(n.id)}|${i}"><div class="tx">${esc(a.text)}</div><div class="mt"><span>${esc(a.owner || 'No owner')}</span><span class="${a.due < td ? 'od' : ''}">${a.due < td ? 'overdue since ' : 'due '}${esc(fmtDate(a.due))}</span>${a.mode === 'claude' ? `<button data-nb-trun="${esc(n.id)}|${i}">Run with Claude</button>` : ''}<button data-nb-open="${esc(n.id)}">${esc(n.title || 'Open page')}</button></div></div>`).join('') : '<div class="nb-tempty">Nothing due in the next 7 days.</div>'
    const day = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    const html = `<div class="nb-today">
  <header class="nb-tband"><div style="display:flex;flex-direction:column;gap:6px"><p class="nb-lbl">${esc(day)}</p><h1>Today</h1></div>
    <div class="nb-kpis"><div><b>${rows.length}</b><span class="nb-lbl">Calls today</span></div><div><b>${filedToday}</b><span class="nb-lbl">Filed</span></div><div><b>${dueWeek}</b><span class="nb-lbl">Due this week</span></div><div><b>${od}</b><span class="nb-lbl">Overdue</span></div></div></header>
  <div class="nb-tgrid">
    <section class="nb-card" aria-label="Today's calls"><h2><span class="nb-lbl">Today's calls</span></h2>${rows.length ? rows.map((r) => r.html).join('') : '<div class="nb-tempty">No calls recorded today. Arm Echo for a call, or file one you have with <b>File an Echo call</b>.</div>'}</section>
    <section class="nb-card" aria-label="Filed by Claude, not opened yet"><h2><span class="nb-lbl">Filed by Claude · not opened yet</span>${un.length ? `<span class="nb-tag">${un.length} new</span>` : ''}</h2>${unHtml}</section>
    <section class="nb-card" aria-label="Due soon"><h2><span class="nb-lbl">Due soon</span></h2>${dueHtml}</section>
  </div></div>`
    if (tb._html !== html) { tb.innerHTML = html; tb._html = html }
  }
  function bindToday(tb) {
    tb.addEventListener('click', (e) => {
      const f = e.target.closest('[data-nb-cfile]'); if (f) { e.stopPropagation(); fileCall(f.dataset.nbCfile); todayAt = 0; setTimeout(() => refreshToday(true), 1500); return }
      const r = e.target.closest('[data-nb-trun]'); if (r) { const [id, i] = r.dataset.nbTrun.split('|'); openPage(id); openRun(id, +i); return }
      const o = e.target.closest('[data-nb-open]'); if (o) openPage(o.dataset.nbOpen)
    })
    tb.addEventListener('change', (e) => {
      const c = e.target.closest('[data-nb-done]'); if (!c) return
      const [id, i] = c.dataset.nbDone.split('|'); markDone(id, +i, true); toast('Marked done'); renderTabs(); setTimeout(renderToday, 300)
    })
  }

  /* ---------- review of a re-filing: what Claude changed, what it suggests for fields you edited ---------- */
  const FIELD_LBL = { title: 'Title', type: 'Type', group: 'Client / person / group', date: 'Date', start: 'Start', end: 'End', attendees: 'Attendees', summary: 'Summary', decisions: 'Decisions', actions: 'Action items', myNotes: 'My notes' }
  function fmtVal(f, v, call) {
    if (f === 'actions') return (v || []).length ? `<ul style="margin:0;padding-left:1.2em">${v.map((a) => `<li>${esc(a.text)}${a.owner ? ` · ${esc(a.owner)}` : ''}${a.due ? ` · due ${esc(fmtDate(a.due))}` : ''}</li>`).join('')}</ul>` : '<i>none</i>'
    if (Array.isArray(v)) return v.length ? `<ul style="margin:0;padding-left:1.2em">${v.map((x) => `<li>${stampify(esc(x), call)}</li>`).join('')}</ul>` : '<i>none</i>'
    if (f === 'summary' || f === 'myNotes') { const p = plain(v); return p ? stampify(esc(p.length > 600 ? p.slice(0, 600) + '…' : p), call) : '<i>empty</i>' }
    return v ? esc(v) : '<i>empty</i>'
  }
  function reviewHtml(n) {
    const r = n.review; if (!r) return ''
    const ch = r.changes || [], pr = r.proposed || {}, keys = Object.keys(pr), k = ch.length + keys.length
    if (!k) return ''
    return `<div class="nb-review" role="region" aria-label="Review the new filing"><div class="w"><b>Claude filed this call again with Echo's new minutes</b><span>${k} change${k > 1 ? 's' : ''} to review.${keys.length ? ' Fields you edited stay yours unless you accept.' : ''}</span></div><button class="nb-pill" data-nb-review="all-accept">Accept all</button><button class="nb-pill ghost" data-nb-review="all-keep">Keep mine</button></div>` +
      keys.map((f) => `<section class="nb-chg" aria-label="${esc(FIELD_LBL[f] || f)}"><p class="nb-lbl" style="padding:0">${esc(FIELD_LBL[f] || f)} · Claude suggests</p><div class="old">${fmtVal(f, n[f], n.call)}</div><div class="new">${fmtVal(f, pr[f], n.call)}</div><div class="row2"><button class="nb-pill pri" data-nb-review="accept" data-nb-field="${f}">Accept</button><button class="nb-pill" data-nb-review="keep" data-nb-field="${f}">Keep mine</button></div></section>`).join('') +
      ch.map((c) => `<section class="nb-chg" aria-label="${esc(FIELD_LBL[c.field] || c.field)}"><p class="nb-lbl" style="padding:0">${esc(FIELD_LBL[c.field] || c.field)} · updated</p><div class="old">${fmtVal(c.field, c.old, n.call)}</div><div class="new">${fmtVal(c.field, n[c.field], n.call)}</div><div class="row2"><button class="nb-pill pri" data-nb-review="ok" data-nb-field="${c.field}">Keep the update</button><button class="nb-pill" data-nb-review="undo" data-nb-field="${c.field}">Undo</button></div></section>`).join('')
  }
  async function resolve(id, field, choice) {
    try {
      await flush()
      const n = await ctx.call('resolve', { id, field, choice })
      if (n) notes[id] = n
      renderPage(); renderTabs(); renderBinder()
      toast(choice === 'all-accept' || choice === 'accept' ? 'Accepted' : choice === 'undo' || choice === 'all-keep' ? 'Kept yours' : 'Kept')
    } catch (e) { toast("Couldn't save: " + (e.message || e)) }
  }

  /* ---------- the side panel: a moment of the call, or running an action with Claude ---------- */
  let dr = null
  const drawer = $('#nb-drawer')
  function openMoment(call, t) { dr = { kind: 'moment', call, t }; renderDrawer(); if (!segCache[call]) getJson(`api/call/${encodeURIComponent(call)}`).then((d) => { segCache[call] = Array.isArray(d.segments) ? d.segments : []; renderDrawer() }).catch(() => { segCache[call] = []; renderDrawer() }) }
  function openRun(id, i) { dr = { kind: 'run', id, i }; renderDrawer() }
  function earlierCount(n) { return allNotes().filter((x) => x.id !== n.id && x.type === n.type && (x.group || 'General') === (n.group || 'General') && (x.date || '') <= (n.date || '9999')).length }
  function renderDrawer() {
    if (!dr) { drawer.hidden = true; drawer.innerHTML = ''; return }
    const a0 = document.activeElement
    if (a0 && drawer.contains(a0) && /TEXTAREA|INPUT/.test(a0.tagName) && !drawer.hidden) { renderRunState(); return }
    drawer.hidden = false
    const close = '<button class="nb-pill" data-nb-dclose aria-label="Close panel" style="padding:5px 10px">✕</button>'
    if (dr.kind === 'moment') {
      const segs = segCache[dr.call]
      const near = (segs || []).filter((s) => s.end >= dr.t - 40 && s.start <= dr.t + 60).slice(0, 14)
      let at = -1, best = Infinity
      near.forEach((s, k) => { const d = Math.abs(s.start - dr.t); if (d < best) { best = d; at = k } })
      drawer.innerHTML = `<div class="nb-dhead"><p class="nb-lbl">From the call</p>${close}</div><h2>Transcript at ${clock(dr.t)}</h2>
        <div class="nb-bar"><button class="nb-pill pri" data-nb-echolink>Open in Echo</button></div>
        <div>${segs == null ? '<p class="nb-note">Reading the transcript…</p>' : near.length ? near.map((s, k) => `<div class="nb-seg${k === at ? ' at' : ''}"><button class="nb-ts" style="padding:0;text-align:left" data-nb-jump="${Math.round(s.start)}">${clock(s.start)}</button><span class="who">${esc(s.name || (s.speaker === 'me' ? 'Me' : 'Them'))}</span><span class="tx">${esc(s.text)}</span></div>`).join('') : '<p class="nb-note">No transcript lines around this moment.</p>'}</div>
        <p class="nb-note">Every highlight, decision and action keeps the moment it came from, so you can check it before you share the page.</p>`
      return
    }
    const n = notes[dr.id], a = n && (n.actions || [])[dr.i]
    if (!a) { dr = null; renderDrawer(); return }
    const run = a.run || {}, busy = run.state === 'running', has = !!run.answer
    const st = (k, label, on, now) => `<span class="s${on ? ' on' : ''}${now ? ' now' : ''}"><i>${k}</i>${label}</span>`
    const ec = earlierCount(n)
    drawer.innerHTML = `<div class="nb-dhead"><p class="nb-lbl">Run with Claude</p>${close}</div><h2>${esc(a.text)}</h2>
      <div class="nb-steps">${st(1, 'Prompt', true, false)}<em></em>${st(2, 'Draft', has, busy)}<em></em>${st(3, 'Your call', false, has && !busy)}</div>
      <label class="nb-lbl" for="nb-dprompt" style="padding:0">What Claude should do</label>
      <textarea id="nb-dprompt" data-nb-dprompt>${esc(a.prompt || a.text)}</textarea>
      <div><label class="src"><input type="checkbox" checked disabled> ${n.call ? 'This call: minutes, transcript, my notes' : 'This page: summary, decisions, my notes'}</label>
        <label class="src"><input type="checkbox" id="nb-dearlier" ${ec ? 'checked' : 'disabled'}> ${esc(n.group || 'General')}'s earlier pages (${ec})</label></div>
      <div class="nb-bar"><button class="nb-pill pri" data-nb-drun ${busy ? 'disabled' : ''}>${has ? 'Run again' : 'Run with Claude'}</button><span class="nb-runstate" id="nb-dstate">${busy ? 'Claude is drafting…' : run.state === 'failed' ? esc("Couldn't draft: " + (run.error || '')) : ''}</span></div>
      ${has ? `<section class="nb-draft" aria-label="Draft">${run.html ? sanitizeDraft(run.html) : `<p>${esc(run.answer)}</p>`}</section>
      <div class="nb-bar"><button class="nb-pill" data-nb-dcopy>Copy</button><button class="nb-pill" data-nb-dsave>Save to page</button>${deliver.map((k) => `<button class="nb-pill" data-nb-dsend="${k}">${k === 'teams' ? 'Send to me in Teams' : 'Mail it to me'}</button>`).join('')}${a.done ? '' : '<button class="nb-pill" data-nb-ddone>Mark done</button>'}</div>
      <label class="nb-lbl" for="nb-dask" style="padding:0">Ask for changes</label>
      <textarea id="nb-dask" data-nb-dask placeholder="Shorter, warmer, add the timeline…" style="min-height:60px"></textarea>
      <div class="nb-bar"><button class="nb-pill" data-nb-daskgo ${busy ? 'disabled' : ''}>Ask for changes</button></div>` : ''}
      <p class="nb-note">Claude works from what this panel names, with no other access. Nothing is sent to anyone: Send to me goes only to you.</p>`
  }
  function renderRunState() { const s = drawer.querySelector('#nb-dstate'); if (!s || !dr || dr.kind !== 'run') return; const a = ((notes[dr.id] || {}).actions || [])[dr.i]; const r = (a && a.run) || {}; s.textContent = r.state === 'running' ? 'Claude is drafting…' : r.state === 'done' ? 'Draft ready' : r.state === 'failed' ? "Couldn't draft: " + (r.error || '') : '' }
  /** The draft comes from Echo's own Markdown writer; it is still cleaned to the notebook's tags (and h1–h3 kept). */
  function sanitizeDraft(html) { return sanitize(String(html).replace(/<(\/?)h[1-3]\b[^>]*>/gi, '<$1h4>')).replace(/<a /g, '<a ') }
  async function startRun(follow) {
    const n = notes[dr.id], i = dr.i, a = n && (n.actions || [])[i]; if (!a) return
    const ask = follow ? (drawer.querySelector('#nb-dask') || {}).value || '' : ''
    if (follow && !ask.trim()) { toast('Say what to change first'); return }
    await flush()
    try {
      await ctx.call('run', { id: n.id, index: i, earlierPages: !!(drawer.querySelector('#nb-dearlier') || {}).checked, followup: follow ? ask : undefined })
      const acts = (n.actions || []).map((x) => ({ ...x })); acts[i].run = { ...(acts[i].run || {}), state: 'running', at: new Date().toISOString() }; n.actions = acts
      runningNow = [...runningNow, `${n.id}#${i}`]
      if (document.activeElement && drawer.contains(document.activeElement)) document.activeElement.blur()
      renderDrawer(); if (sel.id === n.id && !editing()) renderPage()
      setTimeout(load, 4000)
    } catch (e) { toast("Couldn't start: " + (e.message || e)) }
  }
  drawer.addEventListener('input', (e) => {
    if (e.target.dataset.nbDprompt === undefined || !dr || dr.kind !== 'run') return
    const n = notes[dr.id]; if (!n) return
    const acts = (n.actions || []).map((x) => ({ ...x })); if (!acts[dr.i]) return
    acts[dr.i].prompt = e.target.value; queue(n.id, { actions: acts })
  })
  drawer.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t || !dr) return
    if (t.dataset.nbDclose !== undefined) { dr = null; renderDrawer(); return }
    if (t.dataset.nbEcholink !== undefined) { openLink(dr.call, dr.t); return }
    if (t.dataset.nbJump !== undefined) { openLink(dr.call, +t.dataset.nbJump); return }
    if (dr.kind !== 'run') return
    const n = notes[dr.id], a = n && (n.actions || [])[dr.i]; if (!a) return
    const run = a.run || {}
    if (t.dataset.nbDrun !== undefined) startRun(false)
    else if (t.dataset.nbDaskgo !== undefined) startRun(true)
    else if (t.dataset.nbDcopy !== undefined) copyText(run.answer || '', 'Draft copied.')
    else if (t.dataset.nbDsave !== undefined) {
      const add = `<h4>Draft: ${esc(a.text)}</h4>${sanitizeDraft(run.html || `<p>${esc(run.answer || '')}</p>`)}`
      queue(n.id, { myNotes: sanitize((n.myNotes || '') + add) }); if (sel.id === n.id) renderPage(); toast('Saved to My notes')
    } else if (t.dataset.nbDsend) {
      try { t.disabled = true; await ctx.call('send_me', { id: n.id, index: dr.i, kind: t.dataset.nbDsend }); toast(t.dataset.nbDsend === 'teams' ? 'Sent to you in Teams' : 'Mailed to you') } catch (err) { toast("Couldn't send: " + (err.message || err)) } finally { t.disabled = false }
    } else if (t.dataset.nbDdone !== undefined) { markDone(n.id, dr.i, true); renderDrawer(); if (sel.id === n.id && !editing()) renderPage(); toast('Marked done') }
  })
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && dr && !root.querySelector('.nb-lightbox') && !root.querySelector('.nb-modal')) { dr = null; renderDrawer() } })

  /* ---------- Echo's side: the activity, a button on each call, ⌘K ---------- */
  ctx.activities.add({
    id: 'notebook',
    label: 'Notebook',
    icon: BOOK(20),
    // Always the same HTML, so Echo's redraws leave the notebook (and what is being typed) alone.
    render: () => '<div class="mnb-host"></div>',
    after(box) {
      const host = box.querySelector('.mnb-host')
      if (host && root.parentNode !== host) host.appendChild(root)
      // Echo redraws every few seconds: read the notebook again when it is stale and nothing is being typed.
      const busy = Object.values(filed).some((r) => r.state === 'filing') || runningNow.length > 0
      if (!loaded || (Date.now() - lastLoad > (busy ? 4000 : 20000) && !editing() && !naming() && !Object.keys(pend).length)) load()
      if (loaded && sel.kind === 'today' && !sel.id) refreshToday()
      // The open page's actions follow Echo's ticks (read only when the call changed).
      if (sel.id && notes[sel.id] && notes[sel.id].call && Date.now() - lastOpenSync > 30000) { lastOpenSync = Date.now(); syncEcho(sel.id, false) }
    },
  })
  if (ctx.slots) ctx.slots.add('call.menu', {
    label: 'File in Notebook',
    icon: BOOK(16),
    run: (t) => { const call = t && t.call && t.call.name; if (call) fileCall(call) },
  })
  if (ctx.palette) ctx.palette.add({ label: 'Open Meeting Notebook', group: 'Notebook', keywords: 'notes minutes pages folders', run: () => ctx.go(ACTIVITY) })
  if (ctx.palette) ctx.palette.add({ label: 'File an Echo call in the notebook…', group: 'Notebook', keywords: 'notebook file call', run: () => { ctx.go(ACTIVITY); setTimeout(openCalls, 200) } })
}
