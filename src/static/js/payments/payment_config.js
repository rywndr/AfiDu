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
      year:     get(ds.year)
    };
    const yearSelector = get('year-selector');
    const form = fields.fee.closest('form');

    function styleMonth(from, to, cls) {
      for (let i = from; i <= to; i++) {
        if (i < 1 || i > 12) continue;
        get(`month-${i}`).className = cls;
      }
    }

    function updateSchedulePreview() {
      styleMonth(1, 12, 'text-center p-2 rounded-md text-xs bg-gray-200 text-gray-600');
      styleMonth(+fields.midStart.value, +fields.midEnd.value, 'text-center p-2 rounded-md text-xs bg-blue-100 text-blue-800 font-medium');
      styleMonth(+fields.finStart.value, +fields.finEnd.value, 'text-center p-2 rounded-md text-xs bg-green-100 text-green-800 font-medium');
    }

    function formatFee() {
      let v = fields.fee.value.replace(/\.00$/, '');
      const digits = v.replace(/\D/g, '');
      fields.fee.value = digits ? Number(digits).toLocaleString('id-ID') : '';
    }

    form.addEventListener('submit', () => {
      const raw = fields.fee.value.replace(/\./g, '');
      fields.fee.value = raw ? raw + '.00' : '';
    });

    yearSelector.addEventListener('change', () => {
      fields.year.value = yearSelector.value;
      window.location.href = ds.configUrl + '?config_year=' + yearSelector.value;
    });

    [fields.midStart, fields.midEnd, fields.finStart, fields.finEnd].forEach(el =>
      el.addEventListener('change', updateSchedulePreview)
    );
    fields.fee.addEventListener('input', formatFee);

    fields.year.value = yearSelector.value;
    if (fields.fee.value) formatFee();
    updateSchedulePreview();
  });
})();
