(function() {
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
  
    if (togglePassword && passwordInput) {
      togglePassword.addEventListener('click', function () {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.textContent = type === 'password' ? 'Show' : 'Hide';
      });
    }
  })();