import type { AssetRecord } from '../services/assetApi';

export type VerificationContextStatus =
  | 'verified-current'
  | 'verified-previous'
  | 'pending';

export type VerificationContext = {
  status: VerificationContextStatus;
  label: string;
  assetSection: string;
  latestSection: string | null;
  latestVerifiedAt: string | null;
  latestResult: string | null;
  lastMatchedSection: string | null;
  lastMatchedAt: string | null;
  isVerifiedInCurrentSection: boolean;
};

type VerificationHistoryEntry = NonNullable<AssetRecord['verificationHistory']>[number];

const normalizeText = (value?: string | null) =>
  typeof value === 'string' ? value.trim() : '';

const normalizeSectionKey = (value?: string | null) =>
  normalizeText(value).toLowerCase();

const getTime = (value?: string | null) => {
  if (!value) {
    return Number.NaN;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.NaN : timestamp;
};

const getLatestEntry = (
  entries: VerificationHistoryEntry[],
  predicate: (entry: VerificationHistoryEntry) => boolean,
) =>
  entries.reduce<{ entry: VerificationHistoryEntry | null; index: number }>(
    (latest, entry, index) => {
      if (!predicate(entry)) {
        return latest;
      }

      if (!latest.entry) {
        return { entry, index };
      }

      const latestTime = getTime(latest.entry.verifiedAt);
      const entryTime = getTime(entry.verifiedAt);

      if (!Number.isNaN(entryTime) && (Number.isNaN(latestTime) || entryTime > latestTime)) {
        return { entry, index };
      }

      if (Number.isNaN(entryTime) && Number.isNaN(latestTime) && index > latest.index) {
        return { entry, index };
      }

      return latest;
    },
    { entry: null, index: -1 },
  ).entry;

export const getAssetCurrentSection = (asset?: AssetRecord | null) =>
  normalizeText(asset?.currentSection || asset?.section);

export const getLatestVerificationEntry = (asset?: AssetRecord | null) =>
  getLatestEntry(asset?.verificationHistory || [], () => true);

export const getLatestMatchedVerificationEntry = (asset?: AssetRecord | null) =>
  getLatestEntry(
    asset?.verificationHistory || [],
    entry => normalizeText(entry.result).toLowerCase() === 'matched',
  );

export const getVerificationContext = (asset?: AssetRecord | null): VerificationContext => {
  const assetSection = getAssetCurrentSection(asset);
  const latestEntry = getLatestVerificationEntry(asset);
  const latestSection = normalizeText(latestEntry?.section) || null;
  const latestResult = normalizeText(latestEntry?.result) || null;
  const latestVerifiedAt = latestEntry?.verifiedAt || null;
  const latestMatched = getLatestMatchedVerificationEntry(asset);
  const lastMatchedSection = normalizeText(latestMatched?.section) || null;
  const lastMatchedAt = latestMatched?.verifiedAt || null;
  const latestIsMatched = latestResult.toLowerCase() === 'matched';
  const rawVerificationStatus = normalizeText(asset?.verificationStatus).toLowerCase();
  const latestMatchesCurrentSection =
    latestIsMatched
    && Boolean(assetSection)
    && normalizeSectionKey(latestSection) === normalizeSectionKey(assetSection);

  if (latestMatchesCurrentSection) {
    return {
      status: 'verified-current',
      label: 'Verified In Current Section',
      assetSection,
      latestSection,
      latestVerifiedAt,
      latestResult,
      lastMatchedSection,
      lastMatchedAt,
      isVerifiedInCurrentSection: true,
    };
  }

  if (latestIsMatched && latestSection && rawVerificationStatus === 'verified') {
    return {
      status: 'verified-previous',
      label: 'Verified In Previous Section',
      assetSection,
      latestSection,
      latestVerifiedAt,
      latestResult,
      lastMatchedSection,
      lastMatchedAt,
      isVerifiedInCurrentSection: false,
    };
  }

  return {
    status: 'pending',
    label: 'Pending Verification',
    assetSection,
    latestSection,
    latestVerifiedAt,
    latestResult,
    lastMatchedSection,
    lastMatchedAt,
    isVerifiedInCurrentSection: false,
  };
};
