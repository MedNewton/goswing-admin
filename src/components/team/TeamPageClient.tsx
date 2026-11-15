"use client";

import { useState, useTransition, useEffect } from "react";
import { getClientLocale, translate } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
  inviteTeamMemberAction,
  revokeTeamInvitationAction,
  updateTeamMemberRoleAction,
  removeTeamMemberAction,
} from "@/lib/actions/team";
import type { PendingInvitation } from "@/lib/team/invitations";
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

type InviteFeedback = { tone: "success" | "error"; text: string } | null;

export function TeamPageClient({
  members: initialMembers,
  pendingInvitations: initialInvitations,
  currentUserId,
}: {
  members: TeamMember[];
  pendingInvitations: PendingInvitation[];
  currentUserId: string | null;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [showAddModal, setShowAddModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFeedback, setInviteFeedback] = useState<InviteFeedback>(null);
  const [selectedRole, setSelectedRole] = useState<OrganizerRole>("dj");
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [locale, setLocaleState] = useState<Locale>("fr");
  useEffect(() => { setLocaleState(getClientLocale()); }, []);
  const tr = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  const closeInviteModal = () => {
    setShowAddModal(false);
    setInviteEmail("");
    setInviteFeedback(null);
  };

  const handleInvite = () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteFeedback({ tone: "error", text: tr("teamPage.invalidEmail") });
      return;
    }
    setInviteFeedback(null);
    startTransition(async () => {
      const result = await inviteTeamMemberAction(email, selectedRole);
      if (!result.success) {
        setInviteFeedback({
          tone: "error",
          text:
            result.error === "invalid_email"
              ? tr("teamPage.invalidEmail")
              : tr("teamPage.inviteFailed").replace("{error}", result.error),
        });
        return;
      }
      if (result.status === "invited") {
        setInvitations((prev) => [
          ...prev,
          { id: `local-${email}`, email, role: selectedRole, createdAt: new Date().toISOString() },
        ]);
        setInviteFeedback({ tone: "success", text: tr("teamPage.inviteSent").replace("{email}", email) });
      } else if (result.status === "added") {
        setInviteFeedback({ tone: "success", text: tr("teamPage.memberAdded").replace("{email}", email) });
        // Reload so the new member appears with their real profile data.
        window.location.reload();
        return;
      } else {
        setInviteFeedback({ tone: "error", text: tr("teamPage.alreadyMember").replace("{email}", email) });
      }
      setInviteEmail("");
    });
  };

  const handleRevoke = (invitationId: string) => {
    startTransition(async () => {
      const result = await revokeTeamInvitationAction(invitationId);
      if (result.success) {
        setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
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
                    {member.userId === currentUserId ? (
                      <Badge
                        variant={roleBadgeVariant[member.role] as "success" | "info" | "warning" | "secondary"}
                      >
                        {tr(ROLE_LABEL_KEYS[member.role])}
                      </Badge>
                    ) : editingMemberId === member.memberId ? (
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
                    {member.userId === currentUserId ? (
                      <span className="text-sm text-gray-400">{tr("teamPage.you")}</span>
                    ) : confirmRemoveId === member.memberId ? (
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

      {/* Pending email invitations */}
      {invitations.length > 0 && (
        <Card padding="none">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">{tr("teamPage.pendingTitle")}</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-4 px-6 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{inv.email}</p>
                  <p className="text-xs text-gray-500">
                    {tr(ROLE_LABEL_KEYS[inv.role])} ·{" "}
                    {tr("teamPage.pendingInvited").replace("{date}", formatDate(inv.createdAt))}
                  </p>
                </div>
                {!inv.id.startsWith("local-") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevoke(inv.id)}
                    disabled={isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {tr("teamPage.revoke")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Invite Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">{tr("teamPage.modalTitle")}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {tr("teamPage.modalDesc")}
            </p>

            <div className="mt-4 space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="invite-email" className="mb-1.5 block text-sm font-medium text-gray-700">
                  {tr("teamPage.emailLabel")}
                </label>
                <input
                  id="invite-email"
                  type="email"
                  autoComplete="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleInvite();
                    }
                  }}
                  placeholder={tr("teamPage.emailPlaceholder")}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>

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

              {inviteFeedback && (
                <p
                  role="status"
                  className={
                    inviteFeedback.tone === "success"
                      ? "rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700"
                      : "rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                  }
                >
                  {inviteFeedback.text}
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={closeInviteModal}>
                {tr("teamPage.close")}
              </Button>
              <Button variant="primary" onClick={handleInvite} disabled={isPending || !inviteEmail.trim()}>
                {isPending ? tr("teamPage.sending") : tr("teamPage.sendInvite")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
