import {
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  GitBranch,
  LogOut,
  Mail,
  Settings,
  User,
} from 'lucide-react';
import { type Dispatch, type SetStateAction, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import HoverDropdown from '../shared/HoverDropdown';

interface NavItem {
  path: string;
  label: string;
  icon: typeof User;
  children?: { path: string; label: string }[];
}

const navItems: NavItem[] = [
  {
    path: '/contacts',
    label: 'Contacts',
    icon: User,
    children: [
      { path: '/contacts', label: 'View all' },
      { path: '/contacts/new', label: 'Add new' },
      { path: '/contacts/tags', label: 'Tags' },
    ],
  },
  { path: '/workflows', label: 'Workflows', icon: GitBranch },
  { path: '/email-templates', label: 'Templates', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const activeLinkClass = 'text-indigo-600 font-medium dark:text-indigo-400';
const inactiveLinkClass =
  'text-gray-500 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-zinc-300';
const baseLinkClass = 'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors';

function isSectionActive(pathname: string, sectionPath: string) {
  return pathname === sectionPath || pathname.startsWith(`${sectionPath}/`);
}

function getLinkClassName(isActive: boolean) {
  return `${baseLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`;
}

function getGroupContentId(path: string) {
  return `sidebar-group-${path.replace(/\W+/g, '-')}`;
}

function findActiveGroupPath(pathname: string) {
  return (
    navItems.find((item) => item.children && isSectionActive(pathname, item.path))?.path ?? null
  );
}

function SidebarNavEntry({
  item,
  pathname,
  openGroup,
  setOpenGroup,
}: {
  item: NavItem;
  pathname: string;
  openGroup: string | null;
  setOpenGroup: Dispatch<SetStateAction<string | null>>;
}) {
  const { path, label, icon: Icon, children } = item;
  const hasChildren = Boolean(children?.length);

  if (!hasChildren) {
    return (
      <NavLink to={path} className={({ isActive }) => getLinkClassName(isActive)}>
        <Icon className="w-4 h-4" />
        {label}
      </NavLink>
    );
  }

  const isOpen = openGroup === path;
  const isActive = isSectionActive(pathname, path);
  const groupContentId = getGroupContentId(path);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpenGroup(isOpen ? null : path)}
        aria-expanded={isOpen}
        aria-controls={groupContentId}
        className={`${getLinkClassName(isActive)} w-full`}
      >
        <Icon className="w-4 h-4" />
        {label}
        <ChevronRight
          className={`w-4 h-4 ml-auto transition-transform ${isOpen ? 'rotate-90' : ''}`}
        />
      </button>
      {isOpen && (
        <div id={groupContentId} className="mt-0.5 flex flex-col gap-0.5">
          {children?.map((child) => (
            <NavLink
              key={child.path}
              to={child.path}
              end={child.path === '/contacts'}
              className={({ isActive: isChildActive }) =>
                `flex items-center gap-2.5 pl-9 pr-3 py-1.5 rounded-md text-sm transition-colors ${
                  isChildActive ? activeLinkClass : inactiveLinkClass
                }`
              }
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();
  const { currentTenant, tenants, setCurrentTenant } = useTenant();
  const navigate = useNavigate();
  const [openGroup, setOpenGroup] = useState<string | null>(
    () => findActiveGroupPath(location.pathname) ?? '/contacts',
  );

  const tenantDropdownItems = currentTenant
    ? [
        ...tenants.map((tenant) => ({
          key: tenant.id,
          label: (
            <span className="flex items-center justify-between gap-2">
              {tenant.name}
              {tenant.id === currentTenant.id && (
                <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              )}
            </span>
          ),
          onSelect: () => setCurrentTenant(tenant),
        })),
        {
          key: 'MANAGE_WORKSPACES',
          separator: true,
          label: <span className="text-gray-500 dark:text-zinc-400">Manage workspaces</span>,
          onSelect: () => void navigate('/'),
        },
        {
          key: 'SIGN_OUT',
          separator: true,
          hoverClassName: 'hover:bg-red-50 dark:hover:bg-red-900/30',
          label: (
            <span className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <LogOut className="w-4 h-4" />
              Sign out
            </span>
          ),
          onSelect: () => logout(),
        },
      ]
    : [];

  return (
    <aside className="fixed inset-y-0 left-0 w-[220px] pt-6 px-3 flex flex-col">
      <Link
        to="/"
        className="hover:opacity-80 transition-opacity flex items-center gap-2 text-indigo-600 dark:text-indigo-400 px-3 mb-4"
      >
        <Mail className="w-5 h-5" />
        <h1 className="font-bold text-lg text-gray-900 dark:text-white">Engine</h1>
      </Link>
      {currentTenant && (
        <div className="px-3 mb-4">
          <HoverDropdown
            trigger={
              <button
                type="button"
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-transparent text-gray-900 dark:text-white text-sm flex items-center justify-between"
              >
                {currentTenant.name}
                <ChevronDown className="w-4 h-4" />
              </button>
            }
            items={tenantDropdownItems}
          />
        </div>
      )}
      <nav className="flex flex-col gap-0.5">
        {navItems.map((item) => (
          <SidebarNavEntry
            key={item.path}
            item={item}
            pathname={location.pathname}
            openGroup={openGroup}
            setOpenGroup={setOpenGroup}
          />
        ))}
      </nav>
    </aside>
  );
}
