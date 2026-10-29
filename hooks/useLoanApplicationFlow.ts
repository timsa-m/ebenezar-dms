import { useRouter } from 'next/navigation';

export interface ApplicantState {
  mode: 'EXISTING_CLIENT' | 'NEW_CLIENT';
  clientId?: string;
}

export const useLoanApplicationFlow = () => {
  const router = useRouter();

  const handleClientCompleted = async (clientId: string) => {
    // Navigate to loan creation page with clientId and source indicator
    router.push(`/loans/create?clientId=${clientId}&source=new_client`);
    router.refresh();
  };

  return {
    handleClientCompleted,
  };
};
