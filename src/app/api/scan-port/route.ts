export const runtime = 'nodejs';
import net from 'net';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { host, port } = await req.json();

    if (typeof host !== 'string' || typeof port !== 'number') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (port < 1 || port > 65535) {
      return NextResponse.json({ error: 'Port must be between 1 and 65535' }, { status: 400 });
    }

    const isOpen = await new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      const timeout = 5000;
      let status = false;

      socket.setTimeout(timeout);

      socket.on('connect', () => {
        status = true;
        socket.destroy();
      });

      socket.on('timeout', () => {
        socket.destroy();
      });

      socket.on('error', (err) => {
        console.error(`Socket error for port ${port}:`, err);
        socket.destroy();
      });

      socket.on('close', () => {
        resolve(status);
      });

      socket.connect(port, host);
    });

    return NextResponse.json({
      port,
      isOpen,
      message: isOpen ? 'Port is open' : 'Port is closed'
    });
  } catch (error: unknown) {
    console.error('Port scan error:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : 'An unexpected error occurred';
    return NextResponse.json(
      { error: errorMessage, message: 'Failed to scan port' },
      { status: 500 }
    );
  }
}
