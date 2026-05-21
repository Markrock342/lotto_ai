import {
  PERMISSION_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  type Permission,
  type Role,
} from "@/lib/roles";

const ROLE_ORDER: Role[] = ["admin", "staff"];

export function PermissionMatrix() {
  const allPerms = ROLE_PERMISSIONS.admin;

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">
              สิทธิ์
            </th>
            {ROLE_ORDER.map((role) => (
              <th
                key={role}
                className="px-3 py-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                {ROLE_LABELS[role]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allPerms.map((perm: Permission) => (
            <tr
              key={perm}
              className="border-t border-slate-100 dark:border-slate-800"
            >
              <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                {PERMISSION_LABELS[perm as Permission]}
              </td>
              {ROLE_ORDER.map((role) => (
                <td key={role} className="px-3 py-2 text-center">
                  {ROLE_PERMISSIONS[role].includes(perm) ? (
                    <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="space-y-1 border-t border-slate-200 px-3 py-3 text-xs text-slate-500 dark:border-slate-700">
        {ROLE_ORDER.map((role) => (
          <p key={role}>
            <strong className="text-slate-700 dark:text-slate-300">
              {ROLE_LABELS[role]}:
            </strong>{" "}
            {ROLE_DESCRIPTIONS[role]}
          </p>
        ))}
      </div>
    </div>
  );
}
