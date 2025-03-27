(function() {
    function calcSumAndFinal(prefix) {
      const row = document.querySelector(`[data-prefix="${prefix}"]`);
      if (!row) return;
  
      let sum = 0;
      // get all dynamic E inputs ("exercise_1", "exercise_2", etc.)
      const exerciseInputs = row.querySelectorAll(`input[id*="-exercise_"]`);
      exerciseInputs.forEach(function(input) {
        const value = parseFloat(input.value);
        if (!isNaN(value)) {
          sum += value;
        }
      });
  
      const midTermInput = row.querySelector(`input[id*="-mid_term"]`);
      const finalsInput  = row.querySelector(`input[id*="-finals"]`);
      const mid_term = midTermInput ? parseFloat(midTermInput.value) || 0 : 0;
      const finals = finalsInput ? parseFloat(finalsInput.value) || 0 : 0;
  
      sum += mid_term + finals;
  
      const sumElem = document.getElementById(prefix + '_score_sum');
      const finalElem = document.getElementById(prefix + '_final_score');
      if (sumElem && finalElem) {
        sumElem.textContent = sum.toFixed(2);
        // for live calc, assume final score is the total divided by (number of exercises + 2).
        const numExercise = exerciseInputs.length;
        const finalScore = sum / (numExercise + 2);
        finalElem.textContent = finalScore.toFixed(2);
      }
    }
  
    window.onload = function() {
      // recalc on change
      document.querySelectorAll('.score-row').forEach(function(row) {
        const prefix = row.dataset.prefix;
        row.querySelectorAll('input').forEach(function(input) {
          input.addEventListener('input', function() {
            calcSumAndFinal(prefix);
          });
        });

        calcSumAndFinal(prefix);
      });
    };
  })();  