import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import composio, { getConnectedToolkits } from "@/lib/services/composio";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    // Get all connected toolkits for the user
    const connectedToolkits = await getConnectedToolkits(session.user.id);

    return NextResponse.json({
      connections: connectedToolkits,
      totalConnections: connectedToolkits.length,
    });
  } catch (error) {
    console.error("Failed to fetch connections:", error);

    if (error instanceof Error && "code" in error) {
      // Handle Composio specific errors
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to fetch connections" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get("connectionId");

  if (!connectionId) {
    return new ChatSDKError(
      "bad_request:api",
      "Connection ID is required"
    ).toResponse();
  }

  try {
    // Delete the connection
    await composio.connectedAccounts.delete(connectionId);

    return NextResponse.json({
      success: true,
      message: "Connection deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete connection:", error);

    if (error instanceof Error && "code" in error) {
      // Handle Composio specific errors
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to delete connection" },
      { status: 500 }
    );
  }
}