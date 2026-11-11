
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

export default function TestBannerAd() {
  return (
    <View style={styles.container}>
      <BannerAd
        unitId={TestIds.BANNER}
        size={BannerAdSize.BANNER}
        onAdFailedToLoad={(error) => console.warn('Test banner failed to load:', error)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', minHeight: 66, paddingVertical: 8, backgroundColor: '#F5F7F5' },
});
