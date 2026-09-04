'use client';

import { useState } from 'react';
import { notify } from '@/lib/notify';
import { Search, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingState, ErrorState, EmptyState } from '@/components/shared/states';
import { useAsync } from '@/hooks/use-async';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useAuth } from '@/providers/auth-provider';
import { useLocale } from '@/providers/locale-provider';
import { adminUsersService } from '@/services/admin.service';
import { ApiError } from '@/services/api-client';
import { formatDate } from '@/lib/format';
import type { AdminUser, Paginated } from '@/types/api';

/** Admin user management (spec §48). */
export default function AdminUsersPage() {
  const { token, user: currentUser } = useAuth();
  const { t, locale } = useLocale();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const debounced = useDebouncedValue(search, 350);

  const users = useAsync<Paginated<AdminUser>>(
    () =>
      adminUsersService.list(
        {
          pageSize: 50,
          search: debounced || undefined,
          role: role === 'all' ? undefined : role,
          status: status === 'all' ? undefined : status,
        },
        { token },
      ),
    [token, debounced, role, status],
    { enabled: Boolean(token), isEmpty: (result) => result.data.length === 0 },
  );

  /*
   * Deleting an account, behind a confirmation because it takes the person's
   * appointments with them. The API refuses the administrator's own account and
   * the last one left — the button is hidden for the first, and the second is
   * only knowable server-side.
   */
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);

  const remove = async () => {
    if (!deleting) return;
    setBusyDelete(true);
    try {
      await adminUsersService.remove(deleting.id, { token });
      notify.success(t.admin.deleteUserDone, { description: deleting.email });
      setDeleting(null);
      users.reload();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : t.common.error);
    } finally {
      setBusyDelete(false);
    }
  };

  const update = async (target: AdminUser, changes: { role?: string; status?: string }) => {
    try {
      await adminUsersService.update(target.id, changes, { token });
      notify.success(t.common.save);
      users.reload();
    } catch (error) {
      // The backend refuses self-demotion and removing the last admin, and
      // returns a clear reason — surface it rather than a generic failure.
      notify.error(error instanceof ApiError ? error.message : t.common.error);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">{t.admin.users}</h1>
      </header>

      <div className="flex flex-wrap items-end gap-4">
        <div className="max-w-sm flex-1 space-y-2">
          <Label htmlFor="user-search">{t.common.search}</Label>
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              id="user-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name or email"
              className="ps-9"
            />
          </div>
        </div>

        <div className="w-40 space-y-2">
          <Label htmlFor="user-role">{t.admin.role}</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger id="user-role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.common.all}</SelectItem>
              <SelectItem value="CUSTOMER">CUSTOMER</SelectItem>
              <SelectItem value="ADMIN">ADMIN</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-40 space-y-2">
          <Label htmlFor="user-status">{t.dashboard.status}</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="user-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.common.all}</SelectItem>
              <SelectItem value="ACTIVE">ACTIVE</SelectItem>
              <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {users.status === 'loading' && <LoadingState />}
      {users.status === 'error' && <ErrorState message={users.error} onRetry={users.reload} />}
      {users.status === 'success' && users.isEmpty && <EmptyState title={t.cars.noResults} />}

      {users.status === 'success' && !users.isEmpty && (
        <div className="border-border overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.auth.fullName}</TableHead>
                <TableHead>{t.auth.email}</TableHead>
                <TableHead>{t.admin.role}</TableHead>
                <TableHead>{t.dashboard.status}</TableHead>
                <TableHead className="text-end">{t.dashboard.favorites}</TableHead>
                <TableHead className="text-end">{t.dashboard.orders}</TableHead>
                <TableHead>{t.admin.createdAt}</TableHead>
                <TableHead className="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.data?.data.map((entry) => {
                const isSelf = entry.id === currentUser?.id;
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        {entry.role === 'ADMIN' ? (
                          <ShieldCheck className="text-primary size-4" aria-hidden="true" />
                        ) : (
                          <UserRound className="text-muted-foreground size-4" aria-hidden="true" />
                        )}
                        {entry.fullName}
                        {isSelf && (
                          <Badge variant="secondary" className="text-[10px]">
                            you
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{entry.email}</TableCell>
                    <TableCell>
                      <Badge variant={entry.role === 'ADMIN' ? 'default' : 'outline'}>{entry.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          entry.status === 'ACTIVE'
                            ? 'bg-success/15 border-success/30'
                            : 'bg-destructive/10 border-destructive/30'
                        }
                      >
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{entry._count?.favorites ?? 0}</TableCell>
                    <TableCell className="text-end tabular-nums">{entry._count?.orders ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {formatDate(entry.createdAt, locale)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Self-changes are hidden: the backend refuses them anyway */}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isSelf}
                          onClick={() =>
                            void update(entry, { role: entry.role === 'ADMIN' ? 'CUSTOMER' : 'ADMIN' })
                          }
                        >
                          {entry.role === 'ADMIN' ? 'Make customer' : 'Make admin'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isSelf}
                          onClick={() =>
                            void update(entry, {
                              status: entry.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                            })
                          }
                        >
                          {entry.status === 'ACTIVE' ? 'Suspend' : 'Reinstate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          disabled={isSelf}
                          title={t.admin.deleteUser}
                          aria-label={`${t.admin.deleteUser} — ${entry.email}`}
                          onClick={() => setDeleting(entry)}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.admin.deleteUser}</DialogTitle>
            <DialogDescription>
              {deleting?.email} · {t.admin.deleteUserConfirm}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)}>
              {t.admin.deleteKeep}
            </Button>
            <Button variant="destructive" onClick={() => void remove()} disabled={busyDelete}>
              {t.admin.deleteYes}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
