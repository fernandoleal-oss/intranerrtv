import { NumericFormat, NumericFormatProps } from 'react-number-format';
import { Input } from '@/components/ui/input';
import { forwardRef } from 'react';

interface BRLCurrencyInputProps extends Omit<NumericFormatProps, 'onValueChange' | 'onChange'> {
  value?: number;
  onChange?: (value: number) => void;
}

export const BRLCurrencyInput = forwardRef<HTMLInputElement, BRLCurrencyInputProps>(
  ({ value, onChange, ...props }, ref) => {
    return (
      <NumericFormat
        getInputRef={ref}
        customInput={Input}
        value={value ?? 0}
        thousandSeparator="."
        decimalSeparator=","
        prefix="R$ "
        decimalScale={2}
        fixedDecimalScale
        allowNegative={false}
        onValueChange={(values) => {
          onChange?.(values.floatValue ?? 0);
        }}
        {...props}
      />
    );
  }
);

BRLCurrencyInput.displayName = 'BRLCurrencyInput';
