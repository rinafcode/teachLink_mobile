import React from 'react';
import { View } from 'react-native';

import { AppText } from './AppText';

import type { Meta, StoryObj } from '@storybook/react-native';

const AppTextMeta: Meta<typeof AppText> = {
  title: 'Components/Common/AppText',
  component: AppText,
  decorators: [
    (Story) => (
      <View style={{ padding: 16, flex: 1, justifyContent: 'center' }}>
        <Story />
      </View>
    ),
  ],
};

export default AppTextMeta;

type Story = StoryObj<typeof AppText>;

export const Default: Story = {
  args: {
    children: 'This is default AppText',
    style: { fontSize: 16 },
  },
};

export const Large: Story = {
  args: {
    children: 'This is large AppText',
    style: { fontSize: 24, fontWeight: 'bold' },
  },
};

export const CustomColor: Story = {
  args: {
    children: 'This is colored AppText',
    style: { fontSize: 18, color: '#20afe7' },
  },
};

export const Fixed: Story = {
  args: {
    children: 'This text size is fixed (ignores dynamic scaling)',
    fixed: true,
    style: { fontSize: 16 },
  },
};
