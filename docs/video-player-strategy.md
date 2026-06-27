# Video Player Strategy

## Why `expo-video` over `expo-av`

- `expo-video` is the modern, native-backed video playback library for Expo and React Native.
- It delegates playback to platform-native codecs and players, which improves performance and reduces battery usage compared to the older JavaScript surface used by `expo-av`.
- The new API provides a better buffering and native controls model, including a dedicated `VideoView` component and `useVideoPlayer` hook.
- Using `expo-video` allows the app to leverage HLS/DASH and platform-level adaptive bitrate behavior through the native video stack.

## Buffering strategy

- The component uses an explicit buffer strategy instead of default buffering.
- `minBufferMs: 5000` ensures at least 5 seconds of buffered content before playback continues.
- `maxBufferMs: 30000` maintains up to 30 seconds of lookahead to reduce rebuffering events during temporary network drops.
- `bufferForPlaybackMs: 2500` delays playback until at least 2.5 seconds of media is ready, preventing short stalls from starting too early.
- `bufferForPlaybackAfterRebufferMs: 5000` requires 5 seconds after a rebuffer to make playback more stable after interruptions.

## Adaptive bitrate note

- `expo-video` can play HLS and DASH content through the native player on iOS and Android.
- When the source is an HLS playlist (`.m3u8`) or DASH manifest, the native player handles adaptive bitrate switching automatically.
- This means the app can benefit from platform-level quality selection without adding a separate ABR layer in JavaScript.

## How to use `OptimizedVideoPlayer`

```tsx
import { OptimizedVideoPlayer } from '@/components/VideoPlayer';

export default function CourseVideoScreen() {
  return (
    <OptimizedVideoPlayer
      uri="https://example.com/path/to/video.mp4"
      autoPlay={true}
      onError={message => console.warn('Video error', message)}
      style={{ width: '100%', aspectRatio: 16 / 9 }}
    />
  );
}
```

## How to read metrics via `useVideoMetrics`

The `useVideoMetrics` hook tracks playback quality signals:

- `loadTime`: milliseconds from mount to the first ready-to-play event.
- `bufferingCount`: number of distinct buffering periods.
- `totalBufferingTime`: total time spent buffering in milliseconds.
- `playbackErrors`: total error count recorded during playback.

The player component also exposes a dev-only overlay via `VideoPlayerMetrics` that renders metrics on top of the video when `__DEV__` is enabled.

## Performance monitoring checklist

- [ ] Install `expo-video` and `expo-keep-awake`.
- [ ] Use `OptimizedVideoPlayer` for media playback instead of legacy `expo-av`.
- [ ] Verify native controls are working on iOS and Android.
- [ ] Validate that buffering overlay appears while the video is loading.
- [ ] Confirm error UI renders for failed playback.
- [ ] Monitor `loadTime`, `bufferingCount`, and `totalBufferingTime` during QA.
- [ ] Ensure `player.release()` is called on unmount to free native resources.
- [ ] Keep the screen awake while playback is active so the user experience is uninterrupted.
