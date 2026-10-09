import { NextResponse } from 'next/server';
import { getBackendErrorBody, getBackendErrorStatus, listAdminAiProvisioning } from '@/lib/admin-client-policy';
import { requireOpturonAdminApi } from '@/lib/saas/access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireOpturonAdminApi();
  if (guard.error) return guard.error;
  try {
    const result = await listAdminAiProvisioning();
    return NextResponse.json(result.data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json(getBackendErrorBody(error) || { error: 'admin_ai_provisioning_load_failed' }, { status: getBackendErrorStatus(error) || 502 });
  }
}
