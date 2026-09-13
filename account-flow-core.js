(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.AccountFlowCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  var PREFIX='Account · ';

  function clean(v){return String(v==null?'':v).trim()}
  function num(v){var n=Number(v);return Number.isFinite(n)?n:0}
  function accountPersonName(name){return PREFIX+clean(name)}
  function isAccountPersonName(name){return clean(name).indexOf(PREFIX)===0}
  function stripAccountPrefix(name){var s=clean(name);return isAccountPersonName(s)?s.slice(PREFIX.length):s}
  function formatMoney(amount,currency){
    var n=num(amount).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4});
    if(currency==='TTD')return 'TT$'+n;
    if(currency==='USD')return 'US$'+n;
    return clean(currency)+' '+n
  }
  function effectiveRate(flow){
    var a=num(flow.fromAmount),b=num(flow.toAmount),fc=clean(flow.fromCurrency).toUpperCase(),tc=clean(flow.toCurrency).toUpperCase();
    if(a<=0||b<=0||fc===tc)return null;
    if(fc==='TTD'&&tc==='USD')return a/b;
    if(fc==='USD'&&tc==='TTD')return b/a;
    return a/b
  }
  function rateLabel(flow){
    var r=effectiveRate(flow);if(!r)return '';
    var fc=clean(flow.fromCurrency).toUpperCase(),tc=clean(flow.toCurrency).toUpperCase();
    if((fc==='TTD'&&tc==='USD')||(fc==='USD'&&tc==='TTD'))return 'TT$'+r.toFixed(4)+' / US$1';
    return r.toFixed(4)+' '+fc+' / '+tc
  }
  function debtTotalsFromBalances(balances){
    var totals={};
    (balances||[]).forEach(function(row){
      if(isAccountPersonName(row.person_name||row.name))return;
      var c=clean(row.currency).toUpperCase();if(!c)return;
      if(!totals[c])totals[c]={toMe:0,iOwe:0};
      var v=num(row.balance);
      if(v>0)totals[c].toMe+=v;else if(v<0)totals[c].iOwe+=Math.abs(v)
    });
    if(!totals.TTD)totals.TTD={toMe:0,iOwe:0};
    if(!totals.USD)totals.USD={toMe:0,iOwe:0};
    return totals
  }
  function extractFlowId(description){
    var match=clean(description).match(/\[(FLOW-[^\]]+)\]/);
    return match?match[1]:''
  }
  function groupFlowTransactions(rows){
    var groups={};
    (rows||[]).forEach(function(row){
      var id=extractFlowId(row.description);if(!id)return;
      if(!groups[id])groups[id]=[];groups[id].push(row)
    });
    return Object.keys(groups).map(function(id){
      var items=groups[id],reversed=items.some(function(row){return /^Automatic reversal/.test(clean(row.description))});
      var originals=items.filter(function(row){return !/^Automatic reversal/.test(clean(row.description))});
      var from=originals.find(function(row){return num(row.signed_amount)<0}),to=originals.find(function(row){return num(row.signed_amount)>0}),sample=originals[0]||items[0]||{};
      var description=clean(sample.description),kind=description.indexOf('Currency exchange')===0?'Currency exchange':'Internal transfer';
      var via=description.match(/ via (.+?)(?: · Rate| · | \[FLOW-|$)/);
      var rate=description.match(/ · Rate (.+?)(?: · | \[FLOW-|$)/);
      return {
        id:id,kind:kind,reversed:reversed,date:clean(sample.transaction_date),counterparty:via?via[1]:'',rate:rate?rate[1]:'',
        fromAccount:from?stripAccountPrefix(from.person_name):'',toAccount:to?stripAccountPrefix(to.person_name):'',
        fromCurrency:from?clean(from.currency).toUpperCase():'',toCurrency:to?clean(to.currency).toUpperCase():'',
        fromAmount:from?Math.abs(num(from.signed_amount)):0,toAmount:to?Math.abs(num(to.signed_amount)):0,items:items
      }
    }).sort(function(a,b){return String(b.date).localeCompare(String(a.date))||b.id.localeCompare(a.id)})
  }
  function buildAccountAdjustmentEntry(data,groupId){
    var account=clean(data.account),currency=clean(data.currency).toUpperCase(),target=num(data.targetBalance),current=num(data.currentBalance),date=clean(data.date),note=clean(data.note),group=clean(groupId);
    if(!account||!currency)throw new Error('Account and currency are required.');
    var delta=target-current;
    if(Math.abs(delta)<0.0001)throw new Error('The account is already at that balance.');
    var noteText=note?' · '+note:'';
    var marker=group?' ['+group+']':'';
    return {person_name:accountPersonName(account),currency:currency,transaction_type:'other',description:'Account balance adjustment to '+formatMoney(target,currency)+noteText+marker,amount:Math.abs(delta),direction:delta>0?1:-1,transaction_date:date}
  }
  function buildFlowEntries(flow,groupId){
    var kind=flow.kind==='fx_purchase'?'fx_purchase':'internal_transfer';
    var fromAccount=clean(flow.fromAccount),toAccount=clean(flow.toAccount),fromCurrency=clean(flow.fromCurrency).toUpperCase(),toCurrency=clean(flow.toCurrency).toUpperCase();
    var fromAmount=num(flow.fromAmount),toAmount=num(flow.toAmount),counterparty=clean(flow.counterparty),note=clean(flow.note),date=clean(flow.date),group=clean(groupId);
    if(!fromAccount||!toAccount||fromAmount<=0||toAmount<=0||!fromCurrency||!toCurrency)throw new Error('Both accounts, currencies and positive amounts are required.');
    if(fromAccount.toLowerCase()===toAccount.toLowerCase()&&fromCurrency===toCurrency)throw new Error('From and to accounts must be different.');
    if(kind==='internal_transfer'&&(fromCurrency!==toCurrency||Math.abs(fromAmount-toAmount)>.0001))throw new Error('Internal transfers must use the same currency and amount. Use currency exchange for FX.');
    var flowText=kind==='fx_purchase'?'Currency exchange':'Internal transfer';
    var via=counterparty?' via '+counterparty:'';
    var rate=rateLabel(flow),rateText=rate?' · Rate '+rate:'';
    var noteText=note?' · '+note:'';
    var marker=group?' ['+group+']':'';
    return [
      {person_name:accountPersonName(fromAccount),currency:fromCurrency,transaction_type:'other',description:flowText+' out to '+toAccount+via+rateText+noteText+marker,amount:fromAmount,direction:-1,transaction_date:date},
      {person_name:accountPersonName(toAccount),currency:toCurrency,transaction_type:'other',description:flowText+' in from '+fromAccount+via+rateText+noteText+marker,amount:toAmount,direction:1,transaction_date:date}
    ]
  }
  return {PREFIX: PREFIX,accountPersonName:accountPersonName,isAccountPersonName:isAccountPersonName,stripAccountPrefix:stripAccountPrefix,effectiveRate:effectiveRate,rateLabel:rateLabel,debtTotalsFromBalances:debtTotalsFromBalances,extractFlowId:extractFlowId,groupFlowTransactions:groupFlowTransactions,buildFlowEntries:buildFlowEntries,buildAccountAdjustmentEntry:buildAccountAdjustmentEntry,formatMoney:formatMoney}
});
