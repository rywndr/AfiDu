(function() {
    // --- Dropdown Toggle Functionality ---
    document.querySelectorAll('.dropdown-button').forEach(button => {
      button.addEventListener('click', function(e) {
        e.stopPropagation();
        // Close all dropdowns except the one related to this button.
        document.querySelectorAll('.dropdown-content').forEach(drop => {
          if (drop !== this.parentElement.querySelector('.dropdown-content')) {
            drop.classList.add('hidden');
          }
        });
        // Toggle dropdown for the clicked button.
        const dropdown = this.parentElement.querySelector('.dropdown-content');
        if (dropdown) {
          dropdown.classList.toggle('hidden');
        }
      });
    });
    
    // Close all dropdowns when clicking outside.
    window.addEventListener('click', function() {
      document.querySelectorAll('.dropdown-content').forEach(drop => {
        drop.classList.add('hidden');
      });
    });
})();