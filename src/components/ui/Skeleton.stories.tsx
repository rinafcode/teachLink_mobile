import React from 'react';
import { View } from 'react-native';

import { Skeleton, SkeletonGroup } from './Skeleton';

import type { Meta, StoryObj } from '@storybook/react-native';

const SkeletonMeta: Meta<typeof Skeleton> = {
  title: 'Components/UI/Skeleton',
  component: Skeleton,
  decorators: [
    (Story) => (
      <View style={{ padding: 16, flex: 1, justifyContent: 'center' }}>
        <Story />
      </View>
    ),
  ],
};

export default SkeletonMeta;

type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
  args: {
    width: 200,
    height: 20,
  },
};

export const Circle: Story = {
  args: {
    width: 60,
    height: 60,
    circle: true,
  },
};

export const CustomBorderRadius: Story = {
  args: {
    width: 150,
    height: 100,
    borderRadius: 20,
  },
};

export const ComplexGroup: Story = {
  render: () => (
    <SkeletonGroup style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Skeleton width={50} height={50} circle />
        <SkeletonGroup style={{ gap: 8 }}>
          <Skeleton width={150} height={15} />
          <Skeleton width={100} height={15} />
        </SkeletonGroup>
      </View>
      <Skeleton width="100%" height={100} />
      <Skeleton width="100%" height={20} />
      <Skeleton width="80%" height={20} />
    </SkeletonGroup>
  ),
};
