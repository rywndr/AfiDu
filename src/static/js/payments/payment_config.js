(function() {
  document.addEventListener('DOMContentLoaded', () => {
    const get = id => document.getElementById(id);
    const app = get('payment-config-app');
    if (!app) return;

    const ds = app.dataset;
    const fields = {
      midStart: get(ds.midStart),
      midEnd:   get(ds.midEnd),
      finStart: get(ds.finStart),
      finEnd:   get(ds.finEnd),
      fee:      get(ds.fee),
      minPayment: get('id_minimum_payment_amount'),
      year:     get(ds.year)
    };
    const yearSelector = get('year-selector');
    const form = fields.fee.closest('form');

    // func to create error msg 
    function createErrorElement(message) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'text-red-600 text-sm mt-1 overlap-error';
      errorDiv.textContent = message;
      return errorDiv;
    }

    // func to remove error msg
    function removeErrorMessages() {
      document.querySelectorAll('.overlap-error').forEach(el => el.remove());
    }

    function styleMonth(from, to, cls) {
      for (let i = from; i <= to; i++) {
        if (i < 1 || i > 12) continue;
        get(`month-${i}`).className = cls;
      }
    }

    function updateSchedulePreview() {
      // remove error messages
      removeErrorMessages();
      
      // reset all months to default style
      styleMonth(1, 12, 'text-center p-2 rounded-md text-xs bg-gray-200 text-gray-600');
      
      const midStart = parseInt(fields.midStart.value);
      const midEnd = parseInt(fields.midEnd.value);
      const finStart = parseInt(fields.finStart.value);
      const finEnd = parseInt(fields.finEnd.value);
      
      // validate start/end months
      if (midStart > midEnd) {
        const errorMsg = 'Mid semester end month cannot be before start month';
        fields.midEnd.parentNode.appendChild(createErrorElement(errorMsg));
      } else {
        styleMonth(midStart, midEnd, 'text-center p-2 rounded-md text-xs bg-blue-100 text-blue-800 font-medium');
      }
      
      if (finStart > finEnd) {
        const errorMsg = 'Final semester end month cannot be before start month';
        fields.finEnd.parentNode.appendChild(createErrorElement(errorMsg));
      } else {
        styleMonth(finStart, finEnd, 'text-center p-2 rounded-md text-xs bg-green-100 text-green-800 font-medium');
      }
      
      // check semester overlap
      if (!isNaN(midStart) && !isNaN(midEnd) && !isNaN(finStart) && !isNaN(finEnd)) {
        // create arrays for mid and final semester months
        const midSemesterMonths = [];
        for (let i = midStart; i <= midEnd; i++) {
          midSemesterMonths.push(i);
        }
        
        const finSemesterMonths = [];
        for (let i = finStart; i <= finEnd; i++) {
          finSemesterMonths.push(i);
        }
        
        // get overlapping months
        const overlap = midSemesterMonths.filter(month => finSemesterMonths.includes(month));
        
        if (overlap.length > 0) {
          // month names for error msg display
          const monthNames = [
            "January", "February", "March", "April", "May", "June", 
            "July", "August", "September", "October", "November", "December"
          ];
          
          // mark overlap motnh
          overlap.forEach(month => {
            const monthEl = get(`month-${month}`);
            if (monthEl) {
              monthEl.className = 'text-center p-2 rounded-md text-xs bg-red-100 text-red-800 font-bold';
            }
          });
          
          // create rror msg for overlap months
          const overlappingMonthNames = overlap.map(m => monthNames[m-1]).join(', ');
          const errorMsg = `Semesters cannot overlap. Overlapping month(s): ${overlappingMonthNames}`;
          
          // add error msg to both semester end field
          fields.midEnd.parentNode.appendChild(createErrorElement(errorMsg));
          fields.finEnd.parentNode.appendChild(createErrorElement(errorMsg));
        }
      }
    }

    function formatFee() {
      let v = fields.fee.value.replace(/\.00$/, '');
      const digits = v.replace(/\D/g, '');
      fields.fee.value = digits ? Number(digits).toLocaleString('id-ID') : '';
    }

    function formatMinPayment() {
      let v = fields.minPayment.value.replace(/\.00$/, '');
      const digits = v.replace(/\D/g, '');
      fields.minPayment.value = digits ? Number(digits).toLocaleString('id-ID') : '';
    }

    form.addEventListener('submit', (e) => {
      // check if there are any overlap errs
      const errors = document.querySelectorAll('.overlap-error');
      if (errors.length > 0) {
        // prevent form submission if errs
        e.preventDefault();
        // scroll to err
        errors[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
      }
      
      // format fee value for submission
      const raw = fields.fee.value.replace(/\./g, '');
      fields.fee.value = raw ? raw + '.00' : '';
      
      // format minimum payment value for submission
      const rawMinPayment = fields.minPayment.value.replace(/\./g, '');
      fields.minPayment.value = rawMinPayment ? rawMinPayment + '.00' : '';
    });

    yearSelector.addEventListener('change', () => {
      fields.year.value = yearSelector.value;
      window.location.href = ds.configUrl + '?config_year=' + yearSelector.value;
    });

    // add input and change event listeners to all semester fields
    [fields.midStart, fields.midEnd, fields.finStart, fields.finEnd].forEach(el => {
      el.addEventListener('input', updateSchedulePreview);
      el.addEventListener('change', updateSchedulePreview);
    });
    
    fields.fee.addEventListener('input', formatFee);
    fields.minPayment.addEventListener('input', formatMinPayment);

    fields.year.value = yearSelector.value;
    if (fields.fee.value) formatFee();
    if (fields.minPayment.value) formatMinPayment();
    updateSchedulePreview();
  });
})();
