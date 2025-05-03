// func to handle dropdowns
document.addEventListener("DOMContentLoaded", function() {
  // standard dropdowns
  const dropdownButtons = document.querySelectorAll(".dropdown-button");
  
  dropdownButtons.forEach(button => {
    button.addEventListener("click", function(event) {
      event.stopPropagation();
      const content = this.nextElementSibling;
      
      document.querySelectorAll(".dropdown-content").forEach(dropdown => {
        if (dropdown !== content) {
          dropdown.classList.add("hidden");
        }
      });
      
      // toggle current dropdown
      content.classList.toggle("hidden");
    });
  });

  // profile dropdown functionality
  const userMenu = document.getElementById('user-menu');
  const dropdownMenu = document.getElementById('dropdown-menu');
  const chevronIcon = document.getElementById('chevron-icon');
  const dropdownContainer = document.getElementById('user-dropdown-container');
  
  if (userMenu && dropdownMenu) {
    function toggleProfileDropdown() {
      const isOpen = !dropdownMenu.classList.contains('hidden');
      
      // toggle dropdown visibility with tailwind classes
      if (isOpen) {
        // close dropdown with tailwind animation
        dropdownMenu.classList.add('opacity-0', 'translate-y-[-10px]', 'duration-200');
        dropdownMenu.classList.remove('opacity-100', 'translate-y-0');
        
        setTimeout(() => {
          dropdownMenu.classList.add('hidden');
          if (chevronIcon) chevronIcon.classList.remove('rotate-180');
        }, 100);
      } else {
        // open dropdown with tailwind animation
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
      if (dropdownContainer && !dropdownMenu.classList.contains('hidden') && 
          !dropdownContainer.contains(e.target)) {
        toggleProfileDropdown();
      }
    });
  }
  
  // filter dropdown functionality
  const filterButton = document.getElementById("filter-button");
  const filterDropdown = document.getElementById("filter-dropdown");
  
  if (filterButton && filterDropdown) {
    // keep dropdown open if just submitted the form
    const form = document.getElementById("search-filter-form");
    
    // access form elements with null checks
    const classFilterElement = form?.querySelector('select[name="class_filter"]');
    const levelFilterElement = form?.querySelector('select[name="level_filter"]');
    const sortByElement = form?.querySelector('select[name="sort_by"]');
    
    const classFilter = classFilterElement?.value || "";
    const levelFilter = levelFilterElement?.value || "";
    const sortBy = sortByElement?.value || "";
    
    // check if the user have just applied filters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('keep_filter_open') === 'true') {
      filterDropdown.style.display = "block";
      // remove param from URL without reloading
      const newUrl = window.location.pathname + window.location.search.replace(/&?keep_filter_open=true/, '');
      window.history.replaceState({}, document.title, newUrl);
    }
    
    // toggle filter dropdown
    filterButton.addEventListener("click", function(event) {
      event.stopPropagation();
      // toggle display instead of toggling hidden class
      if (filterDropdown.style.display === "none" || filterDropdown.style.display === "") {
        filterDropdown.style.display = "block";
      } else {
        filterDropdown.style.display = "none";
      }
    });

    const applyFiltersBtn = document.getElementById("apply-filters");
    if (applyFiltersBtn) {
      applyFiltersBtn.addEventListener("click", function(event) {
        event.preventDefault();
        
        const form = document.getElementById("search-filter-form");
        if (!form) return;
        
        let keepOpenInput = form.querySelector('input[name="keep_filter_open"]');
        if (!keepOpenInput) {
          keepOpenInput = document.createElement('input');
          keepOpenInput.type = 'hidden';
          keepOpenInput.name = 'keep_filter_open';
          form.appendChild(keepOpenInput);
        }
        keepOpenInput.value = 'true';
        
        // save current scroll position
        localStorage.setItem('studentListScrollPos', window.scrollY);
        
        form.submit();
      });
    }

    // clear filters btn
    const clearFiltersBtn = document.getElementById("clear-filters");
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener("click", function() {
        const form = document.getElementById("search-filter-form");
        if (!form) return;
        
        // reset filters to empty values with null checks
        if (form.querySelector('select[name="class_filter"]')) {
          form.querySelector('select[name="class_filter"]').value = "";
        }
        
        if (form.querySelector('select[name="level_filter"]')) {
          form.querySelector('select[name="level_filter"]').value = "";
        }
        
        if (form.querySelector('select[name="sort_by"]')) {
          form.querySelector('select[name="sort_by"]').value = "";
        }
        
        // handle category filter for study materials
        if (form.querySelector('select[name="category_filter"]')) {
          form.querySelector('select[name="category_filter"]').value = "";
        }
        
        // keep dropdown open after clearing
        let keepOpenInput = form.querySelector('input[name="keep_filter_open"]');
        if (!keepOpenInput) {
          keepOpenInput = document.createElement('input');
          keepOpenInput.type = 'hidden';
          keepOpenInput.name = 'keep_filter_open';
          form.appendChild(keepOpenInput);
        }
        keepOpenInput.value = 'true';
        
        // save current scroll position
        localStorage.setItem('studentListScrollPos', window.scrollY);
        
        form.submit();
      });
    }
  }
  
  // hide dropdowns when clicking elsewhere
  document.addEventListener("click", function(event) {
    if (event.target.closest('#filter-dropdown') || event.target.closest('#filter-button')) {
      return;
    }
    
    // hide other dropdowns
    document.querySelectorAll(".dropdown-content").forEach(dropdown => {
      if (!dropdown.contains(event.target) && !event.target.classList.contains('dropdown-button')) {
        dropdown.classList.add("hidden");
      }
    });
    
    // hide filter dropdown
    const filterDropdown = document.getElementById("filter-dropdown");
    if (filterDropdown) {
      filterDropdown.style.display = "none";
    }
  });
  
  // restore scroll position after filter is applied
  if (localStorage.getItem('studentListScrollPos')) {
    window.scrollTo(0, parseInt(localStorage.getItem('studentListScrollPos')));
    localStorage.removeItem('studentListScrollPos');
  }
});