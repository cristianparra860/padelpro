'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Building, Upload, Save, Loader2, ExternalLink, MapPin, Phone, Mail, Globe, Image as ImageIcon } from 'lucide-react';

export default function ClubInfoAdminPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clubData, setClubData] = useState({
    id: '',
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo: '',
    heroImage: '',
    description: ''
  });
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [heroPreview, setHeroPreview] = useState<string>('');

  // Cargar datos del club
  useEffect(() => {
    fetchClubData();
  }, []);

  const fetchClubData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/admin/club-info', {
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al cargar datos del club');
      }

      const data = await response.json();
      console.log('📊 Datos del club cargados:', data);
      console.log('🆔 Club ID recibido:', data.id);
      console.log('📝 Tipo de ID:', typeof data.id);
      
      if (!data.id) {
        console.error('❌ ERROR: El servidor no devolvió un ID de club');
        toast({
          title: 'Error',
          description: 'No se pudo obtener el ID del club. Intenta cerrar sesión y volver a entrar.',
          variant: 'destructive'
        });
        return;
      }
      
      setClubData({
        id: data.id,
        name: data.name || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        website: data.website || '',
        logo: data.logoUrl || '',
        heroImage: data.heroImage || '',
        description: data.description || ''
      });
      setLogoPreview(data.logoUrl || '');
      setHeroPreview(data.heroImage || '');
      
      console.log('✅ Estado del club actualizado con ID:', data.id);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la información del club',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar que sea una imagen
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona un archivo de imagen válido',
        variant: 'destructive'
      });
      return;
    }

    // Convertir a base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setLogoPreview(base64String);
      setClubData(prev => ({ ...prev, logo: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const handleHeroImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar que sea una imagen
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona un archivo de imagen válido',
        variant: 'destructive'
      });
      return;
    }

    // Convertir a base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setHeroPreview(base64String);
      setClubData(prev => ({ ...prev, heroImage: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const token = localStorage.getItem('auth_token');
      console.log('💾 Guardando cambios del club');
      console.log('🔑 Token encontrado:', !!token);
      console.log('📤 Datos a enviar:', {
        address: clubData.address,
        phone: clubData.phone,
        email: clubData.email,
        website: clubData.website,
        hasLogo: !!clubData.logo,
        logoLength: clubData.logo?.length,
        hasHeroImage: !!clubData.heroImage,
        heroImageLength: clubData.heroImage?.length,
        description: clubData.description?.substring(0, 50) + '...'
      });

      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/admin/club-info', {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          address: clubData.address,
          phone: clubData.phone,
          email: clubData.email,
          website: clubData.website,
          logo: clubData.logo,
          heroImage: clubData.heroImage,
          description: clubData.description
        })
      });

      console.log('📡 Respuesta del servidor:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error del servidor:', errorData);
        throw new Error(errorData.error || 'Error al guardar');
      }

      const result = await response.json();
      console.log('✅ Guardado exitoso:', result);

      toast({
        title: 'Guardado',
        description: 'La información del club se actualizó correctamente',
      });

      // Recargar datos
      await fetchClubData();
    } catch (error) {
      console.error('❌ Error al guardar:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo guardar la información',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building className="h-8 w-8" />
          Configuración del Club
        </h1>
        <p className="text-muted-foreground mt-2">
          Administra la información y apariencia de tu club
        </p>
      </div>

      <div className="space-y-6">
        {/* Logo del Club */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Logo del Club
            </CardTitle>
            <CardDescription>
              Sube el logo que aparecerá en la barra lateral y en la página informativa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0">
                {logoPreview ? (
                  <div className="w-32 h-32 rounded-lg border-2 border-gray-200 overflow-hidden bg-white flex items-center justify-center">
                    <img 
                      src={logoPreview} 
                      alt="Logo preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors w-fit">
                    <Upload className="h-4 w-4" />
                    Subir Logo
                  </div>
                </Label>
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Formatos: JPG, PNG, SVG. Tamaño recomendado: 512x512px
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Imagen de Fondo (Hero) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Imagen de Fondo
            </CardTitle>
            <CardDescription>
              Imagen que aparecerá detrás del logo en la página informativa del club
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="w-full">
                {heroPreview ? (
                  <div className="w-full h-48 rounded-lg border-2 border-gray-200 overflow-hidden bg-white">
                    <img 
                      src={heroPreview} 
                      alt="Hero preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Sin imagen de fondo</p>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="hero-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors w-fit">
                    <Upload className="h-4 w-4" />
                    Subir Imagen de Fondo
                  </div>
                </Label>
                <Input
                  id="hero-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleHeroImageUpload}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Formatos: JPG, PNG. Tamaño recomendado: 1920x600px (16:5)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información del Club */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Club</CardTitle>
            <CardDescription>
              Datos que aparecen en la página informativa del club
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Building className="h-4 w-4" />
                Nombre del Club
              </Label>
              <Input
                value={clubData.name}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">
                El nombre del club solo puede ser modificado por el Super Administrador
              </p>
            </div>

            <div>
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Dirección
              </Label>
              <Input
                id="address"
                value={clubData.address}
                onChange={(e) => setClubData({ ...clubData, address: e.target.value })}
                placeholder="Dirección del club"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Esta dirección aparecerá en la página informativa del club
              </p>
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={clubData.description}
                onChange={(e) => setClubData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe tu club, sus instalaciones y servicios..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Esta descripción aparecerá en la página informativa del club
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Datos de Contacto */}
        <Card>
          <CardHeader>
            <CardTitle>Datos de Contacto</CardTitle>
            <CardDescription>
              Información para que los usuarios puedan contactarte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Teléfono
                </Label>
                <Input
                  id="phone"
                  value={clubData.phone}
                  onChange={(e) => setClubData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+34 XXX XXX XXX"
                />
              </div>

              <div>
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={clubData.email}
                  onChange={(e) => setClubData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="info@tuclub.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Sitio Web
              </Label>
              <Input
                id="website"
                value={clubData.website}
                onChange={(e) => setClubData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://tuclub.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Botones de Acción */}
        <div className="flex gap-4 justify-end">
          <Button
            variant="outline"
            onClick={fetchClubData}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>

        {/* Preview Link */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Vista Previa</p>
                <p className="text-sm text-muted-foreground">
                  Los cambios se verán reflejados en la página informativa del club
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => window.open('/club', '_blank')}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Ver Página
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
