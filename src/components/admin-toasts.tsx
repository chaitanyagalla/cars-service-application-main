'use client';

import { Toast } from '@heroui/react';
import { SteeringWheel } from '@/components/steering-loader';

export function AdminToasts() {
  return (
    <Toast.Provider placement="top end" maxVisibleToasts={3}>
      {({ toast }) => {
        const { title, description, indicator, isLoading, variant, actionProps } = toast.content;
        return (
          <Toast toast={toast} variant={variant}>
            {indicator !== null && (
              <Toast.Indicator variant={variant}>
                {isLoading ? <SteeringWheel /> : indicator}
              </Toast.Indicator>
            )}
            <Toast.Content>
              {Boolean(title) && <Toast.Title>{title}</Toast.Title>}
              {Boolean(description) && <Toast.Description>{description}</Toast.Description>}
            </Toast.Content>
            {actionProps?.children && <Toast.ActionButton {...actionProps} />}
            <Toast.CloseButton />
          </Toast>
        );
      }}
    </Toast.Provider>
  );
}
