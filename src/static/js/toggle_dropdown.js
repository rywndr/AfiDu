document.addEventListener("DOMContentLoaded", () => {
  // cache dom el to avoid repeated queries
  const elements = {
    dropdownButtons: document.querySelectorAll(".dropdown-button"),
    filterButton: document.getElementById("filter-button"),
    filterDropdown: document.getElementById("filter-dropdown"),
    searchForm: document.getElementById("search-filter-form"),
    searchInput: document.querySelector('input[name="q"]'),
    applyFiltersBtn: document.getElementById("apply-filters"),
    clearFiltersBtn: document.getElementById("clear-filters")
  };

  // init components
  initStandardDropdowns(elements.dropdownButtons);
  initFilterDropdown(elements.filterButton, elements.filterDropdown);
  initSearchFunctionality(elements.searchForm, elements.searchInput);
  initFilterActions(elements.applyFiltersBtn, elements.clearFiltersBtn);
  initOutsideClickHandler();
  restoreScrollPosition();
});

// handle standard dropdowns
const initStandardDropdowns = (buttons) => {
  if (!buttons?.length) return;
  
  buttons.forEach(button => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const content = button.nextElementSibling;
      
      // close other dropdowns
      closeOtherDropdowns(content);
      
      // toggle current dropdown
      content.classList.toggle("hidden");
    });
  });
};

// close dropdowns that aren't the current one
const closeOtherDropdowns = (currentDropdown) => {
  document.querySelectorAll(".dropdown-content").forEach(dropdown => {
    if (dropdown !== currentDropdown) {
      dropdown.classList.add("hidden");
    }
  });
};

// handle filter dropdown specifically
const initFilterDropdown = (button, dropdown) => {
  if (!button || !dropdown) return;
  
  // check url params for filter state
  checkKeepFilterOpen(dropdown);
  
  // toggle filter dropdown
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleElementDisplay(dropdown);
  });
};

// helper to toggle display property
const toggleElementDisplay = (element) => {
  if (!element) return;
  
  const currentDisplay = element.style.display;
  element.style.display = (currentDisplay === "none" || currentDisplay === "") ? "block" : "none";
};

// check if filter dropdown should kept open
const checkKeepFilterOpen = (dropdown) => {
  if (!dropdown) return;
  
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('keep_filter_open') === 'true') {
    dropdown.style.display = "block";
    
    // remove param from url without reloading
    const newUrl = window.location.pathname + 
                  window.location.search.replace(/&?keep_filter_open=true/, '');
    window.history.replaceState({}, document.title, newUrl);
  }
};

// initi apply and clear filter actions
const initFilterActions = (applyBtn, clearBtn) => {
  initApplyFilters(applyBtn);
  initClearFilters(clearBtn);
};

// apply filters functionality
const initApplyFilters = (button) => {
  if (!button) return;
  
  button.addEventListener("click", (event) => {
    event.preventDefault();
    
    const form = document.getElementById("search-filter-form");
    if (!form) return;
    
    addKeepFilterOpenParam(form);
    saveScrollPosition();
    form.submit();
  });
};

// clear filters functionality
const initClearFilters = (button) => {
  if (!button) return;
  
  button.addEventListener("click", () => {
    const form = document.getElementById("search-filter-form");
    if (!form) return;
    
    resetFormFilters(form);
    addKeepFilterOpenParam(form);
    saveScrollPosition();
    form.submit();
  });
};

// helper to reset form filters
const resetFormFilters = (form) => {
  // reset select elements
  const selectFields = ['class_filter', 'level_filter', 'sort_by', 'category_filter'];
  selectFields.forEach(field => {
    const element = form.querySelector(`select[name="${field}"]`);
    if (element) element.value = "";
  });
};

// helper to add keep_filter_open param
const addKeepFilterOpenParam = (form) => {
  let keepOpenInput = form.querySelector('input[name="keep_filter_open"]');
  
  if (!keepOpenInput) {
    keepOpenInput = document.createElement('input');
    keepOpenInput.type = 'hidden';
    keepOpenInput.name = 'keep_filter_open';
    form.appendChild(keepOpenInput);
  }
  
  keepOpenInput.value = 'true';
};

// handle search functionality
const initSearchFunctionality = (form, input) => {
  if (!form || !input) return;
  
  input.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitSearchOnly();
    }
  });
};

// submit just the search parameters
const submitSearchOnly = () => {
  saveScrollPosition();
  
  // create search-only form
  const tempForm = document.createElement('form');
  tempForm.method = 'get';
  tempForm.action = window.location.pathname;
  
  // add search query
  appendFormInput(tempForm, 'q', document.querySelector('input[name="q"]')?.value || '');
  
  // add per_page param
  appendFormInput(tempForm, 'per_page', document.querySelector('input[name="per_page"]')?.value || '5');
  
  // add year param if present
  const yearValue = document.querySelector('input[name="year"]')?.value;
  if (yearValue) {
    appendFormInput(tempForm, 'year', yearValue);
  }
  
  // submit form
  document.body.appendChild(tempForm);
  tempForm.submit();
};

// helper to append an input to a form
const appendFormInput = (form, name, value) => {
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = name;
  input.value = value;
  form.appendChild(input);
};

// handle closing dropdowns when clicking outside
const initOutsideClickHandler = () => {
  document.addEventListener("click", (event) => {
    // skip if click was inside filter components
    if (event.target.closest('#filter-dropdown') || event.target.closest('#filter-button')) {
      return;
    }
    
    // close standard dropdowns
    document.querySelectorAll(".dropdown-content").forEach(dropdown => {
      if (!dropdown.contains(event.target) && !event.target.classList.contains('dropdown-button')) {
        dropdown.classList.add("hidden");
      }
    });
    
    // close filter dropdown
    const filterDropdown = document.getElementById("filter-dropdown");
    if (filterDropdown) {
      filterDropdown.style.display = "none";
    }
  });
};

// helpers for scroll position
const saveScrollPosition = () => {
  localStorage.setItem('studentListScrollPos', window.scrollY);
};

const restoreScrollPosition = () => {
  const savedPosition = localStorage.getItem('studentListScrollPos');
  if (savedPosition) {
    window.scrollTo(0, parseInt(savedPosition));
    localStorage.removeItem('studentListScrollPos');
  }
};