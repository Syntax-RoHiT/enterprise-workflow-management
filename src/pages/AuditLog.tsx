import { useState, Fragment } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAuditLog } from '@/hooks/useAuditLog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Shield, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';

const TABLES = ['tasks', 'workflows', 'task_comments', 'task_attachments', 'organizations', 'teams', 'team_members'];
const OPERATIONS = ['INSERT', 'UPDATE', 'DELETE'];

const AuditLog = () => {
  const { role } = useAuth();
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [opFilter, setOpFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: result, isLoading } = useAuditLog(
    {
      tableName: tableFilter !== 'all' ? tableFilter : undefined,
      operation: opFilter !== 'all' ? opFilter : undefined,
    },
    { page, pageSize: 25 },
  );

  if (role !== 'admin') {
    return (
      <div className="p-6 animate-fade-in">
        <Card className="p-10 text-center bg-card border-border">
          <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold">Admin Access Required</h2>
          <p className="text-sm text-muted-foreground mt-1">
            The audit log is only accessible to administrators.
          </p>
        </Card>
      </div>
    );
  }

  const entries = result?.data ?? [];
  const totalPages = Math.ceil((result?.count ?? 0) / (result?.pageSize ?? 25));

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Database-level change history — {result?.count ?? 0} entries
        </p>
      </header>

      <Card className="p-3 bg-card border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger><SelectValue placeholder="All tables" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tables</SelectItem>
              {TABLES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={opFilter} onValueChange={setOpFilter}>
            <SelectTrigger><SelectValue placeholder="All operations" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All operations</SelectItem>
              {OPERATIONS.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Filter by user ID..." disabled className="opacity-50" />
        </div>
      </Card>

      <Card className="bg-card border-border overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center">
            <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto" />
          </div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No audit entries found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="w-8"></TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Operation</TableHead>
                <TableHead>Row ID</TableHead>
                <TableHead>User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const isExpanded = expandedId === entry.id;
                return (
                  <Fragment key={entry.id}>
                    <TableRow
                      key={entry.id}
                      className="border-border cursor-pointer hover:bg-muted/30"
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    >
                      <TableCell>
                        {isExpanded
                          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        }
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(entry.changed_at), 'MMM d, HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {entry.table_name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          entry.operation === 'INSERT' ? 'bg-emerald-500/15 text-emerald-400' :
                          entry.operation === 'UPDATE' ? 'bg-amber-500/15 text-amber-400' :
                          'bg-destructive/15 text-destructive'
                        }`}>
                          {entry.operation}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {entry.row_id?.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {entry.user_id?.slice(0, 8) ?? '—'}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${entry.id}-detail`} className="border-border">
                        <TableCell colSpan={6} className="p-4 bg-muted/20">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {entry.old_data && (
                              <div>
                                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Before</p>
                                <pre className="text-xs bg-background p-3 rounded border border-border overflow-auto max-h-[200px] scrollbar-thin">
                                  {JSON.stringify(entry.old_data, null, 2)}
                                </pre>
                              </div>
                            )}
                            {entry.new_data && (
                              <div>
                                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">After</p>
                                <pre className="text-xs bg-background p-3 rounded border border-border overflow-auto max-h-[200px] scrollbar-thin">
                                  {JSON.stringify(entry.new_data, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default AuditLog;
