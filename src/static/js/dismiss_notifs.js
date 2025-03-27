(function() {
    function dismissNotification(){
      const container = document.getElementById('notification-container');
      if(container){
        container.firstElementChild.classList.add('opacity-0');
        setTimeout(() => {
          container.remove();
        }, 300);
      }
    }
    
    setTimeout(() => {
      dismissNotification();
    }, 3000);
  })();
  