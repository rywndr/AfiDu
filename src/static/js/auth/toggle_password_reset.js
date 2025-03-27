(function() {
  const toggleNewPassword = document.getElementById('toggleNewPassword');
  const newPasswordInput = document.getElementById('new_password1');

  if (toggleNewPassword && newPasswordInput) {
    toggleNewPassword.addEventListener('click', () => {
      const type = newPasswordInput.type === 'password' ? 'text' : 'password';
      newPasswordInput.type = type;
      toggleNewPassword.textContent = type === 'password' ? 'Show' : 'Hide';
    });
  }

  const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
  const confirmPasswordInput = document.getElementById('new_password2');

  if (toggleConfirmPassword && confirmPasswordInput) {
    toggleConfirmPassword.addEventListener('click', () => {
      const type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
      confirmPasswordInput.type = type;
      toggleConfirmPassword.textContent = type === 'password' ? 'Show' : 'Hide';
    });
  }
})();