(function() {
    function showToast(message, type = 'success', duration = 3000) {
      let container = document.getElementById('notification-container');
  
      if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'fixed inset-20 flex items-start justify-center z-50 pointer-events-none';
        document.body.appendChild(container);
      }
  
      let bgClass = 'bg-green-500';
  
      const toast = document.createElement('div');
      toast.className = `mt-8 pointer-events-auto border border-gray-200 rounded-lg shadow-lg px-3 py-4 flex items-center space-x-2 transition-opacity duration-300 ${bgClass}`;
  
      let iconSvg = '';
      if (type === 'error' || type === 'warning') {
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8 4a1 1 0 100-2 1 1 0 000 2zm.25-8a.75.75 0 00-1.5 0v5a.75.75 0 001.5 0V6z" clip-rule="evenodd" />
        </svg>`;
      } else {
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clip-rule="evenodd" />
        </svg>`;
      }
  
      const closeButtonHTML = `<button class="ml-auto text-white hover:text-gray-300 focus:outline-none" onclick="this.parentElement.remove()">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>`;
  
      toast.innerHTML = `${iconSvg}<span class="text-white text-sm">${message}</span>${closeButtonHTML}`;
  
      container.appendChild(toast);
  
      setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => {
          toast.remove();
          if (container.childElementCount === 0) {
            container.remove(); // remove container if empty
          }
        }, 300);
      }, duration);
    }
  
    const exportBtn = document.getElementById('export-report-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', function() {
        showToast('The report is being generated...');
      });
    }

    const exportAllBtn = document.getElementById('export-all-btn');
    if (exportAllBtn) {
      exportAllBtn.addEventListener('click', function(event) {
        event.preventDefault();
        showToast('The reports are being generated...');
        setTimeout(() => {
          window.location.href = this.href;
        }, 500);
      });
      }
  })();