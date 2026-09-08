(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ReceiptTools=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function num(v){var n=Number(v);return Number.isFinite(n)?n:0}
  function clean(v){return String(v==null?'':v).trim()}
  function moneyText(amount,currency){return clean(currency).toUpperCase()+' '+num(amount).toFixed(2)}
  function compactId(id){
    var s=clean(id).replace(/[^a-zA-Z0-9]/g,'').toUpperCase();
    return (s||'PAYMENT').slice(0,8)
  }
  function receiptNumber(transactionId,transactionDate){
    var d=clean(transactionDate).replace(/[^0-9]/g,'').slice(0,8)||'00000000';
    return 'MOT-'+d+'-'+compactId(transactionId)
  }
  function statusFor(balance){return Math.abs(num(balance))<0.005?'PAID':'PART PAYMENT'}
  function baseReceipt(data){
    var out={
      transactionId:clean(data.transactionId),
      personName:clean(data.personName)||'Unknown',
      currency:clean(data.currency).toUpperCase(),
      amount:Math.abs(num(data.amount)),
      description:clean(data.description),
      transactionDate:clean(data.transactionDate),
      previousBalance:num(data.previousBalance),
      remainingBalance:num(data.remainingBalance)
    };
    out.receiptNumber=receiptNumber(out.transactionId,out.transactionDate);
    out.status=statusFor(out.remainingBalance);
    return out
  }
  function buildReceiptFromConfirmed(result,submitted){
    result=result||{};submitted=submitted||{};
    return baseReceipt({
      transactionId:result.transaction_id||result.id,
      personName:result.person_name||submitted.person_name,
      currency:result.currency||submitted.currency,
      amount:submitted.amount!=null?submitted.amount:Math.abs(num(result.signed_change)),
      description:submitted.description,
      transactionDate:submitted.transaction_date,
      previousBalance:result.previous_balance,
      remainingBalance:result.new_balance
    })
  }
  function isIncomingRepayment(transaction){
    transaction=transaction||{};
    var t=clean(transaction.transaction_type);
    if(t!=='repayment'&&t!=='they_paid_me')return false;
    if(transaction.signed_amount!=null)return num(transaction.signed_amount)<-0.004;
    return num(transaction.direction)===-1
  }
  function txSort(a,b){
    var da=clean(a&&a.transaction_date),db=clean(b&&b.transaction_date);
    if(da!==db)return da.localeCompare(db);
    return clean(a&&a.created_at).localeCompare(clean(b&&b.created_at))
  }
  function buildHistoricalReceipt(transactionId,transactions,personName){
    var id=clean(transactionId),balances={},target=null;
    var ordered=(transactions||[]).slice().sort(txSort);
    for(var i=0;i<ordered.length;i++){
      var t=ordered[i]||{},c=clean(t.currency).toUpperCase(),before=num(balances[c]),signed=num(t.signed_amount);
      var after=before+signed;
      if(clean(t.id)===id){
        if(!isIncomingRepayment(t))return null;
        target=baseReceipt({
          transactionId:t.id,
          personName:personName,
          currency:c,
          amount:t.amount!=null?t.amount:Math.abs(signed),
          description:t.description,
          transactionDate:t.transaction_date,
          previousBalance:before,
          remainingBalance:after
        })
      }
      balances[c]=after
    }
    return target
  }
  function receiptText(r){
    if(!r)return '';
    var lines=[
      'PAYMENT RECEIPT',
      r.receiptNumber,
      '',
      'Received from: '+r.personName,
      'Date: '+r.transactionDate,
      'Amount received: '+moneyText(r.amount,r.currency)
    ];
    if(r.description)lines.push('Reference: '+r.description);
    lines.push(
      'Previous balance: '+moneyText(r.previousBalance,r.currency),
      'Payment received: '+moneyText(r.amount,r.currency),
      'Remaining balance: '+moneyText(r.remainingBalance,r.currency),
      'Status: '+r.status,
      '',
      'Money Owed Tracker'
    );
    return lines.join('\n')
  }
  function rounded(ctx,x,y,w,h,r){
    r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()
  }
  function drawRow(ctx,label,value,y){
    ctx.fillStyle='#6b7280';ctx.font='500 30px system-ui, -apple-system, Segoe UI, sans-serif';ctx.fillText(label,110,y);
    ctx.fillStyle='#111827';ctx.font='600 30px system-ui, -apple-system, Segoe UI, sans-serif';ctx.textAlign='right';ctx.fillText(value,970,y);ctx.textAlign='left'
  }
  function renderReceiptPng(r){
    if(typeof document==='undefined')return Promise.reject(new Error('Canvas unavailable'));
    var canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;var ctx=canvas.getContext('2d');
    ctx.fillStyle='#f5f7fb';ctx.fillRect(0,0,1080,1350);
    ctx.fillStyle='#ffffff';rounded(ctx,55,55,970,1240,34);ctx.fill();
    ctx.fillStyle='#111827';ctx.font='700 31px system-ui, -apple-system, Segoe UI, sans-serif';ctx.fillText('PAYMENT RECEIPT',110,140);
    ctx.fillStyle='#6b7280';ctx.font='500 24px system-ui, -apple-system, Segoe UI, sans-serif';ctx.textAlign='right';ctx.fillText(r.receiptNumber,970,140);ctx.textAlign='left';
    ctx.fillStyle='#111827';ctx.font='700 62px system-ui, -apple-system, Segoe UI, sans-serif';ctx.fillText(moneyText(r.amount,r.currency),110,260);
    ctx.fillStyle=r.status==='PAID'?'#ecfdf3':'#fff7ed';rounded(ctx,110,300,250,56,28);ctx.fill();
    ctx.fillStyle=r.status==='PAID'?'#047857':'#9a3412';ctx.font='700 23px system-ui, -apple-system, Segoe UI, sans-serif';ctx.fillText(r.status,138,337);
    ctx.strokeStyle='#e5e7eb';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(110,405);ctx.lineTo(970,405);ctx.stroke();
    drawRow(ctx,'Received from',r.personName,480);
    drawRow(ctx,'Date',r.transactionDate,545);
    if(r.description)drawRow(ctx,'Reference',r.description.length>38?r.description.slice(0,35)+'…':r.description,610);
    var start=r.description?700:635;
    ctx.strokeStyle='#e5e7eb';ctx.beginPath();ctx.moveTo(110,start-55);ctx.lineTo(970,start-55);ctx.stroke();
    drawRow(ctx,'Previous balance',moneyText(r.previousBalance,r.currency),start);
    drawRow(ctx,'Payment received','-'+moneyText(r.amount,r.currency),start+70);
    drawRow(ctx,'Remaining balance',moneyText(r.remainingBalance,r.currency),start+140);
    ctx.strokeStyle='#e5e7eb';ctx.beginPath();ctx.moveTo(110,start+205);ctx.lineTo(970,start+205);ctx.stroke();
    ctx.fillStyle='#111827';ctx.font='600 26px system-ui, -apple-system, Segoe UI, sans-serif';ctx.fillText('Money Owed Tracker',110,1190);
    ctx.fillStyle='#9ca3af';ctx.font='400 22px system-ui, -apple-system, Segoe UI, sans-serif';ctx.fillText('Payment receipt generated from the confirmed ledger transaction.',110,1232);
    return new Promise(function(resolve,reject){canvas.toBlob(function(blob){blob?resolve(blob):reject(new Error('Could not create receipt image'))},'image/png',0.95)})
  }
  function escHtml(v){return clean(v).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function printHtml(r){
    function row(label,value){return '<div class="row"><span>'+escHtml(label)+'</span><strong>'+escHtml(value)+'</strong></div>'}
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escHtml(r.receiptNumber)+'</title><style>@page{margin:18mm}*{box-sizing:border-box}body{font-family:Inter,Arial,sans-serif;color:#111827;margin:0;background:#fff}.receipt{max-width:720px;margin:auto;padding:28px}.top{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #e5e7eb;padding-bottom:22px}.eyebrow{font-size:13px;font-weight:800;letter-spacing:.12em}.number{font-size:12px;color:#6b7280}.amount{font-size:38px;font-weight:800;margin:30px 0 10px}.badge{display:inline-block;padding:7px 11px;border-radius:999px;background:#ecfdf3;color:#047857;font-size:12px;font-weight:800}.name{font-size:26px;font-weight:800;margin:34px 0 6px}.muted{color:#6b7280}.rows{margin-top:30px;border-top:1px solid #e5e7eb}.row{display:flex;justify-content:space-between;gap:20px;padding:16px 0;border-bottom:1px solid #f0f1f3}.row span{color:#6b7280}.footer{margin-top:42px;font-size:12px;color:#9ca3af}@media print{button{display:none}}</style></head><body><div class="receipt"><div class="top"><div class="eyebrow">PAYMENT RECEIPT</div><div class="number">'+escHtml(r.receiptNumber)+'</div></div><div class="amount">'+escHtml(moneyText(r.amount,r.currency))+'</div><div class="badge">'+escHtml(r.status)+'</div><div class="name">'+escHtml(r.personName)+'</div><div class="muted">'+escHtml(r.transactionDate)+(r.description?' · '+escHtml(r.description):'')+'</div><div class="rows">'+row('Previous balance',moneyText(r.previousBalance,r.currency))+row('Payment received','-'+moneyText(r.amount,r.currency))+row('Remaining balance',moneyText(r.remainingBalance,r.currency))+'</div><div class="footer">Money Owed Tracker · Generated from a confirmed ledger transaction.</div></div><script>window.onload=function(){setTimeout(function(){window.print()},150)}<\/script></body></html>'
  }
  function printReceipt(r){
    if(typeof window==='undefined')throw new Error('Print unavailable');
    var w=window.open('','_blank','noopener,noreferrer');if(!w)throw new Error('Allow pop-ups to save the receipt as PDF');
    w.document.open();w.document.write(printHtml(r));w.document.close();return true
  }

  return {
    receiptNumber:receiptNumber,
    buildReceiptFromConfirmed:buildReceiptFromConfirmed,
    buildHistoricalReceipt:buildHistoricalReceipt,
    isIncomingRepayment:isIncomingRepayment,
    receiptText:receiptText,
    renderReceiptPng:renderReceiptPng,
    printReceipt:printReceipt,
    printHtml:printHtml,
    moneyText:moneyText
  }
});
