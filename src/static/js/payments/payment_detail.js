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
    
    // Update remaining display and total if this is part of installment inputs
    if (input.classList.contains('installment-input')) {
      updateInstallmentTotal();
    } else {
      // Standard single payment input
      const fee = parseCurrency(document.getElementById('monthly_fee_display').textContent);
      const remaining = fee - rawValue;
      const remainingDisplay = document.getElementById('remaining_display');
      
      if (remaining < 0) {
        remainingDisplay.innerHTML = '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><i class="fa-solid fa-exclamation-triangle mr-1"></i>Exceeds monthly fee</span>';
      } else {
        remainingDisplay.innerHTML = `Rp<span class="font-medium">${formatCurrency(remaining)}</span>`;
      }
    }
  }
  
  // Calculate the total from all installment inputs
  function updateInstallmentTotal() {
    const inputs = document.querySelectorAll('.installment-input');
    let total = 0;
    
    inputs.forEach(input => {
      total += parseCurrency(input.value);
    });
    
    document.getElementById('total_paid').value = total;
    
    // Update the remaining amount display
    const fee = parseCurrency(document.getElementById('monthly_fee_display').textContent);
    const remaining = fee - total;
    const remainingDisplay = document.getElementById('remaining_display');
    
    if (remaining < 0) {
      remainingDisplay.innerHTML = '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><i class="fa-solid fa-exclamation-triangle mr-1"></i>Exceeds monthly fee</span>';
    } else {
      remainingDisplay.innerHTML = `Rp<span class="font-medium">${formatCurrency(remaining)}</span>`;
    }
  }
  
  // Create a new installment input field
  function createInstallmentInput(number, value = 0) {
    const container = document.createElement('div');
    container.className = 'installment-input-container flex items-center space-x-2';
    container.dataset.installmentNumber = number;
    
    const label = document.createElement('label');
    label.className = 'text-sm font-medium text-gray-700 w-1/3';
    label.textContent = `Installment ${number}`;
    
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'flex-1 relative';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.name = `installment_${number}`;
    input.value = formatCurrency(value);
    input.className = 'installment-input mt-1 focus:ring-[#ff4f25] focus:border-[#ff4f25] block w-full shadow-sm sm:text-sm border-gray-300 p-1 rounded-md';
    
    // Add event listeners to the new input
    input.addEventListener('input', function() {
      formatCurrencyInput(this);
    });
    
    input.addEventListener('focus', function() {
      formatCurrencyInput(this);
    });
    
    inputWrapper.appendChild(input);
    
    let removeButton = null;
    // Only add a remove button if it's not the first installment
    if (number > 1) {
      removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'text-red-500 hover:text-red-700';
      removeButton.innerHTML = '<i class="fa-solid fa-times"></i>';
      
      removeButton.addEventListener('click', function() {
        container.remove();
        updateInstallmentNumbers();
        updateInstallmentTotal();
      });
    }
    
    container.appendChild(label);
    container.appendChild(inputWrapper);
    if (removeButton) {
      container.appendChild(removeButton);
    }
    
    return container;
  }
  
  // Update the numbering of installment inputs after deleting one
  function updateInstallmentNumbers() {
    const containers = document.querySelectorAll('.installment-input-container');
    containers.forEach((container, idx) => {
      const number = idx + 1;
      container.dataset.installmentNumber = number;
      
      // Update label text
      const label = container.querySelector('label');
      label.textContent = `Installment ${number}`;
      
      // Update input name
      const input = container.querySelector('input');
      input.name = `installment_${number}`;
      
      // Only the first installment should not have a remove button
      if (number === 1) {
        const removeButton = container.querySelector('button');
        if (removeButton) {
          removeButton.remove();
        }
      }
    });
    
    // Update the current installment count in the header
    document.getElementById('current-installment').textContent = containers.length;
  }

  // open modal
  function openPaymentModal(id, current, fee, isInstallment, currentInstallment){
    // Reset modal
    document.getElementById('payment_id').value = id;
    document.getElementById('monthly_fee_display').textContent = formatCurrency(fee);
    document.getElementById('is_installment').value = isInstallment;
    document.getElementById('current_installment').value = currentInstallment || 0;
    document.getElementById('total_paid').value = current;
    
    // Reset toggle
    const toggle = document.getElementById('installment-toggle');
    toggle.checked = isInstallment;
    updateToggleState();
    
    // For installment payments, show installment inputs
    if (isInstallment) {
      // Show installment section
      document.getElementById('single-payment-section').classList.add('hidden');
      const installmentSection = document.getElementById('installment-payment-section');
      installmentSection.classList.remove('hidden');
      
      // Clear any existing installment inputs
      const inputsContainer = document.getElementById('installment-inputs-container');
      inputsContainer.innerHTML = '';
      
      // If this is an existing installment payment
      if (current > 0) {
        // First, try to fetch the payment details and installment history
        fetch(`/payments/get-installment-data/${id}/`)
          .then(response => response.json())
          .then(data => {
            // Show installment history if we have records
            if (data.installment_records && data.installment_records.length > 0) {
              populateInstallmentHistory(data.installment_records);
              document.getElementById('installment-history').classList.remove('hidden');
            } else {
              document.getElementById('installment-history').classList.add('hidden');
            }
            
            // Create installment inputs based on the installment data
            const installmentsToShow = currentInstallment > 0 ? currentInstallment : 1;
            
            if (data.success && data.installment_details) {
              // Use the stored installment amounts
              for (let i = 1; i <= installmentsToShow; i++) {
                const key = `installment_${i}`;
                const amount = data.installment_details[key] ? 
                  parseInt(data.installment_details[key]) : 
                  (current / installmentsToShow);
                
                const input = createInstallmentInput(i, amount);
                inputsContainer.appendChild(input);
              }
            } else {
              // Fallback if we can't get the individual amounts
              const averageAmount = current / installmentsToShow;
              for (let i = 1; i <= installmentsToShow; i++) {
                const input = createInstallmentInput(i, averageAmount);
                inputsContainer.appendChild(input);
              }
            }
            
            // Update installment numbers and total
            updateInstallmentNumbers();
            updateInstallmentTotal();
          })
          .catch(error => {
            console.error('Error fetching installment data:', error);
            document.getElementById('installment-history').classList.add('hidden');
            
            // If the fetch fails, fall back to evenly distributed amounts
            const installmentsToShow = currentInstallment > 0 ? currentInstallment : 1;
            const averageAmount = current / installmentsToShow;
            for (let i = 1; i <= installmentsToShow; i++) {
              const input = createInstallmentInput(i, averageAmount);
              inputsContainer.appendChild(input);
            }
            
            // Update installment numbers and total
            updateInstallmentNumbers();
            updateInstallmentTotal();
          });
      } else {
        // Hide installment history for new payments
        document.getElementById('installment-history').classList.add('hidden');
        
        // Create first empty installment input
        const input = createInstallmentInput(1);
        inputsContainer.appendChild(input);
      }
      
      // Update max installments display
      document.getElementById('max-installments').textContent = document.getElementById('max-installments').textContent || '2';
      
      // Update remaining display
      document.getElementById('remaining_display').textContent = formatCurrency(fee - current);
    } else {
      // Show single payment section
      document.getElementById('installment-payment-section').classList.add('hidden');
      document.getElementById('single-payment-section').classList.remove('hidden');
      
      // Set the value of the single payment input
      document.getElementById('amount_paid').value = formatCurrency(current);
      document.getElementById('remaining_display').textContent = formatCurrency(fee - current);
    }
    
    // Show the modal
    document.getElementById('paymentModal').classList.remove('hidden');
    
    // Focus on the appropriate input
    setTimeout(() => {
      if (isInstallment) {
        const input = document.querySelector('.installment-input');
        if (input) {
          input.focus();
          input.select();
        }
      } else {
        const amountInput = document.getElementById('amount_paid');
        amountInput.focus();
        amountInput.select();
      }
    }, 100);
  }
  
  // Populate the installment history table
  function populateInstallmentHistory(records) {
    const tableBody = document.getElementById('installment-history-body');
    tableBody.innerHTML = '';
    
    records.forEach(record => {
      const row = document.createElement('tr');
      row.className = 'border-t border-gray-100';
      
      const numberCell = document.createElement('td');
      numberCell.className = 'py-1 px-2';
      numberCell.textContent = record.number;
      
      const amountCell = document.createElement('td');
      amountCell.className = 'py-1 px-2';
      amountCell.textContent = `Rp ${formatCurrency(record.amount)}`;
      
      const dateCell = document.createElement('td');
      dateCell.className = 'py-1 px-2';
      dateCell.textContent = record.date;
      
      row.appendChild(numberCell);
      row.appendChild(amountCell);
      row.appendChild(dateCell);
      
      tableBody.appendChild(row);
    });
  }
  
  // Update the toggle state and show/hide relevant sections
  function updateToggleState() {
    const toggle = document.getElementById('installment-toggle');
    const isInstallment = toggle.checked;
    const toggleDot = document.querySelector('.toggle-dot');
    
    document.getElementById('is_installment').value = isInstallment;
    
    // Update the toggle's visual state to match its actual state
    if (isInstallment) {
      toggleDot.classList.add('transform', 'translate-x-4');
      document.getElementById('single-payment-section').classList.add('hidden');
      document.getElementById('installment-payment-section').classList.remove('hidden');
      
      // Ensure there's at least one installment input
      const inputsContainer = document.getElementById('installment-inputs-container');
      if (!inputsContainer.querySelector('.installment-input-container')) {
        const input = createInstallmentInput(1);
        inputsContainer.appendChild(input);
      }
    } else {
      toggleDot.classList.remove('transform', 'translate-x-4');
      document.getElementById('installment-payment-section').classList.add('hidden');
      document.getElementById('single-payment-section').classList.remove('hidden');
    }
  }

  // hide modal
  function closePaymentModal(){
    document.getElementById('paymentModal').classList.add('hidden');
  }

  // send update to server
  function updatePayment(){
    const id = document.getElementById('payment_id').value;
    const isInstallment = document.getElementById('installment-toggle').checked;
    const fd = new FormData();
    
    let amountPaid = 0;
    const fee = parseCurrency(document.getElementById('monthly_fee_display').textContent);
    
    if (isInstallment) {
      // Sum all installment inputs and validate for zero values
      const inputs = document.querySelectorAll('.installment-input');
      
      // chck for zero values before processing any data
      for (let i = 0; i < inputs.length; i++) {
        const value = parseCurrency(inputs[i].value);
        if (value === 0) {
          alert(`Installment ${i + 1} payment cannot be 0. Please enter a valid amount for all installments.`);
          return;
        }
      }
      
      // Now process all installments since we know none are zero
      inputs.forEach((input, index) => {
        const value = parseCurrency(input.value);
        amountPaid += value;
        // Add each installment amount to the form data for future reference
        fd.append(`installment_${index + 1}`, value);
      });
      
      // Check if total installment amount exceeds monthly fee
      if (amountPaid > fee) {
        alert('Total installment amount cannot exceed the monthly fee.');
        return;
      }
      
      // Get the current number of installments
      fd.append('installment_count', inputs.length);
    } else {
      // Just use the single payment amount
      amountPaid = parseCurrency(document.getElementById('amount_paid').value);
      
      // chck if single payment amount is zero
      if (amountPaid === 0) {
        alert('Payment amount cannot be 0. Please enter a valid amount.');
        return;
      }
      
      // Check if single payment amount exceeds monthly fee
      if (amountPaid > fee) {
        alert('Payment amount cannot exceed the monthly fee.');
        return;
      }
      
      // If payment is less than monthly fee and not already an installment payment,
      // automatically convert to installment payment
      if (amountPaid < fee && amountPaid > 0) {
        // auto-convert to installment payment
        fd.append('auto_convert_to_installment', 'true');
        fd.append('installment_1', amountPaid);
        fd.append('installment_count', 1);
        fd.append('is_installment', 'true');
      } else {
        fd.append('is_installment', 'false');
      }
    }
    
    // Add the total amount to the form data
    fd.append('amount_paid', amountPaid);
    if (!fd.has('is_installment')) {
      fd.append('is_installment', isInstallment);
    }

    fetch(`/payments/update/${id}/`, {
      method:'POST',
      headers:{'X-CSRFToken': getCookie('csrftoken')},
      body: fd
    })
    .then(r=>r.json())
    .then(d=>{
      if(d.success) {
        location.reload();
      } else {
        alert('error: '+d.message);
      }
    })
    .catch(()=>alert('error updating payment'));
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Format all currency displays
    document.querySelectorAll('.currency').forEach(el => {
      const num = Number(el.dataset.raw.replace(/\D/g,''));
      el.textContent = formatCurrency(num);
    });
    
    // Bind update payment buttons
    document.querySelectorAll('.update-payment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openPaymentModal(
          btn.dataset.id,
          Number(btn.dataset.current),
          Number(btn.dataset.fee),
          btn.dataset.isInstallment === 'true',
          Number(btn.dataset.currentInstallment)
        );
      });
    });
    
    // Format amount as user types in the single payment input
    const amountInput = document.getElementById('amount_paid');
    if (amountInput) {
      amountInput.addEventListener('input', function() {
        formatCurrencyInput(this);
      });
      
      amountInput.addEventListener('focus', function() {
        formatCurrencyInput(this);
      });
      
      amountInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          document.getElementById('save-payment-btn').click();
        }
      });
    }
    
    // Toggle between single and installment payment
    const installmentToggle = document.getElementById('installment-toggle');
    if (installmentToggle) {
      installmentToggle.addEventListener('change', function() {
        updateToggleState();
        
        // Apply toggle styling
        const toggleDot = document.querySelector('.toggle-dot');
        if (this.checked) {
          toggleDot.classList.add('transform', 'translate-x-4');
        } else {
          toggleDot.classList.remove('transform', 'translate-x-4');
        }
      });
    }
    
    // Add new installment input
    const addInstallmentBtn = document.getElementById('add-installment-btn');
    if (addInstallmentBtn) {
      addInstallmentBtn.addEventListener('click', function() {
        const inputsContainer = document.getElementById('installment-inputs-container');
        const currentCount = inputsContainer.querySelectorAll('.installment-input-container').length;
        const maxInstallments = parseInt(document.getElementById('max-installments').textContent) || 2;
        
        // Check if we're at the maximum allowed installments
        if (currentCount >= maxInstallments) {
          alert(`Maximum of ${maxInstallments} installments allowed.`);
          return;
        }

        // chck if any existing installment has zero value
        const existingInputs = document.querySelectorAll('.installment-input');
        let hasZeroValue = false;
        existingInputs.forEach(input => {
          if (parseCurrency(input.value) === 0) {
            hasZeroValue = true;
          }
        });
        
        if (hasZeroValue) {
          alert('Please enter a valid amount for all existing installments before adding a new one.');
          return;
        }

        // Check if monthly fee already achieved
        let currentTotalPaid = 0;
        document.querySelectorAll('.installment-input').forEach(input => {
          currentTotalPaid += parseCurrency(input.value);
        });
        const monthlyFee = parseCurrency(document.getElementById('monthly_fee_display').textContent);
        if (currentTotalPaid >= monthlyFee) {
          alert('Monthly fee already achieved, cannot add more installments.');
          return;
        }
        
        // Create and append a new installment input
        const newInput = createInstallmentInput(currentCount + 1);
        inputsContainer.appendChild(newInput);
        
        // Update the current installment count
        updateInstallmentNumbers();
        
        // Focus on the new input
        const input = newInput.querySelector('input');
        input.focus();
      });
    }
    
    // Modal control buttons
    document.getElementById('close-payment-btn').addEventListener('click', closePaymentModal);
    document.getElementById('save-payment-btn').addEventListener('click', updatePayment);
    window.addEventListener('click', e => {
      if (e.target === document.getElementById('paymentModal')) closePaymentModal();
    });
    
    // Apply initial toggle styling
    const toggle = document.getElementById('installment-toggle');
    const toggleDot = document.querySelector('.toggle-dot');
    if (toggle && toggleDot) {
      if (toggle.checked) {
        toggleDot.classList.add('transform', 'translate-x-4');
      }
    }
  });

  // expose for inline use if needed
  window.openPaymentModal = openPaymentModal;
  window.closePaymentModal = closePaymentModal;
  window.updatePayment = updatePayment;
})();
