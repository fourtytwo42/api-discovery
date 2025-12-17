import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { hashPassword } from '@/lib/auth/password';
import { generateToken } from '@/lib/auth/jwt';
import { registerSchema } from '@/lib/utils/validation';
import { ValidationError, ConflictError, handleError } from '@/lib/utils/errors';
import { logAuditEvent, getClientInfo } from '@/lib/audit/middleware';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Check username if provided
    if (validated.username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username: validated.username },
      });

      if (existingUsername) {
        throw new ConflictError('Username already taken');
      }
    }

    // Hash password
    const passwordHash = await hashPassword(validated.password);

    // Create user
    const freeCredits = parseInt(process.env.FREE_CREDITS_ON_SIGNUP || '100', 10);
    const user = await prisma.user.create({
      data: {
        email: validated.email,
        username: validated.username || null,
        passwordHash,
        credits: freeCredits,
      },
    });

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Log audit event
    const clientInfo = getClientInfo(request);
    await logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      action: 'USER_REGISTERED',
      resourceType: 'USER',
      resourceId: user.id,
      ...clientInfo,
    });

    // Set HTTP-only cookie
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        credits: user.credits,
      },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 3, // 3 days
    });

    return response;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof ConflictError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    const handled = handleError(error);
    return NextResponse.json(
      { error: handled.message },
      { status: handled.statusCode }
    );
  }
}

