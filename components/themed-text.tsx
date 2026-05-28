import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { useDynamicFontSize } from '@/src/hooks';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const { scale } = useDynamicFontSize();

  const getVariantStyle = () => {
    switch (type) {
      case 'title':
        return styles.title;
      case 'subtitle':
        return styles.subtitle;
      case 'defaultSemiBold':
        return styles.defaultSemiBold;
      case 'link':
        return styles.link;
      default:
        return styles.default;
    }
  };

  const variantStyle = getVariantStyle();
  const scaledStyle = {
    ...variantStyle,
    fontSize: scale(variantStyle.fontSize || 16),
    lineHeight: variantStyle.lineHeight ? scale(variantStyle.lineHeight) : undefined,
  };

  return <Text style={[{ color }, scaledStyle, style]} allowFontScaling={false} {...rest} />;
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
  },
});
