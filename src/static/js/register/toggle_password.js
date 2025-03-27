(function() {
  function togglePassword(btn) {
    const container = btn.parentElement;
    const input = container.querySelector('input');
    if (input) {
      if (input.type === "password") {
        input.type = "text";
        btn.textContent = "Hide";
      } else {
        input.type = "password";
        btn.textContent = "Show";
      }
    }
  }

  const toggleBtn1 = document.getElementById('togglePassword1');
  const toggleBtn2 = document.getElementById('togglePassword2');
  
  if (toggleBtn1) {
    toggleBtn1.addEventListener('click', function() {
      togglePassword(toggleBtn1);
    });
  }
  
  if (toggleBtn2) {
    toggleBtn2.addEventListener('click', function() {
      togglePassword(toggleBtn2);
    });
  }
})();
