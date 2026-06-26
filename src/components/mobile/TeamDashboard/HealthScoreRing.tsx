/**
 * HealthScoreRing — SVG ring showing the composite app-health score.
 * Renders null on non-SVG environments (web without SVG support).
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { AppText as Text } from '../../common/AppText';

interface HealthScoreRingProps {
  score: number; // 0–100
  status: 'healthy' | 'warning' | 'critical';
  isDark?: boolean;
  size?: number;
}

const STATUS_COLOUR: Record<string, string> = {
  healthy: '#16a34a',
  warning: '#d97706',
  critical: '#dc2626',
};

const STATUS_LABEL: Record<string, string> = {
  healthy: 'Healthy',
  warning: 'Degraded',
  critical: 'Critical',
};

export const HealthScoreRing: React.FC<HealthScoreRingProps> = ({
  score,
  status,
  isDark = false,
  size = 120,
}) => {
  const colour = STATUS_COLOUR[status] ?? '#475569';
  const trackColour = isDark ? '#334155' : '#e2e8f0';
  const labelColour = isDark ? '#94a3b8' : '#64748b';
  const textColour = isDark ? '#f1f5f9' : '#1e293b';

  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(score, 100));
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={styles.container} accessibilityLabel={`App health: ${score} out of 100, ${STATUS_LABEL[status]}`}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Track */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={trackColour}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc — starts at the top (rotate -90°) */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={colour}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          originX={cx}
          originY={cy}
        />
        {/* Score label */}
        <SvgText
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fill={textColour}
          fontSize="22"
          fontWeight="700"
        >
          {score}
        </SvgText>
        <SvgText
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fill={labelColour}
          fontSize="11"
        >
          / 100
        </SvgText>
      </Svg>
      <Text style={[styles.statusLabel, { color: colour }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 6,
  },
  svg: {},
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default HealthScoreRing;
