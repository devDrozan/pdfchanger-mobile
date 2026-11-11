import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

export default function MergeTestBannerAd() {
  return (
    <View style={styles.container}>
      <BannerAd
        unitId={TestIds.ADAPTIVE_BANNER}
        size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={() => console.info('Merge test banner loaded')}
        onAdFailedToLoad={(error) => console.warn('Merge test banner failed to load:', error)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', minHeight: 100, alignItems: 'center', justifyContent: 'center' },
});
