(function(){
  'use strict';
  if(!window.ReceiptTools)return;

  var currentReceipt=null;

  function byId(id){return document.getElementById(id)}
  function moneyLine(v,c){return ReceiptTools.moneyText(v,c)}
  function toast(message){if(typeof window.showToast==='function')window.showToast(message)}

  function installStyles(){
    if(byId('receiptStyles'))return;
    var style=document.createElement('style');style.id='receiptStyles';style.textContent=`
#receiptOverlay{z-index:70;background:rgba(17,24,39,.64);align-items:flex-end}
.receiptSheet{width:min(760px,100%);max-height:96vh;overflow:auto;background:#f5f7fb;border-radius:26px 26px 0 0;padding:14px 14px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -20px 60px rgba(17,24,39,.24)}
.receiptPreview{background:#fff;border-radius:22px;padding:24px 22px;box-shadow:0 8px 30px rgba(17,24,39,.07)}
.receiptTop{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding-bottom:18px;border-bottom:1px solid #e5e7eb}
.receiptEyebrow{font-size:12px;font-weight:850;letter-spacing:.13em;color:#374151}
.receiptNumber{font-size:11px;color:#9ca3af;text-align:right;word-break:break-word}
.receiptHero{padding:24px 0 18px}.receiptAmount{font-size:36px;line-height:1.05;font-weight:850;letter-spacing:-.03em;color:#111827}
.receiptStatus{display:inline-block;margin-top:12px;padding:6px 10px;border-radius:999px;font-size:11px;font-weight:850;letter-spacing:.04em;background:#ecfdf3;color:#047857}
.receiptStatus.partial{background:#fff7ed;color:#9a3412}
.receiptPerson{font-size:21px;font-weight:850;margin-top:18px;color:#111827}.receiptMeta{font-size:13px;color:#6b7280;margin-top:5px;line-height:1.5}
.receiptRows{margin-top:20px;border-top:1px solid #e5e7eb}.receiptRow{display:flex;justify-content:space-between;gap:16px;padding:14px 0;border-bottom:1px solid #f0f1f3;font-size:13px}.receiptRow span{color:#6b7280}.receiptRow strong{color:#111827;text-align:right}
.receiptFooter{margin-top:24px;font-size:11px;color:#9ca3af;line-height:1.5}.receiptActions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.receiptAction{border:0;border-radius:14px;padding:14px 12px;font-size:14px;font-weight:850}.receiptAction.share{background:#111827;color:#fff}.receiptAction.pdf{background:#e8f5ee;color:#065f46}.receiptDone{width:100%;border:0;background:transparent;padding:13px;color:#6b7280;font-weight:750}
.receiptHistoryBtn{margin-top:9px;border:0;border-radius:10px;padding:7px 10px;background:#eef2f7;color:#25324a;font-size:11px;font-weight:800}
@media(max-width:460px){.receiptPreview{padding:22px 18px}.receiptAmount{font-size:32px}.receiptActions{grid-template-columns:1fr 1fr}}
`;
    document.head.appendChild(style)
  }

  function installMarkup(){
    if(byId('receiptOverlay'))return;
    var wrap=document.createElement('div');wrap.className='overlay';wrap.id='receiptOverlay';wrap.innerHTML=`
<div class="receiptSheet" role="dialog" aria-modal="true" aria-labelledby="receiptTitle">
  <div class="handle"></div>
  <div class="receiptPreview">
    <div class="receiptTop"><div class="receiptEyebrow" id="receiptTitle">PAYMENT RECEIPT</div><div class="receiptNumber" id="receiptNumber"></div></div>
    <div class="receiptHero"><div class="receiptAmount" id="receiptAmount"></div><div class="receiptStatus" id="receiptStatus"></div><div class="receiptPerson" id="receiptPerson"></div><div class="receiptMeta" id="receiptMeta"></div></div>
    <div class="receiptRows">
      <div class="receiptRow"><span>Previous balance</span><strong id="receiptPrevious"></strong></div>
      <div class="receiptRow"><span>Payment received</span><strong id="receiptPayment"></strong></div>
      <div class="receiptRow"><span>Remaining balance</span><strong id="receiptRemaining"></strong></div>
    </div>
    <div class="receiptFooter">Generated from a confirmed Money Owed Tracker ledger transaction.</div>
  </div>
  <div class="receiptActions"><button class="receiptAction share" id="shareReceiptBtn" type="button">Share Receipt</button><button class="receiptAction pdf" id="saveReceiptPdfBtn" type="button">Save PDF</button></div>
  <button class="receiptDone" id="receiptDoneBtn" type="button">Done</button>
</div>`;
    document.body.appendChild(wrap);
    byId('receiptDoneBtn').onclick=closeReceipt;
    byId('receiptOverlay').onclick=function(e){if(e.target===byId('receiptOverlay'))closeReceipt()};
    byId('shareReceiptBtn').onclick=shareReceipt;
    byId('saveReceiptPdfBtn').onclick=saveReceiptPdf
  }

  function openReceipt(receipt){
    if(!receipt)return;currentReceipt=receipt;
    byId('receiptNumber').textContent=receipt.receiptNumber;
    byId('receiptAmount').textContent=moneyLine(receipt.amount,receipt.currency);
    byId('receiptStatus').textContent=receipt.status;
    byId('receiptStatus').classList.toggle('partial',receipt.status!=='PAID');
    byId('receiptPerson').textContent=receipt.personName;
    byId('receiptMeta').textContent=receipt.transactionDate+(receipt.description?' · '+receipt.description:'');
    byId('receiptPrevious').textContent=moneyLine(receipt.previousBalance,receipt.currency);
    byId('receiptPayment').textContent='− '+moneyLine(receipt.amount,receipt.currency);
    byId('receiptRemaining').textContent=moneyLine(receipt.remainingBalance,receipt.currency);
    byId('receiptOverlay').style.display='flex'
  }
  function closeReceipt(){byId('receiptOverlay').style.display='none'}

  function safeFileName(v){return String(v||'receipt').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80)}
  function downloadBlob(blob,name){var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},2500)}

  async function shareReceipt(){
    if(!currentReceipt)return;
    var button=byId('shareReceiptBtn'),old=button.textContent;button.disabled=true;button.textContent='Preparing…';
    try{
      var blob=await ReceiptTools.renderReceiptPng(currentReceipt),file=new File([blob],safeFileName(currentReceipt.receiptNumber)+'.png',{type:'image/png'}),shareData={title:'Payment Receipt',text:ReceiptTools.receiptText(currentReceipt),files:[file]};
      if(navigator.share&&(!navigator.canShare||navigator.canShare(shareData))){
        try{await navigator.share(shareData);return}catch(e){if(e&&e.name==='AbortError')return}
      }
      if(navigator.share){
        try{await navigator.share({title:'Payment Receipt',text:ReceiptTools.receiptText(currentReceipt)});return}catch(e){if(e&&e.name==='AbortError')return}
      }
      downloadBlob(blob,file.name);toast('Receipt image downloaded.')
    }catch(e){toast(e&&e.message?e.message:'Could not share receipt')}
    finally{button.disabled=false;button.textContent=old}
  }

  function saveReceiptPdf(){
    if(!currentReceipt)return;
    try{ReceiptTools.printReceipt(currentReceipt)}catch(e){toast(e&&e.message?e.message:'Could not open PDF view')}
  }

  function decorateHistoricalReceipts(){
    if(!window.selectedPerson||!byId('statementTransactions'))return;
    var rows=byId('statementTransactions').querySelectorAll('.statementTx'),txs=window.selectedPerson.transactions||[];
    rows.forEach(function(row,index){
      if(row.querySelector('.receiptHistoryBtn'))return;
      var t=txs[index];if(!t||!ReceiptTools.isIncomingRepayment(t))return;
      var btn=document.createElement('button');btn.type='button';btn.className='receiptHistoryBtn';btn.textContent='Receipt';btn.dataset.receiptId=t.id;
      btn.onclick=function(e){e.stopPropagation();var r=ReceiptTools.buildHistoricalReceipt(t.id,window.selectedPerson.transactions,window.selectedPerson.name);if(r)openReceipt(r);else toast('Receipt details unavailable.')};
      row.appendChild(btn)
    })
  }

  function installHistoryObserver(){
    var target=byId('statementTransactions');if(!target)return;
    new MutationObserver(function(){decorateHistoricalReceipts()}).observe(target,{childList:true,subtree:false});
    decorateHistoricalReceipts()
  }

  function installAutomaticReceipt(){
    if(typeof window.api!=='function'||window.api.__receiptWrapped)return;
    var originalApi=window.api;
    var wrapped=async function(path,opts){
      var shouldReceipt=String(path||'').indexOf('action=transaction')>=0&&opts&&String(opts.method||'GET').toUpperCase()==='POST'&&window.actionMode==='they_paid';
      var submitted=null;
      if(shouldReceipt){try{submitted=typeof opts.body==='string'?JSON.parse(opts.body):opts.body}catch(e){submitted=null}}
      var response=await originalApi.apply(this,arguments);
      if(shouldReceipt&&submitted&&response&&response.result){
        var receipt=ReceiptTools.buildReceiptFromConfirmed(response.result,submitted);
        setTimeout(function(){openReceipt(receipt)},450)
      }
      return response
    };
    wrapped.__receiptWrapped=true;window.api=wrapped
  }

  function registerServiceWorker(){
    if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(function(){})
  }

  installStyles();installMarkup();installAutomaticReceipt();installHistoryObserver();registerServiceWorker();
  window.MoneyOwedReceipts={openReceipt:openReceipt,closeReceipt:closeReceipt,decorateHistoricalReceipts:decorateHistoricalReceipts};
})();
