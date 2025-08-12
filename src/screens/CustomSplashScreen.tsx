// src/screens/CustomSplashScreen.tsx
import React, { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';

export default function CustomSplashScreen({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 3000); // show GIF for 3 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/Good.gif')}
        style={styles.gif}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // match your brand color
    justifyContent: 'center',
    alignItems: 'center',
  },
  gif: {
    width: 200,
    height: 200,
  },
});
