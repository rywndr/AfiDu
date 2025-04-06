(function() {
  function safeEvaluate(formula, scope) {
    const allowedChars = /^[0-9+\-*/()._ a-zA-Z]+$/;
    if (!allowedChars.test(formula)) {
      throw new Error("Formula contains invalid characters.");
    }
    
    // get  variable names and the values from the scope
    const keys = Object.keys(scope);
    const values = keys.map(key => scope[key]);

    const evaluator = new Function(...keys, `return ${formula};`);
    return evaluator(...values);
  }

  function calcSumAndFinal(prefix) {
    const configElem = document.getElementById('score-config');
    const scoreFormula = configElem ? configElem.dataset.formula : "(ex_sum + mid_term + finals) / (num_exercises + 2)";
    const row = document.querySelector(`[data-prefix="${prefix}"]`);
    if (!row) return;

    let ex_sum = 0;
    const exerciseInputs = row.querySelectorAll(`input[id*="-exercise_"]`);
    exerciseInputs.forEach(function(input) {
      const value = parseFloat(input.value);
      if (!isNaN(value)) {
        ex_sum += value;
      }
    });

    const midTermInput = row.querySelector(`input[id*="-mid_term"]`);
    const finalsInput  = row.querySelector(`input[id*="-finals"]`);
    const mid_term = midTermInput ? parseFloat(midTermInput.value) || 0 : 0;
    const finals = finalsInput ? parseFloat(finalsInput.value) || 0 : 0;

    const sumElem = document.getElementById(prefix + '_score_sum');
    const scoreSum = ex_sum + mid_term + finals;
    if (sumElem) {
      sumElem.textContent = scoreSum.toFixed(2);
    }

    const num_exercises = exerciseInputs.length;
    const scope = {
      ex_sum: ex_sum,
      mid_term: mid_term,
      finals: finals,
      num_exercises: num_exercises
    };

    let finalScore = 0;
    try {
      finalScore = safeEvaluate(scoreFormula, scope);
    } catch (error) {
      console.error("Error evaluating formula:", error);
      // default calc fallback
      finalScore = scoreSum / (num_exercises + 2);
    }

    const finalElem = document.getElementById(prefix + '_final_score');
    if (finalElem) {
      finalElem.textContent = finalScore.toFixed(2);
    }
  }

  window.onload = function() {
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

