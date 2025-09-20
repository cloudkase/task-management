// [file name]: audit-log-dialog.component.ts (updated)
import { Component, OnDestroy, OnInit } from '@angular/core';

interface AuditEntry {
  time: string;
  actor: string;
  action: string;
  detail: string;
}

@Component({
  selector: 'app-audit-log-dialog',
  templateUrl: './audit-log-dialog.component.html',
})
export class AuditLogDialogComponent implements OnInit, OnDestroy {
  open = false;
  rows: AuditEntry[] = [];

  private handler = (ev: Event) => {
    const e = ev as CustomEvent;
    const payload = Array.isArray(e.detail?.entries) ? e.detail.entries : (Array.isArray(e.detail) ? e.detail : []);
    this.rows = this.parseAuditEntries(payload);
    this.open = true;
  };

  ngOnInit(): void {
    window.addEventListener('open-audit', this.handler as any);
  }
  
  ngOnDestroy(): void {
    window.removeEventListener('open-audit', this.handler as any);
  }

  parseAuditEntries(entries: string[]): AuditEntry[] {
    return entries.map(entry => {
      // Parse log format: [ACTION] TIMESTAMP USERID DETAIL
      const match = entry.match(/^\[(\w+)\]\s+([\d-T:.Z]+)\s+(\d+)\s+(.+)$/);
      if (match) {
        return {
          action: match[1],
          time: match[2],
          actor: `User ${match[3]}`,
          detail: match[4]
        };
      }
      
      // Fallback for other formats
      return {
        action: 'UNKNOWN',
        time: new Date().toISOString(),
        actor: 'Unknown',
        detail: entry
      };
    });
  }

  close() { 
    this.open = false; 
    this.rows = []; 
  }
}