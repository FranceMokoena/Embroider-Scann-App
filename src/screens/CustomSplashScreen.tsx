// src/screens/CustomSplashScreen.tsx
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Animated, Easing, Dimensions, ImageSourcePropType } from 'react-native';

interface CustomSplashScreenProps {
  onFinish: () => void;
}

export default function CustomSplashScreen({ onFinish }: CustomSplashScreenProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Your GIF size (adjust if your GIF has different dimensions)
  const GIF_WIDTH = 200;
  const GIF_HEIGHT = 200;

  // Calculate scale required to fill the screen fully (width and height)
  const scaleX = screenWidth / GIF_WIDTH;
  const scaleY = screenHeight / GIF_HEIGHT;

  // Use the bigger scale to cover entire screen
  const finalScale = Math.max(scaleX, scaleY);

  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: finalScale,
      duration: 7000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      onFinish();
    }, 7000); // 15 seconds splash duration

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../../assets/Good.gif') as ImageSourcePropType}
        style={[styles.gif, { transform: [{ scale: scaleAnim }] }]}
        resizeMode="contain"
      />
      <Text style={styles.text}>
        Embroidery-Tech, The Professional Screen Management
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // match your brand color
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  gif: {
    width: 200,
    height: 200,
  },
  text: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
});
