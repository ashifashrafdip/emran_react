import { DeleteUserButton } from "@/components/DeleteUserButton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@/components/ui/table";
import { formatMysqlDateTime } from "@/lib/format";

export type UserRow = {
  id: number;
  email: string | null;
  passw: string | null;
  createdAt: Date | null;
};

/**
 * Replaces the user table in dashboard.php:39-57.
 *
 * NOTE ON THE PASSWORD COLUMN
 * The `Password` column renders `users.passw` in plaintext, exactly as the PHP
 * page did. This was kept on the explicit instruction to preserve existing
 * behaviour and is NOT an oversight — but it remains the most serious weakness
 * in the system, and it is only as safe as the admin session protecting it.
 * See PROJECT_ANALYSIS.md §7 finding 2 for the full write-up and the fix.
 *
 * Rendering stays a Server Component: no user data is shipped to the client
 * beyond what is already on screen, and only the delete button is interactive.
 */
export function UsersTable({ users }: { users: UserRow[] }) {
  return (
    <TableWrapper>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Password</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-6 text-center text-bs-muted">
                No users yet
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>

                {/* PHP echoed an empty string for a NULL column; `?? ""` matches that. */}
                <TableCell className="break-all">{user.email ?? ""}</TableCell>
                <TableCell className="break-all">{user.passw ?? ""}</TableCell>

                <TableCell className="whitespace-nowrap">
                  {formatMysqlDateTime(user.createdAt)}
                </TableCell>

                <TableCell>
                  <DeleteUserButton userId={user.id} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableWrapper>
  );
}
