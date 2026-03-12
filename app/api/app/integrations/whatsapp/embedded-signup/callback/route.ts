import { NextResponse } from "next/server";

// Reserved callback endpoint for the future Meta Embedded Signup handshake.
// The persistent channel payload must eventually be attached to a tenant-scoped clinic
// and stored in the durable backend before marking the workspace as connected.
export async function POST() {
  return NextResponse.json(
    {
      error: "meta_embedded_signup_not_ready",
      detail: "El callback de Meta Embedded Signup todavia no esta habilitado en este workspace."
    },
    { status: 501 }
  );
}
