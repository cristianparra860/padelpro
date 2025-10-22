// src/app/(app)/store/page.tsx
"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from '@/components/ui/skeleton';
import { fetchProductsByClub, getMockCurrentUser, reserveProductWithCredit, performInitialization } from '@/lib/mockData';
import type { Product, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShoppingBag, Sparkles, Clock, Package, PackageCheck, PackageX, BadgePercent, Euro } from 'lucide-react';
const SHOW_EURO_BALANCE = false;
import { cn } from '@/lib/utils';

const CountdownTimer = () => {
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const endOfDay = new Date(now);
            endOfDay.setHours(23, 59, 59, 999);
            
            const difference = endOfDay.getTime() - now.getTime();
            
            let hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
            let minutes = Math.floor((difference / 1000 / 60) % 60);
            let seconds = Math.floor((difference / 1000) % 60);
            
            setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return <div className="text-xl font-bold text-destructive">{timeLeft}</div>;
};

const ProductCard: React.FC<{ product: Product; onReserve: (productId: string) => void; isProcessing: boolean; processingId: string | null; reservationFee: number; }> = ({ product, onReserve, isProcessing, processingId, reservationFee }) => {
    const isThisProductProcessing = isProcessing && processingId === product.id;
    const isOutOfStock = product.stock !== undefined && product.stock <= 0;
    const normalizeImageUrl = (url?: string) => {
        const fallback = 'https://www.padelnuestro.com/media/catalog/product/1/1/113540_pala_nox_at10_genius_18k_alum_by_agustin_tapia_pat10genius1825_1500x1500_6e6f.jpg?optimize=high&bg-color=255,255,255&fit=bounds&height=&width=&canvas=';
        if (!url) return fallback;
        // Ensure PNG for placehold.co (default is SVG which Next/Image blocks by default)
        return url.replace(/^(https?:\/\/placehold\.co\/(?:\d+x\d+))(\?(.*))?$/, '$1.png?$3');
    };
    const [imgSrc, setImgSrc] = useState<string>(normalizeImageUrl(product.images[0]));
    useEffect(() => {
        setImgSrc(normalizeImageUrl(product.images[0]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product.id]);
    
    return (
        <Card className="overflow-hidden shadow-lg transition-transform hover:scale-105 flex flex-col">
            <CardHeader className="p-0 relative">
                <Image
                    src={imgSrc}
                    alt={product.name}
                    width={600}
                    height={400}
                    className="h-48 w-full object-cover"
                    data-ai-hint={product.aiHint}
                    onError={() => setImgSrc('https://www.padelnuestro.com/media/catalog/product/1/1/113540_pala_nox_at10_genius_18k_alum_by_agustin_tapia_pat10genius1825_1500x1500_6e6f.jpg?optimize=high&bg-color=255,255,255&fit=bounds&height=&width=&canvas=')}
                />
                 {product.stock !== undefined && (
                     <Badge variant={isOutOfStock ? "destructive" : "secondary"} className="absolute top-2 right-2">
                        {isOutOfStock ? <PackageX className="mr-1 h-3 w-3" /> : <PackageCheck className="mr-1 h-3 w-3" />}
                        {isOutOfStock ? 'Agotado' : `${product.stock} en stock`}
                    </Badge>
                 )}
            </CardHeader>
            <CardContent className="p-4 flex-grow">
                <CardTitle className="text-base font-semibold">{product.name}</CardTitle>
            </CardContent>
            <CardFooter className="flex items-center justify-between p-4 pt-0">
                <div className="flex flex-col">
                    {product.offerPrice < product.officialPrice && (
                        <Badge variant="secondary" className="text-xs font-normal line-through text-muted-foreground self-start mb-0.5">{product.officialPrice.toFixed(2)}€</Badge>
                    )}
                    <Badge variant="default" className="text-lg font-bold">{product.offerPrice.toFixed(2)}€</Badge>
                </div>
                <div className="flex flex-col items-end">
                    <Button onClick={() => onReserve(product.id)} disabled={isThisProductProcessing || isOutOfStock}>
                        {isThisProductProcessing ? <Loader2 className="animate-spin" /> : (isOutOfStock ? "Agotado" : `Reservar por ${reservationFee.toFixed(0)}€`)}
                    </Button>
                    <span className="text-[11px] text-muted-foreground mt-1">Se descuenta del precio final</span>
                </div>
            </CardFooter>
        </Card>
    );
};

const DealOfTheDayCard: React.FC<{ product: Product; onReserve: (productId: string) => void; isProcessing: boolean; processingId: string | null; reservationFee: number; }> = ({ product, onReserve, isProcessing, processingId, reservationFee }) => {
    const isThisProductProcessing = isProcessing && processingId === product.id;
    const isOutOfStock = product.stock !== undefined && product.stock <= 0;
    const discountPrice = product.offerPrice * (1 - (product.discountPercentage || 0) / 100);
    const normalizeImageUrl = (url?: string) => {
        const fallback = 'https://www.padelnuestro.com/media/catalog/product/1/1/113540_pala_nox_at10_genius_18k_alum_by_agustin_tapia_pat10genius1825_1500x1500_6e6f.jpg?optimize=high&bg-color=255,255,255&fit=bounds&height=&width=&canvas=';
        if (!url) return fallback;
        return url.replace(/^(https?:\/\/placehold\.co\/(?:\d+x\d+))(\?(.*))?$/, '$1.png?$3');
    };
    const [imgSrc, setImgSrc] = useState<string>(normalizeImageUrl(product.images[0]));
    useEffect(() => {
        setImgSrc(normalizeImageUrl(product.images[0]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product.id]);

    return (
        <Card className="overflow-hidden shadow-2xl border-2 border-amber-400 bg-amber-50/50 flex flex-col col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4">
            <div className="grid grid-cols-1 md:grid-cols-2 items-center">
                 <div className="p-4 md:p-6 order-2 md:order-1">
                     <CardHeader className="p-0 mb-4">
                        <Badge variant="outline" className="text-amber-700 border-amber-500 bg-white font-semibold text-sm self-start animate-pulse">
                             <Sparkles className="mr-2 h-4 w-4" /> Oferta del Día
                        </Badge>
                        <CardTitle className="text-2xl md:text-3xl font-bold mt-2">{product.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold text-destructive">{discountPrice.toFixed(2)}€</span>
                                <span className="text-lg font-semibold text-muted-foreground line-through">{product.offerPrice.toFixed(2)}€</span>
                            </div>
                            <Badge variant="destructive">-{product.discountPercentage}%</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Clock className="h-5 w-5" />
                            <span>La oferta termina en:</span>
                            <CountdownTimer />
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                            <Badge variant="outline" className="border-primary text-primary font-semibold">
                                <BadgePercent className="h-4 w-4 mr-1" /> {`Reserva ahora por ${reservationFee.toFixed(0)}€ y paga el resto al recoger`}
                            </Badge>
                        </div>
                         {product.stock !== undefined && (
                             <Badge variant={isOutOfStock ? "destructive" : "secondary"}>
                                {isOutOfStock ? <PackageX className="mr-1 h-3 w-3" /> : <PackageCheck className="mr-1 h-3 w-3" />}
                                {isOutOfStock ? 'Agotado' : `${product.stock} en stock`}
                            </Badge>
                         )}
                    </CardContent>
                    <CardFooter className="p-0 mt-4">
                                                 <Button size="lg" onClick={() => onReserve(product.id)} disabled={isThisProductProcessing || isOutOfStock} className="relative">
                                                     {isThisProductProcessing ? <Loader2 className="animate-spin" /> : (isOutOfStock ? "Agotado" : `Reservar por ${reservationFee.toFixed(0)}€`)}
                        </Button>
                    </CardFooter>
                 </div>
                 <div className="order-1 md:order-2">
                            <Image
                                src={imgSrc}
                        alt={product.name}
                        width={800}
                        height={600}
                        className="h-64 w-full object-cover md:h-full md:rounded-r-lg"
                        data-ai-hint={product.aiHint}
                        onError={() => setImgSrc('https://www.padelnuestro.com/media/catalog/product/1/1/113540_pala_nox_at10_genius_18k_alum_by_agustin_tapia_pat10genius1825_1500x1500_6e6f.jpg?optimize=high&bg-color=255,255,255&fit=bounds&height=&width=&canvas=')}
                    />
                 </div>
            </div>
        </Card>
    );
};


export default function StorePage() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, startTransition] = useTransition();
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [reservationFee, setReservationFee] = useState<number>(10);
    const { toast } = useToast();

    useEffect(() => {
    // Make sure mock data (including shop) is initialized when landing here directly
    performInitialization();
        const loadData = async () => {
            setLoading(true);
            try {
                // In a multi-club setup, you'd get the clubId from context or URL
                const [fetchedProducts, user] = await Promise.all([
                    fetchProductsByClub('club-1'),
                    getMockCurrentUser()
                ]);
                // Normalize images so they always show a real photo
                const fallbackUrl = 'https://www.padelnuestro.com/media/catalog/product/1/1/113540_pala_nox_at10_genius_18k_alum_by_agustin_tapia_pat10genius1825_1500x1500_6e6f.jpg?optimize=high&bg-color=255,255,255&fit=bounds&height=&width=&canvas=';
                const makeSafe = (url?: string) => {
                    if (!url) return fallbackUrl;
                    if (url.includes('padelnuestro.com')) return url;
                    return fallbackUrl;
                };
                const normalizedProducts = fetchedProducts.map(p => ({
                    ...p,
                    images: [makeSafe(p.images?.[0])],
                }));
                setProducts(normalizedProducts);
                setCurrentUser(user);
            } catch (error) {
                console.error("Error loading store data:", error);
                toast({ title: "Error", description: "No se pudieron cargar los productos de la tienda.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [toast]);

    // Guard: if club disables Store, redirect to dashboard with toast
    useEffect(() => {
        (async () => {
            const clubs = await import('@/lib/mockData').then(m => m.getMockClubs());
            const club = clubs && clubs[0];
            if (club && !(club.isStoreEnabled ?? true)) {
                toast({ title: 'Sección deshabilitada', description: 'La tienda no está disponible en tu club.' });
                router.replace('/dashboard');
            }
            if (club?.shopReservationFee) {
                setReservationFee(club.shopReservationFee);
            }
        })();
    }, []);

    const openConfirm = (productId: string) => {
        const prod = products.find(p => p.id === productId) || null;
        setSelectedProduct(prod);
        setConfirmOpen(!!prod);
    };

    const handleReserveProduct = (productId: string) => {
        if (!currentUser) {
            toast({ title: "Acción Requerida", description: "Debes iniciar sesión para reservar productos.", variant: "default" });
            return;
        }
        setProcessingId(productId);
        startTransition(async () => {
            const result = await reserveProductWithCredit(currentUser.id, productId);
            if ('error' in result) {
                toast({ title: "Error en la Reserva", description: result.error, variant: "destructive" });
            } else {
                toast({
                    title: `¡Reserva confirmada por ${reservationFee.toFixed(0)}€!`,
                    description: `La fianza de ${reservationFee.toFixed(0)}€ se descuenta del precio final.` + (SHOW_EURO_BALANCE ? ` Saldo actual: ${result.newBalance.toFixed(2)}€` : ''),
                    className: 'bg-primary text-primary-foreground',
                });
                // Trigger a re-fetch of user data or update context if available
                 window.dispatchEvent(new CustomEvent('productReservationChanged'));
                 // Manually update the stock of the product in the local state
                 setProducts(prevProducts => prevProducts.map(p => 
                    p.id === productId ? { ...p, stock: (p.stock || 1) - 1 } : p
                 ));
            }
            setProcessingId(null);
            setConfirmOpen(false);
            setSelectedProduct(null);
        });
    };
    
    // Filter: only paddles (palas) in stock
    const paddlesInStock = products.filter(p => p.category === 'pala' && (p.stock ?? 0) > 0);
    const dealOfTheDay = paddlesInStock.find(p => p.isDealOfTheDay);
    const regularProducts = paddlesInStock.filter(p => !p.isDealOfTheDay);

    return (
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
            <header>
                <h1 className="font-headline text-3xl font-semibold">Tienda del Club</h1>
                <p className="text-muted-foreground">
                    {`Solo mostramos palas disponibles. La reserva tiene un coste fijo de ${reservationFee.toFixed(0)}€ y el resto se paga al recoger en el club.`}
                </p>
                <div className="mt-2">
                    <Badge variant="destructive" className="text-sm font-bold">SOLO PALAS EN STOCK</Badge>
                </div>
            </header>
            
            {loading ? (
                 <main className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                     {[...Array(4)].map((_, index) => (
                        <Card key={index} className="overflow-hidden">
                             <Skeleton className="h-48 w-full" />
                             <CardContent className="p-4 space-y-2">
                                 <Skeleton className="h-5 w-3/4" />
                             </CardContent>
                             <CardFooter className="flex items-center justify-between p-4 pt-0">
                                 <Skeleton className="h-8 w-20" />
                                 <Skeleton className="h-10 w-24" />
                             </CardFooter>
                        </Card>
                     ))}
                 </main>
            ) : products.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center text-center p-8 border-dashed border-2 rounded-lg mt-8">
                     <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold">Tienda Vacía</h2>
                    <p className="text-muted-foreground mt-2">Aún no hay productos disponibles en esta tienda.</p>
                </div>
            ) : (
                <main className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {dealOfTheDay && (
                                <DealOfTheDayCard
                           product={dealOfTheDay}
                                    onReserve={(id) => openConfirm(id)}
                           isProcessing={isProcessing}
                           processingId={processingId}
                                    reservationFee={reservationFee}
                        />
                    )}
                    {regularProducts.map((product) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            onReserve={(id) => openConfirm(id)}
                            isProcessing={isProcessing}
                            processingId={processingId}
                                     reservationFee={reservationFee}
                        />
                    ))}
                </main>
            )}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar reserva</DialogTitle>
                        <DialogDescription>
                            {selectedProduct ? (
                                <span>
                                    Vas a reservar "{selectedProduct.name}" por {reservationFee.toFixed(0)}€. Este importe se descuenta del precio final al recoger en el club.
                                </span>
                            ) : (
                                <span>Selecciona un producto para continuar.</span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center justify-between p-2 rounded-md bg-muted">
                        <div className="text-sm text-muted-foreground">Fianza</div>
                        <div className="text-base font-semibold">{reservationFee.toFixed(0)}€</div>
                    </div>
                    {currentUser && (
                        <div className="space-y-2">
                            {SHOW_EURO_BALANCE && (
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>Saldo actual</span>
                                    <span>{(currentUser.credit ?? 0).toFixed(2)}€</span>
                                </div>
                            )}
                            {((currentUser.credit ?? 0) < reservationFee) && (
                                SHOW_EURO_BALANCE ? (
                                    <div className="text-sm rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2">
                                        Saldo insuficiente. Te faltan {(reservationFee - (currentUser.credit ?? 0)).toFixed(2)}€. 
                                        <Link href="/dashboard?openAddCredit=1" className="underline ml-1">Recargar saldo</Link>
                                    </div>
                                ) : (
                                    <div className="text-sm rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2">
                                        Saldo insuficiente. Recarga saldo para continuar.
                                        <Link href="/dashboard" className="underline ml-1">Ir al panel</Link>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="secondary">Cancelar</Button>
                        </DialogClose>
                        <Button onClick={() => selectedProduct && handleReserveProduct(selectedProduct.id)} disabled={!selectedProduct || isProcessing || ((currentUser?.credit ?? 0) < reservationFee)}>
                            {isProcessing ? <Loader2 className="animate-spin" /> : `Confirmar y pagar ${reservationFee.toFixed(0)}€`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
