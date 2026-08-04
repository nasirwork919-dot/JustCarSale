/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vehicle } from '../types';

export interface BackendVehiclePhoto {
  id: string;
  url: string;
  isPrimary: boolean;
  order: number;
}

export interface BackendSeller {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string | null;
  avatar?: string | null;
}

export interface BackendVehicle {
  id: string;
  sellerId: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  fuelType: string;
  transmission: string;
  color: string;
  bodyType: string;
  engineSize?: number | null;
  power?: number | null;
  price: number;
  currency: string;
  country: string;
  city: string;
  status: 'ACTIVE' | 'SOLD' | 'RESERVED' | 'FLAGGED' | 'PENDING_INSPECTION' | 'DELETED' | string;
  condition: 'NEW' | 'USED' | 'DAMAGED' | 'SALVAGE' | string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
  photos?: BackendVehiclePhoto[];
  seller?: BackendSeller;
}

const STATUS_MAP: Record<string, Vehicle['status']> = {
  ACTIVE: 'Available',
  RESERVED: 'Reserved',
  SOLD: 'Sold',
  PENDING_INSPECTION: 'Pending Inspection',
  FLAGGED: 'Reserved',
  DELETED: 'Sold',
};

const CONDITION_MAP: Record<string, NonNullable<Vehicle['condition']>> = {
  NEW: 'Excellent',
  USED: 'Good',
  DAMAGED: 'Damaged',
  SALVAGE: 'Damaged',
};

// Real, visually-verified photos per make — used only as a last-resort
// fallback for a vehicle with zero uploaded photos, so it at least shows
// a car of the right brand instead of an arbitrary unrelated stock photo.
const FALLBACK_PHOTO_BY_MAKE: Record<string, string> = {
  Toyota: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb',
  Honda: 'https://images.unsplash.com/photo-1754502167978-356d08d53dd6',
  Ford: 'https://images.unsplash.com/photo-1614218110929-caa460524fc1',
  BMW: 'https://images.unsplash.com/photo-1627867407010-8a5c65856346',
  'Mercedes-Benz': 'https://images.unsplash.com/photo-1615228939096-9ead6c74008e',
  Volkswagen: 'https://images.unsplash.com/photo-1760688964516-1012e0ece2a8',
  Audi: 'https://images.unsplash.com/photo-1540066019607-e5f69323a8dc',
  Nissan: 'https://images.unsplash.com/photo-1551817280-6d59c77ce1b8',
  Hyundai: 'https://images.unsplash.com/photo-1645145214095-84fca73e0cc5',
  Kia: 'https://images.unsplash.com/photo-1688893287874-ac7fbd686c24',
};
const GENERIC_FALLBACK_PHOTO = 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb';

export interface MappedVehicle extends Vehicle {
  __id: string;
  __sellerId: string;
  __seller?: BackendSeller;
  __raw: BackendVehicle;
}

export function mapBackendVehicle(v: BackendVehicle): MappedVehicle {
  const photos = (v.photos || []).slice().sort((a, b) => a.order - b.order);
  const fallbackPhoto = FALLBACK_PHOTO_BY_MAKE[v.make] || GENERIC_FALLBACK_PHOTO;
  const images = photos.length > 0 ? photos.map((p) => p.url) : [`${fallbackPhoto}?auto=format&fit=crop&w=1200&q=80`];

  return {
    vin: v.vin,
    year: v.year,
    make: v.make,
    model: v.model,
    trim: v.bodyType || '',
    price: v.price,
    mileage: v.mileage,
    engine: v.engineSize ? `${v.engineSize}L` : '—',
    transmission: v.transmission,
    driveType: v.fuelType,
    location: [v.city, v.country].filter(Boolean).join(', '),
    extColor: v.color,
    intColor: v.color,
    images,
    certified: false,
    status: STATUS_MAP[v.status] || 'Available',
    riskScore: v.status === 'FLAGGED' ? 'High' : 'Low',
    valuation: v.price,
    marketPrice: v.price,
    condition: CONDITION_MAP[v.condition] || 'Good',
    description: v.description || undefined,
    __id: v.id,
    __sellerId: v.sellerId,
    __seller: v.seller,
    __raw: v,
  };
}

export function mapBackendVehicles(list: BackendVehicle[]): MappedVehicle[] {
  return (list || []).map(mapBackendVehicle);
}
