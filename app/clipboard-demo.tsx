import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Clipboard,
  Copy,
  FileText,
  Zap,
  Sparkles,
  ShieldAlert,
  BarChart2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react-native';
import React, { useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/common/AppText';
import { useDynamicFontSize } from '@/hooks/useDynamicFontSize';
import { useOptimizedClipboard } from '@/hooks/useOptimizedClipboard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BenchmarkEntry {
  id: string;
  operation: 'copy' | 'paste';
  sizeKb: number;
  durationMs: number;
  throughputKbps: number;
  success: boolean;
  timestamp: Date;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const MetricRow = ({
  label,
  value,
  accent,
  last,
}: {
  label: string;
  value: string;
  accent?: boolean;
  last?: boolean;
}) => {
  return (
    <View
      className={`flex-row items-center justify-between py-2.5 ${
        !last ? 'border-b border-gray-100 dark:border-gray-700' : ''
      }`}
    >
      <AppText className="text-xs text-gray-500 dark:text-gray-400">{label}</AppText>
      <AppText
        className={`text-xs font-bold ${
          accent ? 'text-cyan-500 dark:text-cyan-400' : 'text-gray-800 dark:text-gray-200'
        }`}
      >
        {value}
      </AppText>
    </View>
  );
}

const BenchmarkRow = ({ entry }: { entry: BenchmarkEntry }) => {
  const sizeLabel =
    entry.sizeKb >= 1000
      ? `${(entry.sizeKb / 1000).toFixed(1)} MB`
      : `${entry.sizeKb} KB`;

  return (
    <View className="flex-row items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700">
      {/* Op badge */}
      <View
        className={`h-7 w-7 items-center justify-center rounded-lg ${
          entry.operation === 'copy'
            ? 'bg-cyan-100 dark:bg-cyan-900/40'
            : 'bg-violet-100 dark:bg-violet-900/40'
        }`}
      >
        {entry.operation === 'copy' ? (
          <Copy size={12} color="#06b6d4" />
        ) : (
          <Clipboard size={12} color="#8b5cf6" />
        )}
      </View>

      {/* Details */}
      <View className="flex-1">
        <AppText className="text-xs font-semibold text-gray-800 dark:text-gray-200 capitalize">
          {entry.operation} · {sizeLabel}
        </AppText>
        <AppText className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
          {entry.throughputKbps.toFixed(0)} KB/s · {entry.durationMs.toFixed(1)} ms
        </AppText>
      </View>

      {/* Status */}
      {entry.success ? (
        <CheckCircle2 size={14} color="#22c55e" />
      ) : (
        <XCircle size={14} color="#ef4444" />
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ClipboardDemoScreen() {
  const router = useRouter();
  const { scale } = useDynamicFontSize();
  const [testText, setTestText] = useState('');
  const [pastePreview, setPastePreview] = useState('');
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'test' | 'history'>('test');

  // Success flash animation
  const flashAnim = useRef(new Animated.Value(0)).current;

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

  // ── Helpers ────────────────────────────────────────────────────────────────

  const generateLargeText = useCallback((sizeKb: number) => {
    setSelectedSize(sizeKb);
    const basePattern = `TeachLink Mobile Optimization — Clipboard Performance Test. Size: ${sizeKb}KB. `;
    const targetLength = sizeKb * 1024;
    let result = '';
    while (result.length < targetLength) result += basePattern;
    setTestText(result.slice(0, targetLength));
  }, []);

  const triggerFlash = () => {
    flashAnim.setValue(1);
    Animated.timing(flashAnim, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
    }).start();
  };

  const recordBenchmark = (
    operation: 'copy' | 'paste',
    sizeKb: number,
    durationMs: number,
    success: boolean
  ) => {
    const throughputKbps = durationMs > 0 ? (sizeKb / durationMs) * 1000 : 0;
    const entry: BenchmarkEntry = {
      id: `${Date.now()}-${Math.random()}`,
      operation,
      sizeKb,
      durationMs,
      throughputKbps,
      success,
      timestamp: new Date(),
    };
    setBenchmarkHistory((prev) => [entry, ...prev].slice(0, 20));
  };

  const formatTime = (ms: number | undefined) =>
    ms === undefined ? '—' : `${ms.toFixed(2)} ms`;

  const formatSize = (chars: number | undefined) => {
    if (chars === undefined) return '—';
    const kb = chars / 1024;
    return kb >= 1000
      ? `${(kb / 1000).toFixed(2)} MB (${chars.toLocaleString()} chars)`
      : `${kb.toFixed(1)} KB (${chars.toLocaleString()} chars)`;
  };

  const avgThroughput =
    benchmarkHistory.length > 0
      ? benchmarkHistory.reduce((s, e) => s + e.throughputKbps, 0) /
        benchmarkHistory.length
      : null;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCopy = async () => {
    if (!testText) {
      Alert.alert('No Content', 'Select a size or type something in the text area first.');
      return;
    }
    clearError?.();
    const t0 = Date.now();
    const success = await copyToClipboard(testText);
    const duration = Date.now() - t0;
    const sizeKb = testText.length / 1024;
    recordBenchmark('copy', sizeKb, duration, !!success);
    if (success) {
      triggerFlash();
    } else if (error) {
      Alert.alert('Copy Failed', error.message);
    }
  };

  const handlePaste = async () => {
    clearError?.();
    const t0 = Date.now();
    const content = await pasteFromClipboard();
    const duration = Date.now() - t0;
    if (content) {
      const sizeKb = content.length / 1024;
      recordBenchmark('paste', sizeKb, duration, true);
      const preview =
        content.length > 500
          ? `${content.substring(0, 500)}…\n\n[Showing first 500 of ${content.length.toLocaleString()} characters]`
          : content;
      setPastePreview(preview);
      triggerFlash();
    } else if (error) {
      recordBenchmark('paste', 0, duration, false);
      Alert.alert('Paste Failed', error.message);
    } else {
      setPastePreview('[Clipboard was empty or could not be read]');
    }
  };

  const SIZE_OPTIONS = [
    { kb: 100, label: '100 KB' },
    { kb: 500, label: '500 KB' },
    { kb: 1000, label: '1 MB' },
    { kb: 2000, label: '2 MB' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      {/* ── Header ── */}
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
            Benchmark large text transfers
          </AppText>
        </View>

        {/* Live throughput badge */}
        {avgThroughput !== null && (
          <View className="items-center rounded-xl bg-cyan-50 px-3 py-1.5 dark:bg-cyan-900/30">
            <AppText className="text-[10px] text-cyan-500 dark:text-cyan-400 font-medium">
              avg speed
            </AppText>
            <AppText className="text-xs font-bold text-cyan-600 dark:text-cyan-300">
              {avgThroughput >= 1000
                ? `${(avgThroughput / 1000).toFixed(1)} MB/s`
                : `${avgThroughput.toFixed(0)} KB/s`}
            </AppText>
          </View>
        )}
      </View>

      {/* ── Tab bar ── */}
      <View className="flex-row border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {(['test', 'history'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            activeOpacity={0.7}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 items-center py-3 border-b-2 ${
              activeTab === tab
                ? 'border-cyan-500'
                : 'border-transparent'
            }`}
          >
            <AppText
              className={`text-sm font-semibold capitalize ${
                activeTab === tab
                  ? 'text-cyan-500 dark:text-cyan-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {tab === 'test' ? 'Test Pad' : `History${benchmarkHistory.length > 0 ? ` (${benchmarkHistory.length})` : ''}`}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'test' ? (
        <ScrollView
          className="flex-1 px-4 py-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Intro banner ── */}
          <View className="mb-5 overflow-hidden rounded-2xl bg-cyan-500 dark:bg-cyan-700 p-5">
            <View className="flex-row items-center gap-2 mb-1.5">
              <Sparkles size={18} color="white" />
              <AppText className="text-sm font-bold text-white">
                Non-blocking clipboard transfers
              </AppText>
            </View>
            <AppText className="text-xs text-cyan-50 leading-5">
              Async native APIs + InteractionManager scheduling keep animations
              and gestures smooth even while reading or writing 2 MB+ payloads
              across the JS bridge.
            </AppText>
          </View>

          {/* ── Size selector ── */}
          <View className="mb-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-800 shadow-sm">
            <AppText className="mb-1 text-sm font-bold text-gray-900 dark:text-white">
              1 · Choose payload size
            </AppText>
            <AppText className="mb-4 text-xs text-gray-500 dark:text-gray-400">
              Simulate large course materials, exported logs, or report pastes.
            </AppText>

            <View className="flex-row flex-wrap gap-2 mb-4">
              {SIZE_OPTIONS.map(({ kb, label }) => {
                const active = selectedSize === kb;
                return (
                  <TouchableOpacity
                    key={kb}
                    activeOpacity={0.7}
                    onPress={() => generateLargeText(kb)}
                    className={`flex-1 min-w-[70px] items-center justify-center rounded-xl py-2.5 border ${
                      active
                        ? 'bg-cyan-500 border-cyan-500'
                        : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900'
                    }`}
                  >
                    <AppText
                      className={`text-xs font-semibold ${
                        active ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
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
              placeholder="Or type / paste your own text here…"
              placeholderTextColor="#9CA3AF"
              style={{ minHeight: 80, maxHeight: 160 }}
              className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            />

            <View className="mt-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Clock size={11} color="#9CA3AF" />
                <AppText className="text-xs text-gray-400 dark:text-gray-500">
                  {formatSize(testText.length)}
                </AppText>
              </View>
              {testText.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setTestText('');
                    setSelectedSize(null);
                    setPastePreview('');
                  }}
                  className="flex-row items-center gap-1"
                >
                  <Trash2 size={11} color="#ef4444" />
                  <AppText className="text-xs text-red-500 font-semibold">Clear</AppText>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Copy / Paste buttons ── */}
          <AppText className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
            2 · Run transfer
          </AppText>

          <Animated.View
            style={{ opacity: flashAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }) }}
            className="mb-5 flex-row gap-3"
          >
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isCopying || isPasting}
              onPress={handleCopy}
              className={`flex-1 flex-row items-center justify-center rounded-2xl py-4 gap-2 shadow-sm ${
                isCopying ? 'bg-cyan-200 dark:bg-cyan-900' : 'bg-cyan-500 dark:bg-cyan-600'
              }`}
            >
              {isCopying ? (
                <ActivityIndicator color="#06b6d4" size="small" />
              ) : (
                <Copy size={15} color="white" />
              )}
              <AppText className="font-semibold text-white text-sm">
                {isCopying ? 'Copying…' : copySuccess ? 'Copied ✓' : 'Copy'}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isCopying || isPasting}
              onPress={handlePaste}
              className={`flex-1 flex-row items-center justify-center rounded-2xl py-4 gap-2 border shadow-sm ${
                isPasting
                  ? 'bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                  : 'bg-white border-cyan-500 dark:bg-gray-800 dark:border-cyan-600'
              }`}
            >
              {isPasting ? (
                <ActivityIndicator color="#06b6d4" size="small" />
              ) : (
                <Clipboard size={15} color="#06b6d4" />
              )}
              <AppText className="font-semibold text-cyan-500 dark:text-cyan-400 text-sm">
                {isPasting ? 'Pasting…' : 'Paste'}
              </AppText>
            </TouchableOpacity>
          </Animated.View>

          {/* ── Metrics panel ── */}
          {metrics && (
            <View className="mb-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-800 shadow-sm">
              <View className="flex-row items-center gap-2 mb-3">
                <Zap size={15} color="#eab308" />
                <AppText className="text-sm font-bold text-gray-900 dark:text-white">
                  Last operation
                </AppText>
              </View>

              <MetricRow label="Duration" value={formatTime(metrics.duration)} />
              <MetricRow
                label="Throughput"
                value={
                  metrics.duration && metrics.textSize
                    ? `${((metrics.textSize / 1024 / metrics.duration) * 1000).toFixed(1)} KB/s`
                    : '—'
                }
                accent
              />
              <MetricRow label="Payload size" value={formatSize(metrics.textSize)} />
              <MetricRow label="Haptic feedback" value="Triggered" last />
            </View>
          )}

          {/* ── Paste preview ── */}
          <View className="mb-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-800 shadow-sm">
            <View className="flex-row items-center gap-2 mb-3">
              <FileText size={15} color="#6b7280" />
              <AppText className="text-sm font-bold text-gray-900 dark:text-white">
                Paste preview
              </AppText>
            </View>
            <TextInput
              multiline
              editable={false}
              value={pastePreview}
              placeholder="Pasted content will appear here after you tap Paste…"
              placeholderTextColor="#9CA3AF"
              style={{ minHeight: 120 }}
              className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
            />
          </View>

          {/* ── Caution notice ── */}
          <View className="flex-row items-start gap-2.5 rounded-xl bg-orange-50 p-4 dark:bg-orange-950/20">
            <ShieldAlert size={15} color="#f97316" style={{ marginTop: 1 }} />
            <View className="flex-1">
              <AppText className="text-xs font-semibold text-orange-800 dark:text-orange-300">
                Bridge size limit
              </AppText>
              <AppText className="text-[11px] leading-4 text-orange-700 dark:text-orange-400 mt-0.5">
                Payloads above 2 MB may trigger React Native IPC warnings.
                Start with 100 KB and scale up to observe how async scheduling
                keeps your UI responsive.
              </AppText>
            </View>
          </View>
        </ScrollView>
      ) : (
        /* ── History tab ── */
        <ScrollView
          className="flex-1 px-4 py-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {benchmarkHistory.length === 0 ? (
            <View className="flex-1 items-center justify-center py-24 gap-3">
              <BarChart2 size={40} color="#d1d5db" />
              <AppText className="text-sm text-gray-400 dark:text-gray-500 text-center">
                No benchmarks yet.{'\n'}Run a copy or paste to record results.
              </AppText>
            </View>
          ) : (
            <>
              {/* Summary stats */}
              <View className="mb-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-800 shadow-sm">
                <AppText className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
                  Session summary
                </AppText>
                <MetricRow
                  label="Runs recorded"
                  value={String(benchmarkHistory.length)}
                />
                <MetricRow
                  label="Success rate"
                  value={`${Math.round(
                    (benchmarkHistory.filter((e) => e.success).length /
                      benchmarkHistory.length) *
                      100
                  )}%`}
                  accent
                />
                <MetricRow
                  label="Avg throughput"
                  value={
                    avgThroughput !== null
                      ? avgThroughput >= 1000
                        ? `${(avgThroughput / 1000).toFixed(2)} MB/s`
                        : `${avgThroughput.toFixed(0)} KB/s`
                      : '—'
                  }
                />
                <MetricRow
                  label="Fastest run"
                  value={`${Math.min(...benchmarkHistory.map((e) => e.durationMs)).toFixed(1)} ms`}
                  last
                />
              </View>

              {/* Log */}
              <View className="rounded-2xl border border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-800 shadow-sm">
                <View className="flex-row items-center justify-between py-3.5 border-b border-gray-100 dark:border-gray-700">
                  <AppText className="text-sm font-bold text-gray-900 dark:text-white">
                    Run log
                  </AppText>
                  <TouchableOpacity onPress={() => setBenchmarkHistory([])}>
                    <AppText className="text-xs text-red-400 font-semibold">Clear all</AppText>
                  </TouchableOpacity>
                </View>
                {benchmarkHistory.map((entry) => (
                  <BenchmarkRow key={entry.id} entry={entry} />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}