'use client';

import { Toast } from '@heroui/react';

export function AdminToasts() {
  return <Toast.Provider placement="top end" maxVisibleToasts={3} className="dark" />;
}
