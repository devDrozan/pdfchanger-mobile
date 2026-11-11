import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const bannerUnitId = __DEV__ ? TestIds.ADAPTIVE_BANNER : 'ca-app-pub-7752680457121386/6757779681';

export default function MergeTestBannerAd() {
  return (
    <View style={styles.container}>
      <BannerAd
        unitId={bannerUnitId}
        size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={() => console.info('Merge banner loaded')}
        onAdFailedToLoad={(error) => console.warn('Merge banner failed to load:', error)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', minHeight: 100, alignItems: 'center', justifyContent: 'center' },
});
