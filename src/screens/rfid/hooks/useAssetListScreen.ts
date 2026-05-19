import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { ApiError } from '../../../config/api';
import {
  AssetRecord,
  deleteAssetById,
  fetchAssetsByStatus,
  getAssetDisplayName,
  getAssetId,
} from '../../../services/assetApi';
import { exportAssetsToPdf } from '../../../utils/assetPdfExport';

type UseAssetListScreenOptions = {
  statusFilter: string;
  exportTitle: string;
  reviewMessageTemplate: (count: number) => string;
};

export function useAssetListScreen({
  statusFilter,
  exportTitle,
  reviewMessageTemplate,
}: UseAssetListScreenOptions) {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const selectedAsset = useMemo(
    () => assets.find(asset => getAssetId(asset) === selectedAssetId) ?? null,
    [assets, selectedAssetId],
  );

  const loadAssets = useCallback(async () => {
    setLoading(true);

    try {
      const nextAssets = await fetchAssetsByStatus(statusFilter);
      setAssets(nextAssets);
      setSelectedAssetId(previous => {
        if (!previous) {
          return previous;
        }

        return nextAssets.some(asset => getAssetId(asset) === previous) ? previous : null;
      });
    } catch (error) {
      console.error(`Failed to load assets (${statusFilter})`, error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      await loadAssets();
    } finally {
      setRefreshing(false);
    }
  };

  const requireSelectedAsset = () => {
    if (!selectedAsset) {
      Alert.alert(
        'No Asset Selected',
        'Tap a row in the table to select an asset before using Delete or Export.',
      );
      return null;
    }

    return selectedAsset;
  };

  const handleSelectAsset = (asset: AssetRecord) => {
    const assetId = getAssetId(asset);
    if (!assetId) {
      return;
    }

    setSelectedAssetId(previous => (previous === assetId ? null : assetId));
  };

  const isAssetSelected = (asset: AssetRecord) => getAssetId(asset) === selectedAssetId;

  const handleDeletePress = () => {
    if (!requireSelectedAsset()) {
      return;
    }

    setDeleteModalVisible(true);
  };

  const handleExportPress = () => {
    if (!requireSelectedAsset()) {
      return;
    }

    setExportModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedAsset) {
      return;
    }

    const assetId = getAssetId(selectedAsset);
    if (!assetId) {
      Alert.alert('Delete Failed', 'Selected asset does not have a valid identifier.');
      return;
    }

    setIsDeleting(true);

    try {
      await deleteAssetById(assetId);
      setDeleteModalVisible(false);
      setSelectedAssetId(null);
      await loadAssets();
      Alert.alert('Asset Deleted', `${getAssetDisplayName(selectedAsset)} was removed successfully.`);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Failed to delete asset.';

      Alert.alert('Delete Failed', message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmExport = async () => {
    if (!selectedAsset) {
      return;
    }

    setIsExporting(true);

    try {
      await exportAssetsToPdf({
        title: exportTitle,
        statusLabel: selectedAsset.status || statusFilter,
        assets: [selectedAsset],
      });
      setExportModalVisible(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate export PDF.';

      Alert.alert('Export Failed', message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendForStatusReview = () => {
    setReviewMessage(reviewMessageTemplate(assets.length));
  };

  return {
    assets,
    loading,
    refreshing,
    reviewMessage,
    setReviewMessage,
    selectedAsset,
    deleteModalVisible,
    exportModalVisible,
    isDeleting,
    isExporting,
    setDeleteModalVisible,
    setExportModalVisible,
    loadAssets,
    onRefresh,
    handleSelectAsset,
    isAssetSelected,
    handleDeletePress,
    handleExportPress,
    handleConfirmDelete,
    handleConfirmExport,
    handleSendForStatusReview,
  };
}
