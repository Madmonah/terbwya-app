import { Suspense } from 'react';
import JoinWizard from './JoinWizard';

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinWizard />
    </Suspense>
  );
}
