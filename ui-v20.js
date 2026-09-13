(function(){
  'use strict';
  if(!window.AccountFlowCore)return;
  var Flow=window.AccountFlowCore;
  var mode='internal_transfer';
  var originalSummaryTotals=window.summaryTotals;
  var originalBuildPeople=window.buildPeople;
  var originalRender=window.render;
  var originalLoad=window.load;

  function byId(id){return document.getElementById(id)}
  function escapeHtml(v){return typeof window.esc==='function'?window.esc(v):String(v==null?'':v).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function moneyText(v,c){return typeof window.money==='function'?window.money(v,c):Flow.formatMoney(v,c)}
  function flag(c){return typeof window.currencyFlag==='function'?window.currencyFlag(c):c}
  function toast(m){if(typeof window.showToast==='function')window.showToast(m)}
  function todayValue(){return typeof window.today==='function'?window.today():new Date().toISOString().slice(0,10)}
  function groupId(){return 'FLOW-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase()}

  function accountRows(){
    return (window.dashboard&&window.dashboard.balances||[]).filter(function(row){return Flow.isAccountPersonName(row.person_name)})
      .map(function(row){return {id:row.person_id,name:Flow.stripAccountPrefix(row.person_name),currency:String(row.currency||'').toUpperCase(),balance:Number(row.balance||0)}})
      .sort(function(a,b){return a.name.localeCompare(b.name)||a.currency.localeCompare(b.currency)})
  }
  function accountBalance(name,currency){
    var match=accountRows().find(function(row){return row.name.toLowerCase()===String(name||'').trim().toLowerCase()&&row.currency===String(currency||'').toUpperCase()});
    return match?match.balance:0
  }
  function knownAccounts(){
    var names=accountRows().map(function(r){return r.name});
    try{names=names.concat(JSON.parse(localStorage.getItem('moneyOwedKnownAccounts')||'[]'))}catch(e){}
    return Array.from(new Set(names.filter(Boolean))).sort()
  }
  function rememberAccounts(names){
    var next=Array.from(new Set(knownAccounts().concat(names||[]).map(function(x){return String(x||'').trim()}).filter(Boolean))).sort();
    localStorage.setItem('moneyOwedKnownAccounts',JSON.stringify(next));refreshAccountLists()
  }

  function installSummaryFilters(){
    window.summaryTotals=function(){return Flow.debtTotalsFromBalances(window.dashboard&&window.dashboard.balances||[])};
    window.buildPeople=function(){return originalBuildPeople().filter(function(p){return !Flow.isAccountPersonName(p.name)})};
  }

  function installDashboardChrome(){
    document.body.classList.add('v20');
    var header=document.querySelector('.app header');
    if(header&&!byId('v20Intro')){
      var intro=document.createElement('div');intro.className='v20-intro';intro.id='v20Intro';intro.innerHTML='<strong>Debts and your own accounts are kept separate.</strong> TTD and USD never combine unless you record a currency exchange.';
      header.insertAdjacentElement('afterend',intro)
    }
    var titles=document.querySelectorAll('.summaryTitle');
    if(titles[0])titles[0].textContent="You're owed";
    if(titles[1])titles[1].textContent='You owe';
    var firstSection=document.querySelector('.app section.section');
    if(firstSection&&!byId('v20Quick')){
      var quick=document.createElement('section');quick.className='v20-quick';quick.id='v20Quick';quick.innerHTML='<div class="v20-section-title"><h2>Quick transaction</h2><span>Choose what actually happened</span></div><div class="v20-quick-grid"><button class="v20-quick-btn flow" id="v20Transfer" type="button"><strong>↔ Internal transfer</strong><span>Move money between your own accounts. No debt impact.</span></button><button class="v20-quick-btn fx" id="v20Fx" type="button"><strong>⇄ Currency exchange</strong><span>Link the TTD paid and USD received as one event.</span></button><button class="v20-quick-btn" id="v20Debt" type="button"><strong>＋ Debt transaction</strong><span>Loan, purchase, repayment or adjustment with a person.</span></button></div>';
      firstSection.parentNode.insertBefore(quick,firstSection)
    }
    if(firstSection&&!byId('v20Accounts')){
      var accounts=document.createElement('section');accounts.className='v20-accounts';accounts.id='v20Accounts';accounts.innerHTML='<div class="v20-section-title"><h2>Your accounts</h2><div class="v20-account-tools"><button class="v20-small-btn" id="v20SetBalance" type="button">Set balance</button><button class="v20-small-btn" id="v20MoveMoney" type="button">Move money</button></div></div><div id="v20AccountGrid"></div>';
      firstSection.parentNode.insertBefore(accounts,firstSection)
    }
    if(byId('v20Transfer'))byId('v20Transfer').onclick=function(){openFlow('internal_transfer')};
    if(byId('v20Fx'))byId('v20Fx').onclick=function(){openFlow('fx_purchase')};
    if(byId('v20Debt'))byId('v20Debt').onclick=function(){if(byId('addBtn'))byId('addBtn').click()};
    if(byId('v20SetBalance'))byId('v20SetBalance').onclick=function(){openFlow('account_adjustment')};
    if(byId('v20MoveMoney'))byId('v20MoveMoney').onclick=function(){openFlow('internal_transfer')}
  }

  function renderAccounts(){
    var box=byId('v20AccountGrid');if(!box)return;
    var rows=accountRows();
    if(!rows.length){box.innerHTML='<div class="v20-account-empty">No account balances are tracked yet. Use <strong>Set balance</strong> once for Scotia, FCB, RBC, Cash or another account. After that, transfers will update the account automatically.</div>';return}
    box.className='v20-account-grid';
    box.innerHTML=rows.map(function(row){return '<button class="v20-account-card" type="button" data-v20-account="'+escapeHtml(row.id)+'"><div class="v20-account-top"><div class="v20-bank">'+escapeHtml(row.name)+'</div><div class="v20-flag">'+flag(row.currency)+'</div></div><div class="v20-account-money '+(row.balance<0?'v20-neg':'')+'">'+escapeHtml(moneyText(row.balance,row.currency))+'</div><div class="v20-account-sub">Tracked '+escapeHtml(row.currency)+' balance · Tap for history</div></button>'}).join('');
    box.querySelectorAll('[data-v20-account]').forEach(function(btn){btn.onclick=function(){var row=rows.find(function(r){return r.id===btn.dataset.v20Account});if(row)openAccount(row)}})
  }

  function installFlowSheet(){
    if(byId('v20FlowOverlay'))return;
    var overlay=document.createElement('div');overlay.className='overlay';overlay.id='v20FlowOverlay';overlay.innerHTML='<div class="v20-flow-sheet"><div class="handle"></div><div class="v20-flow-head"><div><h2 id="v20FlowTitle">Move money</h2><p id="v20FlowSubtitle">Record both sides of the movement without changing a person balance.</p></div><button class="v20-close" id="v20FlowClose" type="button">×</button></div><div class="v20-mode-tabs"><button class="v20-mode on" data-v20-mode="internal_transfer" type="button">Internal transfer</button><button class="v20-mode" data-v20-mode="fx_purchase" type="button">Currency exchange</button><button class="v20-mode" data-v20-mode="account_adjustment" type="button">Set account balance</button></div><form id="v20FlowForm"><div id="v20FlowNormal"><div class="v20-flow-grid"><div class="v20-field"><label>From account</label><input id="v20FromAccount" list="v20AccountNames" placeholder="Scotia USD" required></div><div class="v20-field"><label>From currency</label><select id="v20FromCurrency"><option value="TTD">TTD · Trinidad & Tobago</option><option value="USD">USD · US dollar</option></select></div><div class="v20-field"><label>Amount out</label><input id="v20FromAmount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0.00" required></div><div class="v20-field"><label>To account</label><input id="v20ToAccount" list="v20AccountNames" placeholder="FCB USD" required></div><div class="v20-field"><label>To currency</label><select id="v20ToCurrency"><option value="TTD">TTD · Trinidad & Tobago</option><option value="USD">USD · US dollar</option></select></div><div class="v20-field"><label>Amount in</label><input id="v20ToAmount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0.00" required></div></div><div class="v20-field" id="v20CounterpartyWrap" hidden><label>Who are you buying/exchanging with? (optional)</label><input id="v20Counterparty" placeholder="e.g. Mel"></div></div><div id="v20Adjust" hidden><div class="v20-flow-grid"><div class="v20-field"><label>Account</label><input id="v20AdjustAccount" list="v20AccountNames" placeholder="Scotia USD"></div><div class="v20-field"><label>Currency</label><select id="v20AdjustCurrency"><option value="TTD">TTD · Trinidad & Tobago</option><option value="USD">USD · US dollar</option></select></div></div><div class="v20-field"><label>Current balance at the bank</label><input id="v20TargetBalance" type="number" step="0.01" inputmode="decimal" placeholder="0.00"></div><div class="v20-intro" id="v20TrackedBalance">Tracked balance: TTD 0.00</div></div><datalist id="v20AccountNames"></datalist><div class="v20-flow-grid"><div class="v20-field"><label>Date</label><input id="v20FlowDate" type="date" required></div><div class="v20-field"><label>Note (optional)</label><input id="v20FlowNote" placeholder="Reason or reference"></div></div><div class="v20-flow-review" id="v20FlowReview"></div><div class="v20-flow-actions"><button type="button" class="secondary" id="v20FlowCancel">Cancel</button><button type="submit" class="primary" id="v20FlowSave">Save movement</button></div></form></div>';
    document.body.appendChild(overlay);
    byId('v20FlowClose').onclick=closeFlow;byId('v20FlowCancel').onclick=closeFlow;overlay.onclick=function(e){if(e.target===overlay)closeFlow()};
    document.querySelectorAll('[data-v20-mode]').forEach(function(btn){btn.onclick=function(){setMode(btn.dataset.v20Mode)}});
    ['v20FromAccount','v20FromCurrency','v20FromAmount','v20ToAccount','v20ToCurrency','v20ToAmount','v20Counterparty','v20AdjustAccount','v20AdjustCurrency','v20TargetBalance','v20FlowNote'].forEach(function(id){var node=byId(id);if(node){node.addEventListener('input',syncFlow);node.addEventListener('change',syncFlow)}});
    byId('v20FlowForm').onsubmit=saveFlow
  }

  function refreshAccountLists(){
    var list=byId('v20AccountNames');if(list)list.innerHTML=knownAccounts().map(function(name){return '<option value="'+escapeHtml(name)+'"></option>'}).join('')
  }
  function setMode(next){
    mode=next;document.querySelectorAll('[data-v20-mode]').forEach(function(b){b.classList.toggle('on',b.dataset.v20Mode===mode)});
    var adjust=mode==='account_adjustment';byId('v20FlowNormal').hidden=adjust;byId('v20Adjust').hidden=!adjust;byId('v20CounterpartyWrap').hidden=mode!=='fx_purchase';
    byId('v20FlowTitle').textContent=adjust?'Set account balance':mode==='fx_purchase'?'Currency exchange':'Internal transfer';
    byId('v20FlowSubtitle').textContent=adjust?'Create an opening balance or reconcile the tracked account to the bank.':mode==='fx_purchase'?'Link both currency legs. TTD and USD remain separate in the ledger.':'Move money between your own accounts. This does not create debt.';
    if(mode==='internal_transfer'){
      byId('v20ToCurrency').value=byId('v20FromCurrency').value;
      if(byId('v20FromAmount').value)byId('v20ToAmount').value=byId('v20FromAmount').value
    }
    syncFlow()
  }
  function openFlow(next){
    installFlowSheet();refreshAccountLists();setMode(next||'internal_transfer');byId('v20FlowDate').value=todayValue();byId('v20FlowOverlay').style.display='flex';setTimeout(function(){var target=mode==='account_adjustment'?byId('v20AdjustAccount'):byId('v20FromAccount');target&&target.focus()},120)
  }
  function closeFlow(){if(byId('v20FlowOverlay'))byId('v20FlowOverlay').style.display='none'}
  function flowValues(){return {kind:mode,fromAccount:byId('v20FromAccount').value.trim(),fromCurrency:byId('v20FromCurrency').value,fromAmount:Number(byId('v20FromAmount').value),toAccount:byId('v20ToAccount').value.trim(),toCurrency:byId('v20ToCurrency').value,toAmount:Number(byId('v20ToAmount').value),counterparty:byId('v20Counterparty').value.trim(),date:byId('v20FlowDate').value,note:byId('v20FlowNote').value.trim()}}
  function syncFlow(){
    if(!byId('v20FlowReview'))return;
    if(mode==='internal_transfer'){
      byId('v20ToCurrency').value=byId('v20FromCurrency').value;if(document.activeElement===byId('v20FromAmount'))byId('v20ToAmount').value=byId('v20FromAmount').value
    }
    if(mode==='account_adjustment'){
      var name=byId('v20AdjustAccount').value.trim(),c=byId('v20AdjustCurrency').value,current=accountBalance(name,c),target=Number(byId('v20TargetBalance').value||0),delta=target-current;
      byId('v20TrackedBalance').textContent='Tracked balance: '+moneyText(current,c);
      byId('v20FlowReview').innerHTML='<div class="v20-review-route">'+escapeHtml(name||'Account')+' → '+escapeHtml(moneyText(target,c))+'</div><div class="v20-review-lines"><div class="v20-review-box"><small>Adjustment</small><strong>'+escapeHtml((delta>=0?'+':'−')+moneyText(Math.abs(delta),c))+'</strong></div><div class="v20-review-box"><small>Debt impact</small><strong>None</strong></div></div><div class="v20-review-safe">✓ This changes only the tracked account balance.</div>';return
    }
    var f=flowValues(),rate=Flow.rateLabel(f),route=(f.fromAccount||'From account')+' → '+(f.counterparty?f.counterparty+' → ':'')+(f.toAccount||'To account');
    byId('v20FlowReview').innerHTML='<div class="v20-review-route">'+escapeHtml(route)+'</div><div class="v20-review-lines"><div class="v20-review-box"><small>Money out</small><strong>'+escapeHtml(moneyText(f.fromAmount||0,f.fromCurrency))+'</strong></div><div class="v20-review-box"><small>Money in</small><strong>'+escapeHtml(moneyText(f.toAmount||0,f.toCurrency))+'</strong></div>'+(rate?'<div class="v20-review-box"><small>Effective rate</small><strong>'+escapeHtml(rate)+'</strong></div>':'')+'<div class="v20-review-box"><small>Debt impact</small><strong>None</strong></div></div><div class="v20-review-safe">✓ Your person balances will not change.</div>'
  }

  async function postLedgerEntry(entry){return window.api('?action=transaction',{method:'POST',body:JSON.stringify(entry)})}
  async function saveFlow(e){
    e.preventDefault();var button=byId('v20FlowSave'),old=button.textContent;button.disabled=true;button.textContent='Saving…';var previousAction=window.actionMode;window.actionMode='account_flow';
    try{
      var id=groupId();
      if(mode==='account_adjustment'){
        var account=byId('v20AdjustAccount').value.trim(),currency=byId('v20AdjustCurrency').value,current=accountBalance(account,currency),target=Number(byId('v20TargetBalance').value),entry=Flow.buildAccountAdjustmentEntry({account:account,currency:currency,targetBalance:target,currentBalance:current,date:byId('v20FlowDate').value,note:byId('v20FlowNote').value},id);
        await postLedgerEntry(entry);rememberAccounts([account]);toast('Account balance updated. Debt balances unchanged.')
      }else{
        var values=flowValues(),entries=Flow.buildFlowEntries(values,id),saved=[];
        try{
          for(var i=0;i<entries.length;i++){await postLedgerEntry(entries[i]);saved.push(entries[i])}
        }catch(saveError){
          var rollbackFailed=false;
          for(var r=saved.length-1;r>=0;r--){try{var reversal=Object.assign({},saved[r],{direction:saved[r].direction*-1,description:'Automatic reversal of incomplete account flow ['+id+']'});await postLedgerEntry(reversal)}catch(reverseError){rollbackFailed=true}}
          if(rollbackFailed)throw new Error('The transfer only partly saved and the automatic reversal also failed. Check the account history before retrying.');
          throw new Error('The transfer was not completed. The saved leg was automatically reversed.')
        }
        rememberAccounts([values.fromAccount,values.toAccount]);toast(mode==='fx_purchase'?'Currency exchange saved. Debt balances unchanged.':'Internal transfer saved. Debt balances unchanged.')
      }
      closeFlow();await window.load()
    }catch(err){toast(err&&err.message?err.message:'Could not save movement')}
    finally{window.actionMode=previousAction;button.disabled=false;button.textContent=old}
  }

  function installAccountDetail(){
    if(byId('v20AccountOverlay'))return;
    var o=document.createElement('div');o.className='overlay';o.id='v20AccountOverlay';o.innerHTML='<div class="v20-account-detail"><div class="handle"></div><div class="v20-flow-head"><div><div class="eyebrow">Account history</div><h2 id="v20AccountName">Account</h2></div><button class="v20-close" id="v20AccountClose" type="button">×</button></div><div class="v20-detail-balance"><small id="v20AccountCurrency"></small><strong id="v20AccountBalance"></strong></div><div class="v20-account-tools" style="margin-bottom:12px"><button class="v20-small-btn" id="v20AccountAdjust" type="button">Set / reconcile balance</button><button class="v20-small-btn" id="v20AccountTransfer" type="button">Transfer money</button></div><div id="v20AccountTransactions"></div></div>';
    document.body.appendChild(o);byId('v20AccountClose').onclick=function(){o.style.display='none'};o.onclick=function(e){if(e.target===o)o.style.display='none'}
  }
  async function openAccount(row){
    installAccountDetail();byId('v20AccountOverlay').style.display='flex';byId('v20AccountName').textContent=row.name;byId('v20AccountCurrency').textContent=flag(row.currency)+' '+row.currency+' tracked balance';byId('v20AccountBalance').textContent=moneyText(row.balance,row.currency);byId('v20AccountTransactions').innerHTML='<div class="v20-account-empty">Loading account history…</div>';
    byId('v20AccountAdjust').onclick=function(){byId('v20AccountOverlay').style.display='none';openFlow('account_adjustment');byId('v20AdjustAccount').value=row.name;byId('v20AdjustCurrency').value=row.currency;syncFlow()};
    byId('v20AccountTransfer').onclick=function(){byId('v20AccountOverlay').style.display='none';openFlow('internal_transfer');byId('v20FromAccount').value=row.name;byId('v20FromCurrency').value=row.currency;syncFlow()};
    try{
      var d=await window.api('?action=transactions&person_id='+encodeURIComponent(row.id)),txs=(d.transactions||[]).slice().reverse();
      byId('v20AccountTransactions').innerHTML=txs.length?txs.map(function(t){var signed=Number(t.signed_amount||0);return '<div class="v20-account-tx"><div class="left"><strong>'+escapeHtml(t.description||'Account movement')+'</strong><span>'+escapeHtml(t.transaction_date||'')+' · '+escapeHtml(t.currency||'')+'</span></div><div class="right '+(signed>=0?'v20-pos':'v20-neg')+'">'+(signed>=0?'+':'−')+escapeHtml(moneyText(Math.abs(signed),t.currency))+'</div></div>'}).join(''):'<div class="v20-account-empty">No account movements yet.</div>'
    }catch(e){byId('v20AccountTransactions').innerHTML='<div class="v20-account-empty">Could not load account history.</div>'}
  }

  function wrapRender(){
    window.render=function(){originalRender();installDashboardChrome();renderAccounts();refreshAccountLists()};
    window.load=async function(){return originalLoad.apply(this,arguments)}
  }

  installSummaryFilters();installDashboardChrome();installFlowSheet();installAccountDetail();wrapRender();
  if(window.dashboard)try{window.render()}catch(e){}
})();
