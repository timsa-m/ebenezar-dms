import React from 'react'
import { FormControl, FormField, FormLabel, FormMessage } from './ui/form'
import { Input } from './ui/input'

import { Control, FieldPath } from 'react-hook-form'
import { z } from 'zod'
import { authFormSchema } from '@/lib/utils'

const formSchema = authFormSchema('sign-up')

interface CustomInput {
  control: Control<z.infer<typeof formSchema>>,
  name: FieldPath<z.infer<typeof formSchema>>,
  label: string,
  placeholder: string
}

const IS_UPPERCASE_FIELD = (fieldName: string) => {
  const lower = fieldName.toLowerCase();
  return (
    lower.includes('name') ||
    lower.includes('address') ||
    lower.includes('city') ||
    lower.includes('state') ||
    lower.includes('location') ||
    lower.includes('county') ||
    lower.includes('country')
  );
};

const CustomInput = ({ control, name, label, placeholder }: CustomInput) => {
  const isUppercase = IS_UPPERCASE_FIELD(name);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex flex-col gap-1.5 w-full">
          <FormLabel className="text-12 font-bold text-gray-500 uppercase tracking-widest">
            {label}
          </FormLabel>
          <div className="flex w-full flex-col">
            <FormControl>
              <Input 
                placeholder={placeholder}
                className={`input-class ${isUppercase ? 'uppercase' : ''}`}
                style={isUppercase ? { textTransform: 'uppercase' } : undefined}
                type={name === 'password' ? 'password' : 'text'}
                {...field}
                onChange={(e) => {
                  if (isUppercase) {
                    field.onChange(e.target.value.toUpperCase());
                  } else {
                    field.onChange(e);
                  }
                }}
              />
            </FormControl>
            <FormMessage className="text-12 text-red-500 mt-2 font-medium" />
          </div>
        </div>
      )}
    />
  )
}

export default CustomInput
