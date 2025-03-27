(function() {
    let updating = false;
    let ageField = document.getElementById("id_age");
    let dobField = document.getElementById("id_date_of_birth");

    if (ageField && dobField) {
      // kalo age ditentukan, sesuaikan tahun di tanggal lahir dengan age yang ditentukan
      ageField.addEventListener("change", function() {
        if (updating) return;
        updating = true;
        var age = parseInt(this.value);
        if (!isNaN(age)) {
          var currentYear = new Date().getFullYear();
          var computedYear = currentYear - age;
          var currentDob = dobField.value;
          if (!currentDob) {
            // jika tanggal tidak ditentukan default ke January 1 dari tahun yang dihitung
            dobField.value = computedYear + "-01-01";
          } else {
            // kalo tanggal ditentukan, update tahunnya aja, sisa bulan dan tanggal tetap
            var parts = currentDob.split("-");
            if (parts.length === 3) {
              dobField.value = computedYear + "-" + parts[1] + "-" + parts[2];
            } else {
              dobField.value = computedYear + "-01-01";
            }
          }
        }
        updating = false;
      });

      // kalo tanggal lahir diubah, sesuaikan age
      dobField.addEventListener("change", function() {
        if (updating) return;
        updating = true;
        var dob = new Date(this.value);
        if (!isNaN(dob.getTime())) {
          var today = new Date();
          var age = today.getFullYear() - dob.getFullYear();
          var m = today.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            age--;
          }
          ageField.value = age;
        }
        updating = false;
      });
    }
})();