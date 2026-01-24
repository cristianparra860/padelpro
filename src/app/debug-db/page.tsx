
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export default async function DebugDbPage() {
    let status = 'pending';
    let message = '';
    let errorDetail = '';
    let userCount = -1;

    try {
        userCount = await prisma.user.count();
        status = 'success';
        message = 'Conexión a Base de Datos EXITOSA';
    } catch (err: any) {
        status = 'error';
        message = 'FALLO Conexión Base de Datos';
        errorDetail = JSON.stringify({
            message: err.message,
            code: err.code,
            meta: err.meta,
            stack: err.stack
        }, null, 2);
    } finally {
        await prisma.$disconnect();
    }

    return (
        <div className="p-8 font-sans max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Diagnóstico de Base de Datos</h1>

            <div className={`p-4 rounded mb-4 ${status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <h2 className="font-bold text-xl">{message}</h2>
                {status === 'success' && <p>Usuarios encontrados: {userCount}</p>}
            </div>

            {errorDetail && (
                <div className="bg-gray-100 p-4 rounded overflow-auto">
                    <h3 className="font-bold mb-2">Detalle del Error:</h3>
                    <pre className="text-xs">{errorDetail}</pre>
                </div>
            )}

            <div className="mt-8 text-gray-500 text-sm">
                Timestamp: {new Date().toISOString()}
            </div>
        </div>
    );
}
