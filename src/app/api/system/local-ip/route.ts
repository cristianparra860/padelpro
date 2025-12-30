import { NextRequest, NextResponse } from 'next/server';
import os from 'os';

export async function GET(req: NextRequest) {
  try {
    const interfaces = os.networkInterfaces();
    let localIP = 'localhost';

    // Buscar la primera IP local de red (no loopback)
    for (const interfaceName in interfaces) {
      const iface = interfaces[interfaceName];
      if (!iface) continue;
      
      for (const alias of iface) {
        // IPv4, no interna, no loopback
        if (alias.family === 'IPv4' && !alias.internal) {
          localIP = alias.address;
          break;
        }
      }
      if (localIP !== 'localhost') break;
    }

    return NextResponse.json({ 
      ip: localIP,
      port: process.env.PORT || '9002'
    });
  } catch (error: any) {
    console.error('Error getting local IP:', error);
    return NextResponse.json({ 
      ip: 'localhost',
      port: '9002'
    });
  }
}
