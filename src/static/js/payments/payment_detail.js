(function(){
  // helpers to get cookie and format number to IDR
  function getCookie(name){
    const parts = document.cookie.split(';').map(c=>c.trim());
    const kv = parts.find(c=>c.startsWith(name+'='));
    return kv ? decodeURIComponent(kv.split('=')[1]) : '';
  }
  
  function formatCurrency(n){
    return new Intl.NumberFormat('id-ID').format(n);
  }

  // parse formatted currency back to number
  function parseCurrency(str){
    return parseInt(str.replace(/\D/g,'')) || 0;
  }

  // func to handle input formatting
  function formatCurrencyInput(input) {
    // store cursor position
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const oldLength = input.value.length;
    
    // get raw number and format it
    const rawValue = parseCurrency(input.value);
    input.value = formatCurrency(rawValue);
    
    // adjust cursor position to account for formatting changes
    const newLength = input.value.length;
    const cursorAdjust = newLength - oldLength;
    
    // set cursor position
    input.setSelectionRange(start + cursorAdjust, end + cursorAdjust);
    
    // update remaining display
    const fee = parseCurrency(document.getElementById('monthly_fee_display').textContent);
    document.getElementById('remaining_display').textContent = formatCurrency(fee - rawValue);
  }

  // open modal
  function openPaymentModal(id, current, fee){
    document.getElementById('payment_id').value = id;
    // format the amount paid right when opening the modal
    document.getElementById('amount_paid').value = formatCurrency(current);
    document.getElementById('remaining_display').textContent = formatCurrency(fee - current);
    document.getElementById('paymentModal').classList.remove('hidden');
    
    // focus on the input after modal is visible
    setTimeout(() => {
      const amountInput = document.getElementById('amount_paid');
      amountInput.focus();
      amountInput.select();
    }, 100);
  }

  // hide modal
  function closePaymentModal(){
    document.getElementById('paymentModal').classList.add('hidden');
  }

  // send update to server
  function updatePayment(){
    const id = document.getElementById('payment_id').value;
    // parse the formatted value back to a number
    const paid = parseCurrency(document.getElementById('amount_paid').value);
    const fd = new FormData();
    fd.append('amount_paid', paid);

    fetch(`/payments/update/${id}/`, {
      method:'POST',
      headers:{'X-CSRFToken': getCookie('csrftoken')},
      body: fd
    })
    .then(r=>r.json())
    .then(d=>{
      if(d.success) location.reload();
      else alert('error: '+d.message);
    })
    .catch(()=>alert('error updating payment'));
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    // initial currency format
    document.querySelectorAll('.currency').forEach(el=>{
      const num = Number(el.dataset.raw.replace(/\D/g,''));
      el.textContent = formatCurrency(num);
    });
    
    // bind btns
    document.querySelectorAll('.update-payment-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        openPaymentModal(
          btn.dataset.id,
          Number(btn.dataset.current),
          Number(btn.dataset.fee)
        );
      });
    });
    
    // Format amount as user types
    const amountInput = document.getElementById('amount_paid');
    if (amountInput) {
      amountInput.addEventListener('input', function() {
        formatCurrencyInput(this);
      });
      
      // Also format when the input gains focus
      amountInput.addEventListener('focus', function() {
        formatCurrencyInput(this);
      });
      
      // Handle arrow keys and backspace properly
      amountInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          document.getElementById('save-payment-btn').click();
        }
      });
    }
    
    document.getElementById('close-payment-btn').addEventListener('click', closePaymentModal);
    document.getElementById('save-payment-btn').addEventListener('click', updatePayment);
    window.addEventListener('click', e=>{
      if(e.target===document.getElementById('paymentModal')) closePaymentModal();
    });
  });

  // expose for inline use if needed
  window.openPaymentModal = openPaymentModal;
  window.closePaymentModal = closePaymentModal;
  window.updatePayment = updatePayment;
})();
