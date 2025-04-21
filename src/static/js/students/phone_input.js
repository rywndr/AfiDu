(function() {
  document.addEventListener('DOMContentLoaded', function() {
    // get phone input field
    const phoneInputField = document.querySelector('.phone-input-field');
    
    if (phoneInputField) {
      if (phoneInputField.value) {
        // remove +62 if it exists
        if (phoneInputField.value.startsWith('+62')) {
          phoneInputField.value = phoneInputField.value.substring(3);
        }
      }
      
      phoneInputField.addEventListener('focus', function() {
        // get rid any non-digit characters when focusing
        this.value = this.value.replace(/\D/g, '');
        
        // get rid of leading zeros if(e.g., convert "0812" to "812")
        if (this.value.startsWith('0')) {
          this.value = this.value.substring(1);
        }
      });
      
      phoneInputField.addEventListener('blur', function() {
        this.value = this.value.replace(/\D/g, '');
        
        if (this.value.startsWith('0')) {
          this.value = this.value.substring(1);
        }
      });
      
      phoneInputField.addEventListener('input', function(e) {
        this.value = this.value.replace(/\D/g, '');
        
        if (this.value.startsWith('0')) {
          this.value = this.value.substring(1);
        }
      });
      
      const form = document.getElementById('student-form');
      if (form) {
        form.addEventListener('submit', function(e) {
          // perepend +62 to phone number before submitting
          const phoneValue = phoneInputField.value;
          
          // prepend only if it doesn't already have +62
          if (phoneValue && !phoneValue.startsWith('+62')) {
            phoneInputField.value = '+62' + phoneValue;
          }
        });
      }
    }
  });
})();
