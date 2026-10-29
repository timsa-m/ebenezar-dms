import { Suspense } from 'react';
import AuthForm from '@/components/AuthForm';

export default function SignIn() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" />}>
      <AuthForm type="sign-in" />
    </Suspense>
  );
}