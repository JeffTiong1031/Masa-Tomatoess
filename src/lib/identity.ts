export const USERS = ['Jeff', 'Rachel'] as const;

export type UserName = (typeof USERS)[number];

export function partnerOf(user: UserName): UserName {
  return user === 'Jeff' ? 'Rachel' : 'Jeff';
}

export function isUserName(value: string | null): value is UserName {
  return value === 'Jeff' || value === 'Rachel';
}
