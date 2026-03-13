import { NextRequest, NextResponse } from "next/server";

export async function withAuth(
  handler: (request: NextRequest, userId: string) => Promise<Response>
) {
  return async (request: NextRequest) => {
    try {
      // Get the session from the request headers
      const sessionToken = request.cookies.get("better-auth.session_token")?.value;

      if (!sessionToken) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }

      // For protected routes, you'll need to verify the session
      // This is a simplified version - in production, verify the token properly
      const userId = request.headers.get("x-user-id");

      if (!userId) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }

      // Call the actual handler with userId
      return handler(request, userId);
    } catch (error) {
      console.error("Auth middleware error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
