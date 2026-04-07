"use client";

import { useState, useTransition, useCallback, useRef, useEffect } from "react";
import { getClientLocale, translate } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SearchBar } from "@/components/ui/SearchBar";
import { UsersIcon, PlusIcon } from "@/components/icons";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import {
  addTeamMemberAction,
  updateTeamMemberRoleAction,
  removeTeamMemberAction,
  searchUsersAction,
} from "@/lib/actions/team";
import { formatDate } from "@/lib/utils/format";
import type { TeamMember } from "@/lib/data/team";
import type { OrganizerRole } from "@/types/database";

const ROLE_LABEL_KEYS: Record<OrganizerRole, "teamPage.roleAdmin" | "teamPage.roleDj" | "teamPage.roleEntranceManager" | "teamPage.roleFinanceManager"> = {
  admin: "teamPage.roleAdmin",
  dj: "teamPage.roleDj",
  entrance_manager: "teamPage.roleEntranceManager",
  finance_manager: "teamPage.roleFinanceManager",
};
const ROLE_VALUES: OrganizerRole[] = ["admin", "dj", "entrance_manager", "finance_manager"];

const roleBadgeVariant: Record<OrganizerRole, string> = {
  admin: "success",
  dj: "info",
  entrance_manager: "warning",
  finance_manager: "secondary",
};

interface SearchResult {
  userId: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
}

export function TeamPageClient({ members: initialMembers }: { members: TeamMember[] }) {
  const [members, setMembers] = useState(initialMembers);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedRole, setSelectedRole] = useState<OrganizerRole>("dj");
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [locale, setLocaleState] = useState<Locale>("fr");
  useEffect(() => { setLocaleState(getClientLocale()); }, []);
  const tr = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => {
      void (async () => {
        const results = await searchUsersAction(query);
        setSearchResults(results);
      })();
    }, 300);
  }, []);

  const handleAddMember = (userId: string) => {
    startTransition(async () => {
      const result = await addTeamMemberAction(userId, selectedRole);
      if (result.success) {
        const added = searchResults.find((u) => u.userId === userId);
        if (added) {
          setMembers((prev) => [
            ...prev,
            {
              memberId: crypto.randomUUID(),
              userId: added.userId,
              displayName: added.displayName,
              email: added.email,
              avatarUrl: added.avatarUrl,
              role: selectedRole,
              joinedAt: new Date().toISOString(),
            },
          ]);
          setSearchResults((prev) => prev.filter((u) => u.userId !== userId));
        }
        setShowAddModal(false);
        setSearchQuery("");
        setSearchResults([]);
      }
    });
  };

  const handleUpdateRole = (memberId: string, role: OrganizerRole) => {
    startTransition(async () => {
      const result = await updateTeamMemberRoleAction(memberId, role);
      if (result.success) {
        setMembers((prev) =>
          prev.map((m) => (m.memberId === memberId ? { ...m, role } : m)),
        );
        setEditingMemberId(null);
      }
    });
  };

  const handleRemove = (memberId: string) => {
    startTransition(async () => {
      const result = await removeTeamMemberAction(memberId);
      if (result.success) {
        setMembers((prev) => prev.filter((m) => m.memberId !== memberId));
        setConfirmRemoveId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
            <UsersIcon className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{tr("teamPage.totalMembers")}</p>
            <p className="text-lg font-semibold text-gray-900">{members.length}</p>
          </div>
        </div>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <PlusIcon className="h-4 w-4" />
          {tr("teamPage.addMember")}
        </Button>
      </div>

      {/* Members table */}
      <Card padding="none">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UsersIcon className="h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">{tr("teamPage.noMembersTitle")}</h3>
            <p className="mt-2 text-sm text-gray-500">
              {tr("teamPage.noMembersDesc")}
            </p>
            <div className="mt-6">
              <Button variant="primary" onClick={() => setShowAddModal(true)}>
                <PlusIcon className="h-4 w-4" />
                {tr("teamPage.addFirstMember")}
              </Button>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tr("teamPage.colMember")}</TableHead>
                <TableHead>{tr("teamPage.colRole")}</TableHead>
                <TableHead>{tr("teamPage.colJoined")}</TableHead>
                <TableHead>{tr("teamPage.colActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.memberId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={member.avatarUrl ?? undefined}
                        initials={member.displayName.slice(0, 2).toUpperCase()}
                        size="sm"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{member.displayName}</p>
                        {member.email && (
                          <p className="text-sm text-gray-500">{member.email}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {editingMemberId === member.memberId ? (
                      <select
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                        defaultValue={member.role}
                        onChange={(e) =>
                          handleUpdateRole(member.memberId, e.target.value as OrganizerRole)
                        }
                        onBlur={() => setEditingMemberId(null)}
                        autoFocus
                      >
                        {ROLE_VALUES.map((value) => (
                          <option key={value} value={value}>
                            {tr(ROLE_LABEL_KEYS[value])}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingMemberId(member.memberId)}
                        className="cursor-pointer"
                        title={tr("teamPage.changeRoleTitle")}
                      >
                        <Badge
                          variant={roleBadgeVariant[member.role] as "success" | "info" | "warning" | "secondary"}
                        >
                          {tr(ROLE_LABEL_KEYS[member.role])}
                        </Badge>
                      </button>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-500">
                      {formatDate(member.joinedAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {confirmRemoveId === member.memberId ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleRemove(member.memberId)}
                        >
                          {tr("teamPage.confirm")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmRemoveId(null)}
                        >
                          {tr("teamPage.cancel")}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmRemoveId(member.memberId)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {tr("teamPage.remove")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">{tr("teamPage.modalTitle")}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {tr("teamPage.modalDesc")}
            </p>

            <div className="mt-4 space-y-4">
              {/* Search */}
              <SearchBar
                value={searchQuery}
                onChange={handleSearch}
                placeholder={tr("teamPage.searchPlaceholder")}
              />

              {/* Role selector */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {tr("teamPage.roleLabel")}
                </label>
                <select
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as OrganizerRole)}
                >
                  {ROLE_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {tr(ROLE_LABEL_KEYS[value])}
                    </option>
                  ))}
                </select>
              </div>

              {/* Results */}
              <div className="max-h-64 overflow-y-auto">
                {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                  <p className="py-4 text-center text-sm text-gray-500">
                    {tr("teamPage.noUsersFound")} &ldquo;{searchQuery}&rdquo;
                  </p>
                )}
                {searchResults.map((user) => (
                  <div
                    key={user.userId}
                    className="flex items-center justify-between rounded-lg p-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={user.avatarUrl ?? undefined}
                        initials={user.displayName.slice(0, 2).toUpperCase()}
                        size="sm"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.displayName}
                        </p>
                        {user.email && (
                          <p className="text-xs text-gray-500">{user.email}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddMember(user.userId)}
                      disabled={isPending}
                    >
                      {tr("teamPage.add")}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAddModal(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
              >
                {tr("teamPage.close")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
