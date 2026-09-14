(() => {
  const forms = document.querySelectorAll(
    'form[method="post"], form[data-loading-form]'
  );

  const setLoadingState = (form, button) => {
    form.setAttribute('aria-busy', 'true');

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.classList.add('opacity-75');
    button.textContent = 'Loading...';
  };

  forms.forEach((form) => {
    form.addEventListener('submit', (event) => {
      const submitButton =
        event.submitter instanceof HTMLButtonElement
          ? event.submitter
          : form.querySelector('button[type="submit"]');

      setLoadingState(form, submitButton);
    });

    form
      .querySelectorAll(
        'button[type="button"][id="clear-filters"], button[title="Clear search"]'
      )
      .forEach((button) => {
        button.addEventListener(
          'click',
          () => setLoadingState(form, button),
          { capture: true }
        );
      });
  });
})();
