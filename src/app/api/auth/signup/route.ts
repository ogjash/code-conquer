import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { usersTable } from "@/drizzle/schema";
import { hashPassword } from "@/lib/auth/password";
import {
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/auth/jwt";
import { signupSchema } from "@/lib/validators/auth";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = signupSchema.parse(body);

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, validatedData.email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // Check if username is taken
    const existingUsername = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, validatedData.username))
      .limit(1);

    if (existingUsername.length > 0) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(validatedData.password);

    // Create user
    const newUser = await db
      .insert(usersTable)
      .values({
        username: validatedData.username,
        email: validatedData.email,
        password_hash: passwordHash,
        name: validatedData.name,
      })
      .returning({
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        name: usersTable.name,
        rating: usersTable.rating,
      });

    const user = newUser[0];

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    // Create response with tokens in httpOnly cookies
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          rating: user.rating,
        },
        accessToken,
      },
      { status: 201 }
    );

    // Set refresh token in httpOnly cookie
    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes("Validation")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
