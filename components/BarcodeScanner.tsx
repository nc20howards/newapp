import React, { useEffect, useRef, useState } from 'react';

// Make TypeScript aware of the globally loaded library
declare var ZXingBrowser: any;

interface BarcodeScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanError: (error: Error) => void;
    onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScanSuccess, onScanError, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [status, setStatus] = useState('Initializing camera...');
    const [error, setError] = useState('');
    
    useEffect(() => {
        if (!ZXingBrowser) {
            setError("Scanning library not loaded. Please check your internet connection and refresh.");
            return;
        }

        const codeReader = new ZXingBrowser.BrowserMultiFormatReader();
        // This will hold the controls object returned by the scanner,
        // which is needed for a clean shutdown.
        let controls: any = null;

        const startScan = async () => {
            try {
                setStatus('Scanning... Please align the barcode.');
                
                // We MUST await this call. It returns a promise that resolves to the controls object.
                // Not awaiting it was causing the "stop is not a function" error because
                // the cleanup function was trying to call .stop() on a Promise.
                controls = await codeReader.decodeFromVideoDevice(undefined, videoRef.current!, (result: any, err: any) => {
                    if (result) {
                        onScanSuccess(result.getText());
                    }
                    if (err) {
                        // More robustly ignore common "not found" type errors that spam the console.
                        // These are expected on every frame where a barcode isn't detected.
                        const ignoredErrors = ['NotFoundException', 'ChecksumException', 'FormatException'];
                        if (!ignoredErrors.includes(err.name)) {
                             console.error('Scan error:', err);
                        }
                    }
                });
            } catch (err) {
                const errorMessage = (err as Error).message;
                if(errorMessage.includes('Permission denied')) {
                     setError('Camera permission denied. Please allow camera access in your browser settings.');
                } else {
                    setError(`Failed to start camera: ${errorMessage}`);
                }
                onScanError(err as Error);
            }
        };

        startScan();

        return () => {
            // When the component unmounts, stop the scan if the controls were successfully initialized.
            if (controls) {
                controls.stop();
            }
            // It's also good practice to reset the reader to fully release camera resources.
            codeReader.reset();
        };
    }, [onScanSuccess, onScanError, onClose]);

    return (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-4 w-full max-w-lg">
                <h3 className="text-xl font-bold text-white mb-4">Scan Barcode</h3>
                <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
                    <video ref={videoRef} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 border-4 border-dashed border-cyan-500/50 m-8"></div>
                </div>
                {error ? (
                    <p className="text-red-400 text-center mt-4">{error}</p>
                ) : (
                    <p className="text-gray-300 text-center mt-4">{status}</p>
                )}
                <button onClick={onClose} className="w-full mt-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold">
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default BarcodeScanner;