import { Audio } from 'expo-av';

let soundPromise: Promise<Audio.Sound | null> | null = null;
let lastPlayAttemptAt = 0;

const loadScannerSound = async () => {
  const { sound } = await Audio.Sound.createAsync(
    require('../../assets/SCANNER SOUND.mp3'),
    { shouldPlay: false },
  );

  return sound;
};

export const playRfidScanSound = async () => {
  const now = Date.now();
  if (now - lastPlayAttemptAt < 80) {
    return;
  }
  lastPlayAttemptAt = now;

  try {
    if (!soundPromise) {
      soundPromise = loadScannerSound().catch(error => {
        console.warn('[RFIDScanSound]', 'Failed to load scanner sound', error);
        soundPromise = null;
        return null;
      });
    }

    const sound = await soundPromise;
    if (!sound) {
      return;
    }

    await sound.replayAsync();
  } catch (error) {
    console.warn('[RFIDScanSound]', 'Failed to play scanner sound', error);
  }
};
