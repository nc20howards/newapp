// services/systemSettingsService.ts
import { IpWhitelistSettings } from '../types';

const UNEB_SERVICE_FEE_AMOUNT_KEY = '360_smart_school_uneb_fee_amount';
const UNEB_VERIFICATION_ENABLED_KEY = '360_smart_school_uneb_verification_enabled';
const TWO_FACTOR_AUTH_ENABLED_KEY = '360_smart_school_2fa_enabled';
const IP_WHITELIST_SETTINGS_KEY = '360_smart_school_ip_whitelist_settings';


/**
 * Retrieves the amount for the UNEB service fee.
 * @returns {number} The fee amount. Defaults to 1000.
 */
export const getUnebServiceFeeAmount = (): number => {
    const amount = localStorage.getItem(UNEB_SERVICE_FEE_AMOUNT_KEY);
    return amount ? parseInt(amount, 10) : 1000;
};

/**
 * Sets the amount for the UNEB service fee.
 * @param {number} amount - The new fee amount to set.
 */
export const setUnebServiceFeeAmount = (amount: number): void => {
    localStorage.setItem(UNEB_SERVICE_FEE_AMOUNT_KEY, String(amount));
};

/**
 * Checks if automatic UNEB result verification is enabled.
 * @returns {boolean} True if enabled, false otherwise. Defaults to false.
 */
export const isUnebVerificationEnabled = (): boolean => {
    const status = localStorage.getItem(UNEB_VERIFICATION_ENABLED_KEY);
    return status === 'true';
};

/**
 * Sets the status for automatic UNEB result verification.
 * @param {boolean} isEnabled - The new status to set.
 */
export const setUnebVerificationEnabled = (isEnabled: boolean): void => {
    localStorage.setItem(UNEB_VERIFICATION_ENABLED_KEY, String(isEnabled));
};

/**
 * Checks if Two-Factor Authentication is enabled.
 * @returns {boolean} True if enabled, false otherwise. Defaults to false.
 */
export const is2faEnabled = (): boolean => {
    const status = localStorage.getItem(TWO_FACTOR_AUTH_ENABLED_KEY);
    return status === 'true';
};

/**
 * Sets the status for Two-Factor Authentication.
 * @param {boolean} isEnabled - The new status to set.
 */
export const set2faEnabled = (isEnabled: boolean): void => {
    localStorage.setItem(TWO_FACTOR_AUTH_ENABLED_KEY, String(isEnabled));
};

/**
 * Retrieves the IP Whitelist settings.
 * @returns {IpWhitelistSettings} The settings object.
 */
export const getIpWhitelistSettings = (): IpWhitelistSettings => {
    const settings = localStorage.getItem(IP_WHITELIST_SETTINGS_KEY);
    const defaults: IpWhitelistSettings = {
        enabled: false,
        allowedIps: [],
        vpnAllowed: false,
    };
    return settings ? { ...defaults, ...JSON.parse(settings) } : defaults;
};

/**
 * Saves the IP Whitelist settings.
 * @param {IpWhitelistSettings} settings - The new settings object to save.
 */
export const saveIpWhitelistSettings = (settings: IpWhitelistSettings): void => {
    localStorage.setItem(IP_WHITELIST_SETTINGS_KEY, JSON.stringify(settings));
};