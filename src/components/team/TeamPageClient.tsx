"use client";

import { useState, useTransition, useCallback, useRef } from "react";
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

const ROLE_OPTIONS: { value: OrganizerRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "dj", label: "DJ" },
  { value: "entrance_manager", label: "Entrance Manager" },
  { value: "finance_manager", label: "Finance Manager" },
];

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
            <p className="text-sm text-gray-500">Total members</p>
            <p className="text-lg font-semibold text-gray-900">{members.length}</p>
          </div>
        </div>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <PlusIcon className="h-4 w-4" />
          Add Member
        </Button>
      </div>

      {/* Members table */}
      <Card padding="none">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UsersIcon className="h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No team members yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Add members to your team to collaborate on managing events.
            </p>
            <div className="mt-6">
              <Button variant="primary" onClick={() => setShowAddModal(true)}>
                <PlusIcon className="h-4 w-4" />
                Add First Member
              </Button>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
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
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingMemberId(member.memberId)}
                        className="cursor-pointer"
                        title="Click to change role"
                      >
                        <Badge
                          variant={roleBadgeVariant[member.role] as "success" | "info" | "warning" | "secondary"}
                        >
                          {ROLE_OPTIONS.find((o) => o.value === member.role)?.label ?? member.role}
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
                          Confirm
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmRemoveId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmRemoveId(member.memberId)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove
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
            <h2 className="text-lg font-semibold text-gray-900">Add Team Member</h2>
            <p className="mt-1 text-sm text-gray-500">
              Search for existing users to add to your team.
            </p>

            <div className="mt-4 space-y-4">
              {/* Search */}
              <SearchBar
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search by name or email..."
              />

              {/* Role selector */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as OrganizerRole)}
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Results */}
              <div className="max-h-64 overflow-y-auto">
                {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                  <p className="py-4 text-center text-sm text-gray-500">
                    No users found matching &ldquo;{searchQuery}&rdquo;
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
                      Add
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
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
