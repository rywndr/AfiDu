(() => {
  const forms = document.querySelectorAll('form[method="post"]');

  forms.forEach((form) => {
    form.addEventListener('submit', () => {
      const submitButton = form.querySelector('button[type="submit"]');

      if (!(submitButton instanceof HTMLButtonElement)) {
        return;
      }

      submitButton.disabled = true;
      submitButton.setAttribute('aria-busy', 'true');
      submitButton.classList.add('opacity-75');
      submitButton.textContent = 'Loading...';
    });
  });
})();
