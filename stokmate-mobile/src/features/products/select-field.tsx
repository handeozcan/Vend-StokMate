import { useState } from 'react';
import { Controller, type Control, type FieldError } from 'react-hook-form';
import { View } from 'react-native';
import { Button, HelperText, Menu } from 'react-native-paper';
import type { ProductEditFormValues } from './edit-schema';

export interface SelectOption {
  value: number;
  label: string;
  disabled?: boolean;
}

interface Props {
  label: string;
  options: SelectOption[];
  control: Control<ProductEditFormValues>;
  name: keyof ProductEditFormValues & string;
  error?: FieldError;
}

/**
 * Menu-backed select for RHF numeric fields. Coercion contract (same as the
 * web app): values are stored as NUMBERS — pick() converts via Number()
 * before field.onChange. The selected label derives from field.value inside
 * the Controller render (public API — no _formValues peeking).
 */
export function SelectField({ label, options, control, name, error }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const pick = (value: number) => {
          field.onChange(Number(value)); // number, never string
          setVisible(false);
        };
        const selected = options.find(
          (o) => !o.disabled && String(o.value) === String(field.value),
        );
        return (
          <View>
            <Menu
              visible={visible}
              onDismiss={() => setVisible(false)}
              anchor={
                <Button mode="outlined" onPress={() => setVisible(true)} icon="chevron-down" contentStyle={{ justifyContent: 'space-between' }}>
                  {selected ? selected.label : label}
                </Button>
              }
            >
              {options.map((option) => (
                <Menu.Item
                  key={option.value}
                  onPress={() => pick(option.value)}
                  title={option.label}
                  disabled={option.disabled}
                />
              ))}
            </Menu>
            {error && (
              <HelperText type="error" visible>
                {error.message}
              </HelperText>
            )}
          </View>
        );
      }}
    />
  );
}
