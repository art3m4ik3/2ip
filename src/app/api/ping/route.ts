import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { setTimeout } from 'timers/promises';

export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        const { target } = await req.json();

        if (!target || typeof target !== 'string') {
            return NextResponse.json(
                { error: 'Invalid target' },
                { status: 400 }
            );
        }

        const pingCommand = process.platform === 'win32'
            ? `ping -n 1 -w 1000 ${target}`
            : `ping -c 1 -W 1 ${target}`;

        const timeout = setTimeout(5000);
        const [result, error] = await Promise.race([
            new Promise<[string, Error | null]>((resolve) => {
                exec(pingCommand, { timeout: 5000 }, (err, stdout) => {
                    resolve([stdout, err || null]);
                });
            }),
            timeout.then(() => ["", new Error('Ping timeout')])
        ]);

        const success = !error;
        const responseTime = success
            ? (result?.toString().match(/time=(\d+(?:\.\d+)?)ms/) || [])[1]
            : null;

        return NextResponse.json({
            success,
            responseTime: responseTime ? parseFloat(responseTime) : null,
            message: success
                ? 'Host is reachable'
                : error instanceof Error ? error.message : 'Host is unreachable'
        });

    } catch (error) {
        console.error('Ping error:', error);
        return NextResponse.json(
            {
                error: error instanceof Error
                    ? error.message
                    : 'An error occurred while performing ping'
            },
            { status: 500 }
        );
    }
}
