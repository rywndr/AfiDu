document.addEventListener("DOMContentLoaded", function() {
  const userMenu = document.getElementById('user-menu');
  const dropdownMenu = document.getElementById('dropdown-menu');
  const chevronIcon = document.getElementById('chevron-icon');
  const dropdownContainer = document.getElementById('user-dropdown-container');
  
  if (userMenu && dropdownMenu) {
    // rrack dropdown state
    let isDropdownOpen = false;
    
    function toggleProfileDropdown() {
      isDropdownOpen = !isDropdownOpen;
      
      if (!isDropdownOpen) {
        // close dropdown with tailwind animation
        dropdownMenu.classList.add('opacity-0', 'translate-y-[-10px]');
        dropdownMenu.classList.remove('opacity-100', 'translate-y-0');
        
        setTimeout(() => {
          dropdownMenu.classList.add('hidden');
          if (chevronIcon) chevronIcon.classList.remove('rotate-180');
        }, 100);
      } else {
        dropdownMenu.classList.remove('hidden');
        
        // trigger a reflow before adding the opacity/transform classes
        void dropdownMenu.offsetWidth;
        
        dropdownMenu.classList.add('opacity-100', 'translate-y-0', 'transition-all', 'duration-200');
        dropdownMenu.classList.remove('opacity-0', 'translate-y-[-10px]');
        
        if (chevronIcon) chevronIcon.classList.add('rotate-180');
      }
    }

    // toggle dropdown on user menu click
    userMenu.addEventListener('click', function(e) {
      e.stopPropagation(); // prevent click from bubbling to document
      e.preventDefault(); // prevent any default behavior
      toggleProfileDropdown();
    });

    // hide dropdown when clicking outside
    document.addEventListener('click', function(e) {
      // only close if dropdown is open and click is outside the container
      if (isDropdownOpen && !dropdownContainer.contains(e.target)) {
        toggleProfileDropdown();
      }
    });
  }
});