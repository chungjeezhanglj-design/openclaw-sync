export enum UserRole {
  USER = 'user',
  EDITOR = 'editor',
  ADMIN = 'admin',
}

export const RolePermissions: Record<UserRole, string[]> = {
  [UserRole.USER]: [
    'read:posts',
    'create:comments',
    'like:posts',
  ],
  [UserRole.EDITOR]: [
    'read:posts',
    'create:comments',
    'like:posts',
    'create:posts',
    'update:posts',
    'delete:posts',
    'publish:posts',
  ],
  [UserRole.ADMIN]: [
    'read:posts',
    'create:comments',
    'like:posts',
    'create:posts',
    'update:posts',
    'delete:posts',
    'publish:posts',
    'manage:users',
    'manage:system',
  ],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  return RolePermissions[role]?.includes(permission) ?? false;
}
