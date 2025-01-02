document.addEventListener('DOMContentLoaded', function () {
    const calculatorScreen = document.getElementById('calculator-screen');
    const keys = document.querySelector('.calculator-keys');

    let currentInput = '0';
    let previousInput = '';
    let operator = '';

    keys.addEventListener('click', function (event) {
        const { target } = event;
        const { value } = target;

        if (!target.matches('button')) return;

        switch (value) {
            case '+':
            case '-':
            case '*':
            case '/':
                handleOperator(value);
                break;
            case '=':
                calculate();
                break;
            case 'all-clear':
                clear();
                break;
            case '.':
                inputDecimal();
                break;
            default:
                inputNumber(value);
        }

        updateScreen();
    });

    function handleOperator(nextOperator) {
        const inputValue = parseFloat(currentInput);

        if (operator && previousInput) {
            calculate();
        } else {
            previousInput = inputValue;
        }

        operator = nextOperator;
        currentInput = '0';
    }

    function calculate() {
        const inputValue = parseFloat(currentInput);
        let result = 0;

        if (operator === '+') {
            result = previousInput + inputValue;
        } else if (operator === '-') {
            result = previousInput - inputValue;
        } else if (operator === '*') {
            result = previousInput * inputValue;
        } else if (operator === '/') {
            result = previousInput / inputValue;
        }

        currentInput = String(result);
        operator = '';
        previousInput = '';
    }

    function inputNumber(number) {
        if (currentInput === '0') {
            currentInput = number;
        } else {
            currentInput += number;
        }
    }

    function inputDecimal() {
        if (!currentInput.includes('.')) {
            currentInput += '.';
        }
    }

    function clear() {
        currentInput = '0';
        previousInput = '';
        operator = '';
    }

    function updateScreen() {
        calculatorScreen.value = currentInput;
    }
});