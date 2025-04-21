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

  // open modal
  function openPaymentModal(id,current,fee){
    document.getElementById('payment_id').value = id;
    document.getElementById('amount_paid').value = current;
    document.getElementById('monthly_fee_display').textContent = formatCurrency(fee);
    document.getElementById('remaining_display').textContent = formatCurrency(fee - current);
    document.getElementById('paymentModal').classList.remove('hidden');
  }

  // hide modal
  function closePaymentModal(){
    document.getElementById('paymentModal').classList.add('hidden');
  }

  // send update to server
  function updatePayment(){
    const id = document.getElementById('payment_id').value;
    const paid = document.getElementById('amount_paid').value;
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
