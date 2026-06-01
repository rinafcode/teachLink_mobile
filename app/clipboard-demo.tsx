import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Clipboard, Copy, FileText, Zap, Sparkles, ShieldAlert } from 'lucide-react-native';

import { AppText } from '@/components/common/AppText';
import { useOptimizedClipboard } from '@/hooks/useOptimizedClipboard';
import { useDynamicFontSize } from '@/hooks/useDynamicFontSize';

export default function ClipboardDemoScreen() {
  const router = useRouter();
  const { scale } = useDynamicFontSize();
  const [testText, setTestText] = useState('');
  const [pastePreview, setPastePreview] = useState('');
  const [selectedSize, setSelectedSize] = useState<number | null>(null);

  const {
    isCopying,
    isPasting,
    copySuccess,
    error,
    metrics,
    copyToClipboard,
    pasteFromClipboard,
    clearError,
  } = useOptimizedClipboard();

  // Helper to generate a repeating pattern of text to reach target size in bytes/characters
  const generateLargeText = useCallback((sizeKb: number) => {
    setSelectedSize(sizeKb);
    const basePattern = `TeachLink Mobile Optimization - Clipboard Performance Test. Size: ${sizeKb}KB. `;
    const targetLength = sizeKb * 1024;
    let result = '';
    while (result.length < targetLength) {
      result += basePattern;
    }
    const finalText = result.slice(0, targetLength);
    setTestText(finalText);
  }, []);

  const handleCopy = async () => {
    if (!testText) {
      Alert.alert('No Text Generated', 'Please select a text size or write some text first.');
      return;
    }
    const success = await copyToClipboard(testText);
    if (!success && error) {
      Alert.alert('Copy Failed', error.message);
    }
  };

  const handlePaste = async () => {
    const content = await pasteFromClipboard();
    if (content) {
      const preview = content.length > 500 
        ? `${content.substring(0, 500)}...\n\n[Truncated - Total Length: ${content.length.toLocaleString()} characters]`
        : content;
      setPastePreview(preview);
    } else if (error) {
      Alert.alert('Paste Failed', error.message);
    } else {
      setPastePreview('[Clipboard was empty or failed to read]');
    }
  };

  const formatTime = (ms: number | undefined) => {
    if (ms === undefined) return '0.00 ms';
    return `${ms.toFixed(2)} ms`;
  };

  const formatSize = (chars: number | undefined) => {
    if (chars === undefined) return '0 B';
    const kb = chars / 1024;
    return `${kb.toFixed(1)} KB (${chars.toLocaleString()} chars)`;
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center border-b border-gray-200 bg-white px-4 py-3.5 dark:border-gray-800 dark:bg-gray-900">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
        >
          <ArrowLeft size={scale(20)} className="text-gray-900 dark:text-white" />
        </TouchableOpacity>

        <View className="flex-1">
          <AppText style={{ fontSize: 20 }} className="font-bold text-gray-900 dark:text-white">
            Clipboard Optimizer
          </AppText>
          <AppText style={{ fontSize: 12 }} className="text-gray-500 dark:text-gray-400">
            Profile and test large text operations
          </AppText>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Intro Card */}
        <View className="mb-6 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-5 shadow-md">
          <View className="flex-row items-center gap-2 mb-2">
            <Sparkles size={20} color="white" />
            <AppText className="text-base font-bold text-white">Async & Responsiveness</AppText>
          </View>
          <AppText className="text-sm text-cyan-50 leading-5">
            This module optimizes large text clipboard transfers (100KB - 2MB+) to prevent freezing the React Native JavaScript thread. We use asynchronous native APIs combined with InteractionManager scheduling to keep your UI alive and animations playing smoothly.
          </AppText>
        </View>

        {/* Generate Text Card */}
        <View className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-800 shadow-sm">
          <AppText className="mb-3 text-base font-bold text-gray-900 dark:text-white">
            1. Generate Large Text Payload
          </AppText>
          <AppText className="mb-4 text-xs text-gray-500 dark:text-gray-400">
            Select a text payload size to simulate copy-pasting massive course materials, reports, or logs.
          </AppText>

          <View className="flex-row flex-wrap gap-2 mb-4">
            {[100, 500, 1000, 2000].map((size) => {
              const label = size >= 1000 ? `${(size/1000).toFixed(0)}MB` : `${size}KB`;
              const active = selectedSize === size;
              return (
                <TouchableOpacity
                  key={size}
                  activeOpacity={0.7}
                  onPress={() => generateLargeText(size)}
                  className={`flex-1 min-w-[70px] items-center justify-center rounded-xl py-2.5 border ${
                    active 
                      ? 'bg-cyan-500 border-cyan-500 dark:bg-cyan-600 dark:border-cyan-600' 
                      : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900'
                  }`}
                >
                  <AppText className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    {label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            multiline
            editable={!isCopying && !isPasting}
            value={testText}
            onChangeText={(txt) => {
              setTestText(txt);
              setSelectedSize(null);
            }}
            placeholder="Type custom text here, or generate text using the buttons above..."
            placeholderTextColor="#9CA3AF"
            style={{ minHeight: 80, maxHeight: 150 }}
            className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          />

          <View className="mt-3 flex-row items-center justify-between">
            <AppText className="text-xs text-gray-500 dark:text-gray-400">
              Payload size: {formatSize(testText.length)}
            </AppText>
            {testText.length > 0 && (
              <TouchableOpacity onPress={() => { setTestText(''); setSelectedSize(null); }}>
                <AppText className="text-xs text-red-500 font-semibold">Clear</AppText>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Copy / Paste Operations */}
        <View className="mb-6 flex-row gap-4">
          {/* Copy Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={isCopying || isPasting}
            onPress={handleCopy}
            className={`flex-1 flex-row items-center justify-center rounded-2xl py-4 shadow-sm ${
              isCopying ? 'bg-cyan-100 dark:bg-cyan-950' : 'bg-cyan-500 dark:bg-cyan-600'
            }`}
          >
            {isCopying ? (
              <ActivityIndicator color="#06b6d4" className="mr-2" />
            ) : (
              <Copy size={16} color="white" className="mr-2" />
            )}
            <AppText className="font-semibold text-white">
              {isCopying ? 'Copying Async...' : copySuccess ? 'Copied! ✓' : 'Copy Async'}
            </AppText>
          </TouchableOpacity>

          {/* Paste Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={isCopying || isPasting}
            onPress={handlePaste}
            className={`flex-1 flex-row items-center justify-center rounded-2xl py-4 border shadow-sm ${
              isPasting 
                ? 'bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700' 
                : 'bg-white border-cyan-500 dark:bg-gray-800 dark:border-cyan-600'
            }`}
          >
            {isPasting ? (
              <ActivityIndicator color="#06b6d4" className="mr-2" />
            ) : (
              <Clipboard size={16} className="text-cyan-500 mr-2 dark:text-cyan-400" />
            )}
            <AppText className="font-semibold text-cyan-500 dark:text-cyan-400">
              {isPasting ? 'Pasting...' : 'Paste Async'}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Telemetry/Metrics Panel */}
        {metrics && (
          <View className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-800 shadow-sm">
            <View className="flex-row items-center gap-2 mb-3">
              <Zap size={16} className="text-yellow-500" />
              <AppText className="text-sm font-bold text-gray-900 dark:text-white">Performance Telemetry</AppText>
            </View>

            <View className="space-y-2">
              <View className="flex-row justify-between border-b border-gray-100 py-2 dark:border-gray-700">
                <AppText className="text-xs text-gray-500 dark:text-gray-400">Operation Duration</AppText>
                <AppText className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  {formatTime(metrics.duration)}
                </AppText>
              </View>

              <View className="flex-row justify-between border-b border-gray-100 py-2 dark:border-gray-700">
                <AppText className="text-xs text-gray-500 dark:text-gray-400">Text Payload Size</AppText>
                <AppText className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  {formatSize(metrics.textSize)}
                </AppText>
              </View>

              <View className="flex-row justify-between py-2">
                <AppText className="text-xs text-gray-500 dark:text-gray-400">Haptics Triggered</AppText>
                <AppText className="text-xs font-bold text-green-500">
                  Yes (Success Vibration)
                </AppText>
              </View>
            </View>
          </View>
        )}

        {/* Paste Result Preview */}
        <View className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-800 shadow-sm">
          <View className="flex-row items-center gap-2 mb-3">
            <FileText size={16} className="text-gray-500" />
            <AppText className="text-sm font-bold text-gray-900 dark:text-white">Pasted Content Preview</AppText>
          </View>

          <TextInput
            multiline
            editable={false}
            value={pastePreview}
            placeholder="Pasted clipboard content will be previewed here..."
            placeholderTextColor="#9CA3AF"
            style={{ minHeight: 120 }}
            className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
          />
        </View>

        {/* Info notice */}
        <View className="mt-6 flex-row items-start gap-2.5 rounded-xl bg-orange-50 p-4 dark:bg-orange-950/20">
          <ShieldAlert size={16} className="text-orange-500 mt-0.5" />
          <View className="flex-1">
            <AppText className="text-xs font-semibold text-orange-800 dark:text-orange-300">
              Native Bridge Caution
            </AppText>
            <AppText className="text-[11px] leading-4 text-orange-700 dark:text-orange-400 mt-0.5">
              Copying files or text larger than 2MB may trigger React Native platform warnings due to IPC size limits. Try simulating with 100KB first, then scale up to see how the async handlers keep your screen responsive.
            </AppText>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
