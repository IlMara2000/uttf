import { NextResponse } from 'next/server';
import { driveErrorResponse, requireDriveStaff } from '@/lib/drive-server';
import { readAgentStatus, readFolders, readIndexSummary } from '@/lib/drive-status';
import type { DriveStatusPayload } from '@/lib/drive-model';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };

/** Solo numeri e stato: nessun asset, quindi nessuna firma nuova da scaricare.
 * La pagina lo usa per il refresh automatico senza ricaricare le anteprime. */
export async function GET(request: Request) {
  try {
    const { client } = await requireDriveStaff(request);

    const [agent, folders, index] = await Promise.all([
      readAgentStatus(),
      readFolders(client),
      readIndexSummary(client),
    ]);

    const payload: DriveStatusPayload = {
      folders,
      totals: index.totals,
      agent,
      syncedAt: index.syncedAt,
    };
    return NextResponse.json(payload, { headers });
  } catch (error) {
    return driveErrorResponse(error, 'DRIVE_STATUS_ERROR');
  }
}
