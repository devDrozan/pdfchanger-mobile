
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const bannerUnitId = __DEV__ ? TestIds.BANNER : 'ca-app-pub-7752680457121386/6757779681';

export default function TestBannerAd() {
  return (
    <View style={styles.container}>
      <BannerAd
        unitId={bannerUnitId}
        size={BannerAdSize.BANNER}
        onAdFailedToLoad={(error) => console.warn('Library banner failed to load:', error)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', minHeight: 66, paddingVertical: 8, backgroundColor: '#F5F7F5' },
});
