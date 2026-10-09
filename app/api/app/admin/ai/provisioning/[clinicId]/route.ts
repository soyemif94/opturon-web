import { NextRequest, NextResponse } from 'next/server';
import { getBackendErrorBody, getBackendErrorStatus, updateAdminAiProvisioning } from '@/lib/admin-client-policy';
import { requireOpturonAdminApi } from '@/lib/saas/access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ clinicId: string }> }) {
  const guard = await requireOpturonAdminApi();
  if (guard.error) return guard.error;
  const { clinicId } = await params;
  const payload = await request.json().catch(() => ({}));
  try {
    const result = await updateAdminAiProvisioning(clinicId, payload.action, payload.reason);
    return NextResponse.json(result.data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json(getBackendErrorBody(error) || { error: 'admin_ai_provisioning_action_failed' }, { status: getBackendErrorStatus(error) || 502 });
  }
}
