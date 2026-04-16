/* ============================================
   CALCULATOR.JS — Monthly Fee Calculator
   7% of monthly contribution, $15 minimum
   ============================================ */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('contribution-input');
    var resultAmount = document.getElementById('calc-result-amount');
    var resultLabel = document.getElementById('calc-result-label');

    if (!input || !resultAmount) return;

    function calculate() {
      var value = parseFloat(input.value);

      if (isNaN(value) || value <= 0) {
        resultAmount.textContent = '$15.00';
        resultLabel.textContent = 'per month (minimum)';
        return;
      }

      var fee = value * 0.07;
      if (fee < 15) {
        fee = 15;
      }

      resultAmount.textContent = '$' + fee.toFixed(2);

      if (value * 0.07 < 15) {
        resultLabel.textContent = 'per month (minimum fee)';
      } else {
        resultLabel.textContent = 'per month (7% of $' + value.toFixed(0) + ')';
      }
    }

    input.addEventListener('input', calculate);
    input.addEventListener('change', calculate);

    // Initialize
    calculate();
  });
})();
