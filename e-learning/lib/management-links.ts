import type { Semester, SubjectCategory } from '@/lib/choices';

const DEFAULT_MANAGEMENT_URL = 'http://127.0.0.1:8000';

function managementBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_MANAGEMENT_URL || DEFAULT_MANAGEMENT_URL).replace(
    /\/+$/,
    '',
  );
}

export function managementUrl(path = '/'): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${managementBaseUrl()}${normalizedPath}`;
}

export function scoreListUrl({
  year,
  semester,
  category,
}: {
  year: string;
  semester: '' | Semester;
  category: SubjectCategory;
}): string | null {
  if (!year || !semester) return null;

  const params = new URLSearchParams({ year, semester, category });
  return managementUrl(`/scores/?${params.toString()}`);
}
