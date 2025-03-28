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

  // dissmiss button event listener
  const dismissButton = document.getElementById('dismiss-btn');
  if(dismissButton){
    dismissButton.addEventListener('click', dismissNotification);
  }
  
  setTimeout(() => {
    dismissNotification();
  }, 3000);
})();
