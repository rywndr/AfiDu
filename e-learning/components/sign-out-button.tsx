import { signOutAction } from '@/app/login/actions';
import { Button } from '@/components/ui/button';

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="outline" size="sm">
        Sign out
      </Button>
    </form>
  );
}
