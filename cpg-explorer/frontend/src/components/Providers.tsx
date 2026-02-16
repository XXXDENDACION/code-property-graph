'use client';

import { ReactNode } from 'react';
import { ToastProvider } from './Toast';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return <ToastProvider>{children}</ToastProvider>;
}
