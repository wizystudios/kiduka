import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator as CalcIcon } from 'lucide-react';

export const Calculator = () => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [newNumber, setNewNumber] = useState(true);

  const handleNumber = (num: string) => {
    if (newNumber) {
      setDisplay(num);
      setNewNumber(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const handleDecimal = () => {
    if (newNumber) {
      setDisplay('0.');
      setNewNumber(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleOperation = (op: string) => {
    const currentValue = parseFloat(display);
    
    if (previousValue === null) {
      setPreviousValue(currentValue);
    } else if (operation) {
      const result = calculate(previousValue, currentValue, operation);
      setDisplay(String(result));
      setPreviousValue(result);
    }
    
    setOperation(op);
    setNewNumber(true);
  };

  const calculate = (prev: number, current: number, op: string): number => {
    switch (op) {
      case '+': return prev + current;
      case '-': return prev - current;
      case '×': return prev * current;
      case '÷': return prev / current;
      default: return current;
    }
  };

  const handleEquals = () => {
    if (operation && previousValue !== null) {
      const result = calculate(previousValue, parseFloat(display), operation);
      setDisplay(String(result));
      setPreviousValue(null);
      setOperation(null);
      setNewNumber(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setNewNumber(true);
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
      setNewNumber(true);
    }
  };

  const buttonClass = "h-14 text-lg font-semibold";
  const operationClass = "h-14 text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90";

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalcIcon className="h-5 w-5" />
          Kikokotoo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="bg-muted p-4 rounded-lg text-right mb-2">
          <div className="text-sm text-muted-foreground h-6">
            {previousValue !== null && operation && `${previousValue} ${operation}`}
          </div>
          <div className="text-3xl font-bold truncate">{display}</div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <Button variant="outline" className={buttonClass} onClick={handleClear}>C</Button>
          <Button variant="outline" className={buttonClass} onClick={handleBackspace}>←</Button>
          <Button variant="outline" className={buttonClass} onClick={() => handleOperation('÷')}>÷</Button>
          <Button className={operationClass} onClick={() => handleOperation('×')}>×</Button>

          <Button variant="outline" className={buttonClass} onClick={() => handleNumber('7')}>7</Button>
          <Button variant="outline" className={buttonClass} onClick={() => handleNumber('8')}>8</Button>
          <Button variant="outline" className={buttonClass} onClick={() => handleNumber('9')}>9</Button>
          <Button className={operationClass} onClick={() => handleOperation('-')}>−</Button>

          <Button variant="outline" className={buttonClass} onClick={() => handleNumber('4')}>4</Button>
          <Button variant="outline" className={buttonClass} onClick={() => handleNumber('5')}>5</Button>
          <Button variant="outline" className={buttonClass} onClick={() => handleNumber('6')}>6</Button>
          <Button className={operationClass} onClick={() => handleOperation('+')}>+</Button>

          <Button variant="outline" className={buttonClass} onClick={() => handleNumber('1')}>1</Button>
          <Button variant="outline" className={buttonClass} onClick={() => handleNumber('2')}>2</Button>
          <Button variant="outline" className={buttonClass} onClick={() => handleNumber('3')}>3</Button>
          <Button className={`${operationClass} row-span-2`} onClick={handleEquals}>=</Button>

          <Button variant="outline" className={`${buttonClass} col-span-2`} onClick={() => handleNumber('0')}>0</Button>
          <Button variant="outline" className={buttonClass} onClick={handleDecimal}>.</Button>
        </div>
      </CardContent>
    </Card>
  );
};