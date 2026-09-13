(function(){
  'use strict';
  if(!window.AccountFlowCore)return;
  var Flow=window.AccountFlowCore;

  function byId(id){return document.getElementById(id)}
  function esc(v){return typeof window.esc==='function'?window.esc(v):String(v==null?'':v).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function money(v,c){return typeof window.money==='function'?window.money(v,c):Flow.formatMoney(v,c)}

  function syncFieldState(){
    var active=document.querySelector('[data-v20-mode].on'),mode=active?active.dataset.v20Mode:'internal_transfer',adjust=mode==='account_adjustment';
    var normalFields=['v20FromAccount','v20FromCurrency','v20FromAmount','v20ToAccount','v20ToCurrency','v20ToAmount','v20Counterparty'].map(byId).filter(Boolean);
    var adjustFields=['v20AdjustAccount','v20AdjustCurrency','v20TargetBalance'].map(byId).filter(Boolean);
    normalFields.forEach(function(node){node.disabled=adjust});
    adjustFields.forEach(function(node){node.disabled=!adjust});
    var adjustAccount=byId('v20AdjustAccount'),target=byId('v20TargetBalance');
    if(adjustAccount)adjustAccount.required=true;
    if(target)target.required=true
  }

  function ensureActivitySection(){
    if(byId('v20FlowActivity'))return;
    var accounts=byId('v20Accounts'),people=document.querySelector('.app section.section');
    if(!accounts&&!people)return;
    var section=document.createElement('section');section.className='v20-flow-activity';section.id='v20FlowActivitySection';
    section.innerHTML='<div class="v20-section-title"><h2>Recent account movements</h2><span>Linked transfers and exchanges</span></div><div id="v20FlowActivity"><div class="v20-account-empty">No linked account movements recorded yet.</div></div>';
    if(accounts&&accounts.parentNode)accounts.insertAdjacentElement('afterend',section);else people.parentNode.insertBefore(section,people)
  }

  function renderFlowActivity(groups){
    var box=byId('v20FlowActivity');if(!box)return;
    if(!groups||!groups.length){box.innerHTML='<div class="v20-account-empty">No linked account movements recorded yet.</div>';return}
    box.innerHTML=groups.slice(0,12).map(function(group){
      var route=(group.fromAccount||'Account')+' → '+(group.counterparty?group.counterparty+' → ':'')+(group.toAccount||'Account');
      var amountLine=(group.fromAmount?money(group.fromAmount,group.fromCurrency):'')+(group.toAmount?' → '+money(group.toAmount,group.toCurrency):'');
      var status=group.reversed?'Reversed':'Linked transaction';
      return '<details class="v20-flow-group"><summary><div><strong>'+esc(group.kind)+'</strong><span>'+esc(route)+'</span></div><div class="v20-flow-group-money"><b>'+esc(amountLine||status)+'</b><small class="'+(group.reversed?'v20-reversed':'')+'">'+esc(status)+'</small></div></summary><div class="v20-flow-group-details">'+group.items.map(function(item){var signed=Number(item.signed_amount||0),person=Flow.stripAccountPrefix(item.person_name||(item.people&&item.people.name)||'Account');return '<div class="v20-flow-leg"><div><strong>'+esc(person)+'</strong><span>'+esc(item.description||'Account movement')+'</span></div><b class="'+(signed>=0?'v20-pos':'v20-neg')+'">'+(signed>=0?'+':'−')+esc(money(Math.abs(signed),item.currency))+'</b></div>'}).join('')+'<div class="v20-flow-ref">'+esc(group.date||'')+' · '+esc(group.id)+(group.rate?' · '+esc(group.rate):'')+'</div></div></details>'
    }).join('')
  }

  async function loadFlowActivity(){
    ensureActivitySection();var box=byId('v20FlowActivity');if(!box||!window.accessKey)return;
    try{
      var data=await window.api('?action=search&q='+encodeURIComponent('FLOW-'));
      var rows=(data.results||[]).map(function(row){return Object.assign({},row,{person_name:row.person_name||(row.people&&row.people.name)||''})});
      renderFlowActivity(Flow.groupFlowTransactions(rows))
    }catch(e){box.innerHTML='<div class="v20-account-empty">Account movement history is temporarily unavailable.</div>'}
  }

  function patchLoad(){
    if(typeof window.load!=='function'||window.load.__v20Patch)return;
    var previous=window.load;
    var wrapped=async function(){var result=await previous.apply(this,arguments);await loadFlowActivity();return result};
    wrapped.__v20Patch=true;window.load=wrapped;
    if(byId('refreshBtn'))byId('refreshBtn').onclick=function(){window.load()}
  }

  function installClickSync(){
    document.addEventListener('click',function(event){
      var target=event.target&&event.target.closest?event.target.closest('[data-v20-mode],#v20SetBalance,#v20MoveMoney,#v20Transfer,#v20Fx,#v20AccountAdjust,#v20AccountTransfer'):null;
      if(target)setTimeout(syncFieldState,0)
    })
  }

  ensureActivitySection();syncFieldState();patchLoad();installClickSync();
  if(window.dashboard){loadFlowActivity()}
  window.MoneyOwedAccountFlows=Object.assign(window.MoneyOwedAccountFlows||{},{loadFlowActivity:loadFlowActivity,syncFieldState:syncFieldState});
})();
