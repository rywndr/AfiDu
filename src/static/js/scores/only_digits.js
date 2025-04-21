// IYKYK

(function() {
  document.addEventListener('DOMContentLoaded', function() {
    // Select all number inputs within the score table
    const scoreInputs = document.querySelectorAll('#score-table input[type="number"]');
    
    // For each score input field
    scoreInputs.forEach(input => {
      // Set min attribute to 0 to prevent negative numbers (extra protection)
      input.setAttribute('min', '0');
      
      // Add event listeners for different input methods
      input.addEventListener('keydown', function(e) {
        // Allow: backspace, delete, tab, escape, enter, decimal point
        if ([46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !== -1 ||
            // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
            (e.keyCode === 65 && e.ctrlKey === true) ||
            (e.keyCode === 67 && e.ctrlKey === true) ||
            (e.keyCode === 86 && e.ctrlKey === true) ||
            (e.keyCode === 88 && e.ctrlKey === true) ||
            // Allow: home, end, left, right
            (e.keyCode >= 35 && e.keyCode <= 39) ||
            // Allow decimal point (.)
            (e.keyCode === 190)) {
          // Let it happen, don't do anything
          return;
        }
        
        // Ensure that it's a number and stop the keypress if not
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && 
            (e.keyCode < 96 || e.keyCode > 105)) {
          e.preventDefault();
        }
      });
      
      // Input event to handle paste and direct input
      input.addEventListener('input', function(e) {
        // Remove anything that's not a digit or decimal point
        let value = this.value.replace(/[^0-9.]/g, '');
        
        // Ensure only one decimal point
        const decimalPoints = value.match(/\./g);
        if (decimalPoints && decimalPoints.length > 1) {
          value = value.replace(/\.(?=.*\.)/g, '');
        }
        
        // Check for values greater than 100
        if (parseFloat(value) > 100) {
          value = '100';
        }
        
        // If value is negative, make it zero
        if (parseFloat(value) < 0) {
          value = '0';
        }
        
        // Update the input value
        this.value = value;
        
        // Trigger score calculation if implemented
        if (typeof calculateScores === 'function') {
          calculateScores();
        }
      });
      
      // Handle blur event to ensure proper formatting
      input.addEventListener('blur', function() {
        // If empty, set to 0
        if (this.value === '' || isNaN(parseFloat(this.value))) {
          this.value = '0.00';
        } else {
          // Format to 2 decimal places
          this.value = parseFloat(this.value).toFixed(2);
        }
      });
    });
  });
})();
