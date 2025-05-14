document.addEventListener("DOMContentLoaded", function() {
  // init vars
  const filterBtn = document.getElementById('filter-button');
  const filterDropdown = document.getElementById('filter-dropdown');
  const clearFiltersBtn = document.getElementById('clear-filters');
  const dropdownButtons = document.querySelectorAll(".dropdown-button");
  const form = document.getElementById('search-filter-form');
  
  // toggle std dropdowns
  dropdownButtons.forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const content = btn.nextElementSibling;
      hideAllDropdowns(content);
      content.classList.toggle("hidden");
    });
  });
  
  // toggle filter dropdown
  if (filterBtn && filterDropdown) {
    filterBtn.addEventListener("click", e => {
      e.stopPropagation();
      filterDropdown.style.display = 
        filterDropdown.style.display === "none" ? "block" : "none";
    });
  }
  
  // clear all filters
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => {
      const selects = form.querySelectorAll('select');
      selects.forEach(select => select.value = '');
      form.querySelector('input[name="q"]').value = '';
      
      // save scroll pos before submit
      localStorage.setItem('studentListScrollPos', window.scrollY.toString());
      form.submit();
    });
  }

  // hide dropdowns on click outside
  document.addEventListener("click", e => {
    // skip if clicking filter components
    if (e.target.closest('#filter-dropdown') || e.target.closest('#filter-button')) {
      return;
    }
    
    // hide std dropdowns
    hideAllDropdowns();
    
    // hide filter dropdown
    if (filterDropdown) {
      filterDropdown.style.display = "none";
    }
    
    // restore scroll pos after filter applied
    if (localStorage.getItem('studentListScrollPos')) {
      window.scrollTo(0, parseInt(localStorage.getItem('studentListScrollPos')));
      localStorage.removeItem('studentListScrollPos');
    }
  });
  
  // util func to hide all dropdowns except one
  function hideAllDropdowns(except = null) {
    document.querySelectorAll(".dropdown-content").forEach(dropdown => {
      if (dropdown !== except) {
        dropdown.classList.add("hidden");
      }
    });
  }
});