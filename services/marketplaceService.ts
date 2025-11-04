// services/marketplaceService.ts
import { MarketplaceListing, MarketplaceMedia } from '../types';

const LISTINGS_KEY = '360_smart_school_marketplace_listings';

export const getListings = (): MarketplaceListing[] => {
    const data = localStorage.getItem(LISTINGS_KEY);
    // Sort by creation date, newest first
    return data ? JSON.parse(data).sort((a: MarketplaceListing, b: MarketplaceListing) => b.createdAt - a.createdAt) : [];
};

const saveListings = (listings: MarketplaceListing[]) => {
    localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
};

export const getListingById = (listingId: string): MarketplaceListing | null => {
    const listings = getListings();
    return listings.find(l => l.id === listingId) || null;
};

export const createListing = (data: Omit<MarketplaceListing, 'id' | 'createdAt'>): MarketplaceListing => {
    const listings = getListings();
    const newListing: MarketplaceListing = {
        ...data,
        id: `listing_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        createdAt: Date.now(),
    };
    // Use unshift to add to the beginning so it appears first
    listings.unshift(newListing);
    saveListings(listings);
    return newListing;
};

export const updateListing = (listingId: string, data: Partial<Omit<MarketplaceListing, 'id' | 'sellerId' | 'createdAt' | 'sellerName' | 'sellerAvatar'>>): MarketplaceListing => {
    const listings = getListings();
    const index = listings.findIndex(l => l.id === listingId);
    if (index === -1) throw new Error("Listing not found.");
    listings[index] = { ...listings[index], ...data };
    saveListings(listings);
    return listings[index];
};

export const deleteListing = (listingId: string): void => {
    const listings = getListings();
    const filtered = listings.filter(l => l.id !== listingId);
    saveListings(filtered);
};