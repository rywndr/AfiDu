/**
 * two actors that get a dashboard, and the accent classes that tell them
 * apart. Keeping the class strings here means a role's colour is changed in one
 * place instead of in every component that renders something role-tinted.
 */
export type DashboardRole = 'student' | 'teacher';

type RoleAccent = {
  solid: string;
  soft: string;
};

export const roleAccent: Record<DashboardRole, RoleAccent> = {
  student: {
    solid: 'bg-accent-primary',
    soft: 'bg-accent-primary-soft text-accent-primary-strong',
  },
  teacher: {
    solid: 'bg-accent-warm',
    soft: 'bg-accent-warm-soft text-accent-warm-strong',
  },
};
