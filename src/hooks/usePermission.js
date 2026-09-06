// hooks/usePermission.js
import { useAuth } from '@/hooks/useAuth';

export function usePermission() {
  const { user, permissions } = useAuth();

  const isAdminRole = (roleName) => {
    return ['Super Admin', 'Admin'].includes(roleName);
  };

  const normalizePermissionEntries = (source) => {
    if (!source) return [];

    if (Array.isArray(source)) {
      return source;
    }

    if (source instanceof Map) {
      return Array.from(source.entries()).map(([name, data]) => ({
        name,
        ...(data || {}),
      }));
    }

    if (typeof source === 'object') {
      return Object.entries(source).map(([name, data]) => ({
        name,
        ...(typeof data === 'object' && data !== null ? data : {}),
      }));
    }

    return [];
  };

  const getModulePermission = (moduleName) => {
    const sources = [permissions, user?.permissions, user?.modules].filter(Boolean);

    for (const source of sources) {
      const entries = normalizePermissionEntries(source);

      if (entries.length > 0) {
        const match = entries.find((entry) => {
          const entryName = entry?.module || entry?.name || entry?.moduleName;
          return entryName === moduleName;
        });

        if (match) return match;
      }

      if (source && typeof source === 'object' && !Array.isArray(source) && !(source instanceof Map)) {
        const directMatch = source[moduleName];
        if (directMatch) return directMatch;
      }
    }

    return null;
  };

  const hasPermission = (moduleName, action) => {
    if (!user || !moduleName || !action) return false;

    const roleName = user?.role?.name || user?.role;
    const roleList = user?.roles || [];

    if (roleList.includes('Super Admin') || roleList.includes('Admin')) return true;
    if (roleName && isAdminRole(roleName)) return true;

    const moduleData = getModulePermission(moduleName);
    if (!moduleData) return false;

    if (moduleData.selected === false) return false;

    const permissionValues = moduleData.permissions || moduleData.actions || moduleData.access || [];

    if (Array.isArray(permissionValues)) {
      const normalizedAction = `${action}`.toLowerCase();
      return permissionValues.some((value) => {
        if (typeof value !== 'string') return false;
        return value === '*' || value.toLowerCase() === normalizedAction;
      });
    }

    if (typeof permissionValues === 'object') {
      return permissionValues[action] === true || permissionValues[action] === 1 || permissionValues[action] === 'yes';
    }

    return false;
  };

  // Helper to check if user has ANY of the specified permissions
  const hasAnyPermission = (moduleName, actions = []) => {
    return actions.some((action) => hasPermission(moduleName, action));
  };

  // Helper to check if user has ALL specified permissions
  const hasAllPermissions = (moduleName, actions = []) => {
    return actions.every((action) => hasPermission(moduleName, action));
  };

  // Get all modules user has access to
  const getAccessibleModules = () => {
    if (!user || !user.modules) return [];

    let modules = [];
    if (user.modules instanceof Map) {
      modules = Array.from(user.modules.entries())
        .filter(([_, data]) => data?.selected === true)
        .map(([name]) => name);
    } else if (typeof user.modules === 'object') {
      if (Array.isArray(user.modules)) {
        modules = user.modules
          .filter((m) => m?.selected !== false)
          .map((m) => m?.name || m?.module);
      } else {
        modules = Object.keys(user.modules)
          .filter((key) => user.modules[key]?.selected !== false);
      }
    }
    return modules;
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getAccessibleModules,
    user,
  };
}