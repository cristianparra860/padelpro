"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QRScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const qrCodeRegionId = "qr-reader";

    useEffect(() => {
        const startScanner = async () => {
            try {
                setError(null);

                // Create scanner instance
                const html5QrCode = new Html5Qrcode(qrCodeRegionId);
                scannerRef.current = html5QrCode;

                // Request camera permissions and start scanning
                await html5QrCode.start(
                    { facingMode: "environment" }, // Use back camera on mobile
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 }
                    },
                    (decodedText) => {
                        // QR Code successfully scanned
                        console.log('QR Code scanned:', decodedText);
                        onScan(decodedText);
                        stopScanner();
                    },
                    (errorMessage) => {
                        // Scanning error (can be ignored, happens frequently)
                        // console.log('Scan error:', errorMessage);
                    }
                );

                setIsScanning(true);
            } catch (err: any) {
                console.error('Error starting QR scanner:', err);
                console.error('Error name:', err.name);
                console.error('Error message:', err.message);
                console.error('Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err)));

                let errorMsg = '';
                let errorDetails = '';

                if (err.name === 'NotAllowedError') {
                    errorMsg = 'Permiso de cámara denegado. Por favor, permite el acceso a la cámara.';
                } else if (err.name === 'NotFoundError') {
                    errorMsg = 'No se encontró ninguna cámara en este dispositivo.';
                } else if (err.name === 'NotSupportedError' || err.message?.includes('secure')) {
                    errorMsg = 'La cámara solo funciona con HTTPS. Por favor, accede desde una conexión segura.';
                } else if (err.name === 'NotReadableError') {
                    errorMsg = 'La cámara está siendo usada por otra aplicación.';
                } else {
                    errorMsg = `Error: ${err.message || 'Error al iniciar el escáner'}`;
                    errorDetails = `\n\nDetalles: ${err.name || 'Desconocido'}\n${err.toString()}`;
                }

                setError(errorMsg + errorDetails);
            }
        };

        startScanner();

        // Cleanup on unmount
        return () => {
            stopScanner();
        };
    }, []);

    const stopScanner = async () => {
        if (scannerRef.current && isScanning) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
                setIsScanning(false);
            } catch (err) {
                console.error('Error stopping scanner:', err);
            }
        }
    };

    const handleClose = async () => {
        await stopScanner();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            <Camera className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Escanear QR</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Scanner Area */}
                <div className="p-6">
                    {error ? (
                        <div className="flex flex-col items-center gap-4 py-8">
                            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                                <AlertCircle className="w-8 h-8 text-red-600" />
                            </div>
                            <p className="text-center text-gray-700 font-medium whitespace-pre-line">{error}</p>
                            <Button
                                onClick={handleClose}
                                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                            >
                                Cerrar
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div
                                id={qrCodeRegionId}
                                className="rounded-2xl overflow-hidden border-4 border-blue-500/20"
                            />
                            <p className="text-center text-sm text-gray-500 mt-4">
                                Apunta la cámara al código QR del kiosco
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
