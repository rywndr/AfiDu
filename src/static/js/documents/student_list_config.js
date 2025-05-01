document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('student-list-form');
    const columnCheckboxes = document.querySelectorAll('.column-checkbox');
    const columnError = document.getElementById('column-error');
    
    // func to check if at least one column is selected
    function isAnyColumnSelected() {
      for (const checkbox of columnCheckboxes) {
        if (checkbox.checked) {
          return true;
        }
      }
      return false;
    }
    
    // form validation on submit
    form.addEventListener('submit', function(e) {
      // validate at least one column is selected
      if (!isAnyColumnSelected()) {
        e.preventDefault();
        columnError.classList.remove('hidden');
        
        // highlight column container
        document.getElementById('columns-container').classList.add('border', 'border-red-500', 'rounded-md', 'p-2');
        
        // scroll to error
        columnError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
      }
      
      // form is valid, allow submission
      return true;
    });
    
    // hide error message when a checkbox is clicked
    columnCheckboxes.forEach(function(checkbox) {
      checkbox.addEventListener('change', function() {
        if (isAnyColumnSelected()) {
          columnError.classList.add('hidden');
          document.getElementById('columns-container').classList.remove('border', 'border-red-500', 'rounded-md', 'p-2');
        } else {
          columnError.classList.remove('hidden');
          document.getElementById('columns-container').classList.add('border', 'border-red-500', 'rounded-md', 'p-2');
        }
      });
    });
});