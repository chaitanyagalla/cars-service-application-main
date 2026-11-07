'use client';
import { useEffect } from 'react';
import { toast } from '@heroui/react';
export function RequestNotice({ message }: { message: string }) {
  useEffect(() => {
    toast.danger('Could not load records', { description: message, timeout: 8000 });
  }, [message]);
  return <p role="status">{message}</p>;
}
