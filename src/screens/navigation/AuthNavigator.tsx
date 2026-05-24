//AUTHNAVIGATOR
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Both screens are in src/screens, so go up one level from navigation folder, then into screens folder
import LoginScreen from '../LoginScreen';

import HomeScreen from './HomeScreen';
import CameraScanner from '../CameraScanner';
import AddAsset from '../rfid/AddAsset';
import AssignTag from '../rfid/AssignTag';
import VerifyAsset from '../rfid/VerifyAsset';
import SearchAsset from '../rfid/SearchAsset';
import SearchAssetScreen from '../rfid/SearchAssetScreen';
import LocateAssetScreen from '../rfid/LocateAssetScreen';
import AllAssetsScreen from '../rfid/AllAssetsScreen';
import RFIDHomeScreen from '../rfid/RFIDHomeScreen';
import HealthyAssetsScreen from '../rfid/HealthyAssetsScreen';
import RepairableAssetsScreen from '../rfid/RepairableAssetsScreen';
import BeyondRepairAssetsScreen from '../rfid/BeyondRepairAssetsScreen';
import SectionsScreen from '../rfid/SectionsScreen';
import SectionDetailScreen from '../rfid/SectionDetailScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator 
      id={undefined}
      initialRouteName="Login" 
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="CameraScanner" component={CameraScanner} />
      <Stack.Screen name="RFIDHomeScreen" component={RFIDHomeScreen} />
      <Stack.Screen name="RfidAddAsset" component={AddAsset} />
      <Stack.Screen name="RfidAssignTag" component={AssignTag} />
      <Stack.Screen name="RfidVerifyAsset" component={VerifyAsset} />
      <Stack.Screen name="RfidSearchAsset" component={SearchAsset} />
      <Stack.Screen name="SearchAssetScreen" component={SearchAssetScreen} />
      <Stack.Screen name="RfidLocateAsset" component={LocateAssetScreen} />
      <Stack.Screen name="AllAssetsScreen" component={AllAssetsScreen} />
      <Stack.Screen name="HealthyAssetsScreen" component={HealthyAssetsScreen} />
      <Stack.Screen name="RepairableAssetsScreen" component={RepairableAssetsScreen} />
      <Stack.Screen name="BeyondRepairAssetsScreen" component={BeyondRepairAssetsScreen} />
      <Stack.Screen name="SectionsScreen" component={SectionsScreen} />
      <Stack.Screen name="SectionDetailScreen" component={SectionDetailScreen} />
    </Stack.Navigator>
  );
}
